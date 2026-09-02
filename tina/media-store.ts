/**
 * Knihovna médií — část běžící v prohlížeči.
 *
 * Self-hosted TinaCMS repozitářová média neumí a hlásí, ať se nastaví externí
 * úložiště (S3, Cloudinary…). Projekt jde jinudy: **média zůstávají v gitu**
 * a tenhle store je do administrace vrací přes vlastní API. Serverová půlka
 * je `src/pages/api/media/[...path].ts`, práce se soubory `src/lib/media.ts`.
 *
 * Rozhodnutí zůstat u gitu je v [docs/06](../docs/06-doporucena-architektura.md),
 * otázka 2: proti R2 a MinIO mluví to, že git má média replikovaná v každém
 * klonu a nikdo je nemusí zálohovat zvlášť.
 */
import type {
	Media,
	MediaList,
	MediaListOptions,
	MediaStore,
	MediaUploadOptions,
} from 'tinacms';

/** Co jde nahrát. Kromě obrázků i dokumenty — 182 z 531 souborů jsou PDF. */
const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xlsx';

type ApiMedia = {
	type: 'file' | 'dir';
	id: string;
	filename: string;
	directory: string;
	size?: number;
	src: string;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		// Relace je v httpOnly cookie, bez tohohle by se neposlala.
		credentials: 'same-origin',
		...init,
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}) as { error?: string });

		throw new Error((body as { error?: string }).error ?? `Knihovna médií vrátila ${response.status}.`);
	}

	return (await response.json()) as T;
}

export class GitMediaStore implements MediaStore {
	accept = ACCEPT;

	/**
	 * Nahrání jde po jednom souboru schválně: každý je vlastní commit přes
	 * GitHub API a paralelní zápisy do jedné větve by si přepisovaly SHA.
	 */
	async persist(files: MediaUploadOptions[]): Promise<Media[]> {
		const uploaded: Media[] = [];

		for (const { file, directory } of files) {
			const form = new FormData();
			form.append('file', file);
			form.append('directory', directory ?? '');

			uploaded.push(await call<ApiMedia>('/api/media/upload', { method: 'POST', body: form }));
		}

		return uploaded;
	}

	async delete(media: Media): Promise<void> {
		await call('/api/media/delete?path=' + encodeURIComponent(media.id), { method: 'DELETE' });
	}

	async list(options?: MediaListOptions): Promise<MediaList> {
		const directory = options?.directory ?? '';
		const { items } = await call<{ items: ApiMedia[] }>(
			'/api/media/list?directory=' + encodeURIComponent(directory),
		);

		const visible = options?.filesOnly ? items.filter((item) => item.type === 'file') : items;

		// Server vrací celý adresář; stránkuje se až tady, protože ani ten
		// největší (`dokumenty`) není tak velký, aby se vyplatilo dělit ho dřív.
		const offset = Number(options?.offset ?? 0);
		const limit = options?.limit ?? visible.length;
		const page = visible.slice(offset, offset + limit);
		const nextOffset = offset + limit < visible.length ? offset + limit : undefined;

		return { items: page, nextOffset };
	}

	/**
	 * Co se uloží do obsahu.
	 *
	 * Ne `media.src` — ta míří na `/api/media/raw`, tedy za přihlášení, a
	 * sloužila jen k tomu, aby čerstvě nahraný soubor byl v administraci vidět
	 * hned. Do obsahu patří **veřejná adresa statického souboru**, kterou po
	 * dalším buildu servíruje nginx z `dist/`.
	 */
	parse(media: Media): string {
		return `/media/${media.id}`;
	}
}
