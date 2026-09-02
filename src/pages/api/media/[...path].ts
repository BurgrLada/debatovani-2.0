/**
 * Knihovna médií pro administraci.
 *
 * Self-hosted TinaCMS media handler nedodává (`@tinacms/datalayer` ho nemá),
 * takže si ho projekt veze sám. Druhá půlka je `tina/media-store.ts`, která
 * tyhle routy volá z prohlížeče; logika kolem souborů je v `src/lib/media.ts`.
 *
 * Routy:
 *   GET    /api/media/list?directory=…   výpis adresáře
 *   GET    /api/media/raw?path=…         obsah souboru (náhled v administraci)
 *   POST   /api/media/upload             nahrání (multipart, pole `file`)
 *   DELETE /api/media/delete?path=…      smazání
 *
 * Všechny jsou za přihlášením. `raw` je tam schválně taky: veřejný web čte
 * média jako statické soubory z `/media/…`, tahle routa je jen proto, aby
 * **čerstvě nahraný soubor šel v administraci vidět hned** — do `dist/` se
 * dostane až dalším buildem, stejně jako obsah.
 */
import type { APIRoute } from 'astro';
import { authorizeEditor } from '../../../lib/auth';
import { runAsEditor, type Editor } from '../../../lib/editor';
import {
	contentTypeFor,
	listMedia,
	publicMediaUrl,
	readMedia,
	removeMedia,
	safeMediaPath,
	writeMedia,
} from '../../../lib/media';

export const prerender = false;

/**
 * V lokálním režimu se nepřihlašuje (`pnpm dev` nemá OAuth ani relace), takže
 * by kontrola zamkla knihovnu médií sama sobě. Je to stejné rozdělení, jaké
 * dělá Tina API přes `LocalBackendAuthProvider` — jen tady ručně.
 */
const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

/** Název souboru bez diakritiky a mezer — ať je URL čitelná a bez escapování. */
function slugifyFilename(name: string): string {
	const dot = name.lastIndexOf('.');
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';

	const slug =
		base
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'soubor';

	return ext ? `${slug}.${ext}` : slug;
}

export const ALL: APIRoute = async ({ request, params, url }) => {
	let editor: Editor | undefined;

	if (!isLocal) {
		const auth = await authorizeEditor(request.headers);

		if (!auth.ok) {
			return json({ error: auth.message }, auth.status);
		}

		editor = auth.editor;
	}

	const action = params.path ?? '';

	// Podpis redaktora se veze kontextem až do zprávy commitu.
	const withEditor = <T>(fn: () => Promise<T>) =>
		editor ? runAsEditor(editor, fn) : fn();

	try {
		if (request.method === 'GET' && action === 'list') {
			const directory = safeMediaPath(url.searchParams.get('directory'));
			const entries = await listMedia(directory);

			return json({
				items: entries.map((entry) => ({
					type: entry.type,
					id: entry.path,
					filename: entry.filename,
					directory: entry.directory,
					size: entry.size,
					// Náhled jde přes API, veřejná adresa přes statický soubor.
					src: `/api/media/raw?path=${encodeURIComponent(entry.path)}`,
					publicSrc: publicMediaUrl(entry.path),
				})),
			});
		}

		if (request.method === 'GET' && action === 'raw') {
			const path = safeMediaPath(url.searchParams.get('path'));

			if (!path) {
				return json({ error: 'Chybí parametr path.' }, 400);
			}

			const bytes = await readMedia(path);

			return new Response(bytes, {
				headers: {
					'content-type': contentTypeFor(path),
					// Jen do prohlížeče redaktora, nikdy do sdílené cache —
					// odpověď je za přihlášením.
					'cache-control': 'private, max-age=300',
				},
			});
		}

		if (request.method === 'POST' && action === 'upload') {
			const form = await request.formData();
			const file = form.get('file');
			const directory = safeMediaPath(String(form.get('directory') ?? ''));

			if (!(file instanceof File)) {
				return json({ error: 'Chybí soubor.' }, 400);
			}

			const filename = slugifyFilename(file.name);
			const path = directory ? `${directory}/${filename}` : filename;

			const bytes = new Uint8Array(await file.arrayBuffer());
			await withEditor(() => writeMedia(path, bytes));

			return json({
				type: 'file',
				id: path,
				filename,
				directory,
				src: `/api/media/raw?path=${encodeURIComponent(path)}`,
				publicSrc: publicMediaUrl(path),
			});
		}

		if (request.method === 'DELETE' && action === 'delete') {
			const path = safeMediaPath(url.searchParams.get('path'));

			if (!path) {
				return json({ error: 'Chybí parametr path.' }, 400);
			}

			await withEditor(() => removeMedia(path));

			return json({ ok: true });
		}
	} catch (error) {
		console.error('[media]', error);

		return json({ error: error instanceof Error ? error.message : 'Neznámá chyba.' }, 500);
	}

	return json({ error: `Neznámá operace: ${request.method} ${action}` }, 404);
};
