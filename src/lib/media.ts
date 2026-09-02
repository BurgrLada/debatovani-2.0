/**
 * Knihovna médií — čtení a zápis souborů v `public/media`.
 *
 * Média zůstávají **v gitu vedle obsahu**, ne v cizím úložišti. Zvažovaly se
 * i Cloudflare R2 a MinIO ([docs/06](../../docs/06-doporucena-architektura.md),
 * otázka 2); rozhodlo to, že git má médiá replikovaná v každém klonu a nikdo
 * je nemusí zálohovat zvlášť. Cenou je velikost repozitáře.
 *
 * Self-hosted TinaCMS knihovnu médií **sám nedodává** — `@tinacms/datalayer`
 * žádný media handler nemá, administrace proto hlásí „Repo-based media isn't
 * available when self-hosting“. Tenhle modul je ta chybějící půlka; druhá je
 * `tina/media-store.ts`, která z prohlížeče volá `/api/media/*`.
 *
 * Zápis jde stejnou cestou jako obsah: v lokálním režimu do pracovní kopie,
 * jinak přes GitHub API pod servisním účtem (`tina/database.ts`).
 */
import './env';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { commitMessage } from './editor';
import { invalidateRenderCache } from './render-cache';

/** Kořen médií pod `public/`. Musí sedět s `mediaRoot` v `tina/config.ts`. */
export const MEDIA_ROOT = 'media';

/** Kde kořen leží v repozitáři. Do gitu se commituje pod touhle cestou. */
const REPO_PREFIX = `public/${MEDIA_ROOT}`;

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

export type MediaEntry = {
	type: 'file' | 'dir';
	/** Cesta od kořene médií, bez lomítka na začátku: `aktuality/foto.webp`. */
	path: string;
	filename: string;
	/** Adresář, ve kterém položka leží. Prázdný řetězec je kořen. */
	directory: string;
	size?: number;
};

/**
 * Cesty chodí z prohlížeče, takže se jim nevěří ani od přihlášeného redaktora.
 * Propustí se jen to, co se dá bezpečně připojit ke kořeni médií — žádné
 * `..`, žádný absolutní začátek, žádné zpětné lomítko.
 */
export function safeMediaPath(input: string | null | undefined): string {
	const path = (input ?? '').replace(/^\/+/, '').replace(/\/+$/, '');

	if (!path) {
		return '';
	}

	if (path.includes('\\') || path.split('/').some((part) => part === '..' || part === '.')) {
		throw new Error(`Nepřípustná cesta v knihovně médií: ${input}`);
	}

	return path;
}

/** Veřejná adresa souboru — to, co se ukládá do obsahu. */
export function publicMediaUrl(path: string): string {
	return `/${MEDIA_ROOT}/${path}`;
}

const CONTENT_TYPES: Record<string, string> = {
	avif: 'image/avif',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	pdf: 'application/pdf',
	png: 'image/png',
	svg: 'image/svg+xml',
	webp: 'image/webp',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function contentTypeFor(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';

	return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/* ---------- Lokální režim: pracovní kopie ---------- */

const localPath = (path: string) => join('public', MEDIA_ROOT, path);

async function listLocal(directory: string): Promise<MediaEntry[]> {
	let entries;

	try {
		entries = await readdir(localPath(directory), { withFileTypes: true });
	} catch {
		// Adresář nemusí existovat — prázdná knihovna není chyba.
		return [];
	}

	const out: MediaEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		const path = directory ? `${directory}/${entry.name}` : entry.name;

		out.push({
			type: entry.isDirectory() ? 'dir' : 'file',
			path,
			filename: entry.name,
			directory,
			size: entry.isDirectory() ? undefined : (await stat(localPath(path))).size,
		});
	}

	return out;
}

/* ---------- Self-hosted režim: GitHub API ---------- */

function githubConfig() {
	const owner = process.env.GITHUB_OWNER;
	const repo = process.env.GITHUB_REPO;
	const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
	const branch =
		process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main';

	if (!owner || !repo || !token) {
		throw new Error(
			'Knihovna médií potřebuje GITHUB_OWNER, GITHUB_REPO a GITHUB_PERSONAL_ACCESS_TOKEN — ' +
				'média se ukládají do repozitáře stejnou cestou jako obsah.',
		);
	}

	return { owner, repo, token, branch };
}

/**
 * Volání GitHub REST API přes `fetch`.
 *
 * Octokit se nepoužívá schválně: je v projektu jen jako tranzitivní závislost
 * `tinacms-gitprovider-github` a kvůli třem koncovým bodům nemá smysl si ho
 * tahat napřímo.
 */
async function github(path: string, init: RequestInit = {}): Promise<Response> {
	const { token } = githubConfig();

	return fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${token}`,
			'x-github-api-version': '2022-11-28',
			'user-agent': 'debatovani-cz-media',
			...(init.body ? { 'content-type': 'application/json' } : {}),
			...init.headers,
		},
	});
}

type GithubContent = { type: string; name: string; path: string; size: number; sha: string };

function contentsUrl(path: string): string {
	const { owner, repo, branch } = githubConfig();
	const full = path ? `${REPO_PREFIX}/${path}` : REPO_PREFIX;

	return `/repos/${owner}/${repo}/contents/${full}?ref=${encodeURIComponent(branch)}`;
}

async function listGithub(directory: string): Promise<MediaEntry[]> {
	const response = await github(contentsUrl(directory));

	if (response.status === 404) {
		return [];
	}

	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} při výpisu médií: ${await response.text()}`);
	}

	const body = (await response.json()) as GithubContent[];

	// Jeden soubor místo adresáře vrátí objekt, ne pole.
	if (!Array.isArray(body)) {
		return [];
	}

	return body
		.filter((entry) => !entry.name.startsWith('.'))
		.map((entry) => ({
			type: entry.type === 'dir' ? ('dir' as const) : ('file' as const),
			path: directory ? `${directory}/${entry.name}` : entry.name,
			filename: entry.name,
			directory,
			size: entry.type === 'dir' ? undefined : entry.size,
		}));
}

/** SHA existujícího souboru. GitHub ho vyžaduje při přepsání i při smazání. */
async function githubSha(path: string): Promise<string | undefined> {
	const response = await github(contentsUrl(path));

	if (!response.ok) {
		return undefined;
	}

	const body = (await response.json()) as GithubContent;

	return Array.isArray(body) ? undefined : body.sha;
}

/* ---------- Veřejné rozhraní ---------- */

/**
 * Obsah adresáře, adresáře první a pak podle názvu.
 *
 * Stránkování si dělá volající: obou zdrojů se ptáme na celý adresář, protože
 * ani ten největší (`dokumenty`) nemá tolik položek, aby to vadilo.
 */
export async function listMedia(directory: string): Promise<MediaEntry[]> {
	const entries = isLocal ? await listLocal(directory) : await listGithub(directory);

	return entries.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;

		return a.filename.localeCompare(b.filename, 'cs');
	});
}

/**
 * Obsah souboru jako `ArrayBuffer` — tvar, který bere `Response` i `Buffer`.
 */
export async function readMedia(path: string): Promise<ArrayBuffer> {
	if (isLocal) {
		const buffer = await readFile(localPath(path));

		// `Buffer` sedí ve sdílené paměti, takže `.buffer` je většinou větší než
		// soubor sám. Bez výřezu by se poslalo i cizí okolí.
		return buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		) as ArrayBuffer;
	}

	const { owner, repo, branch } = githubConfig();
	const response = await github(
		`/repos/${owner}/${repo}/contents/${REPO_PREFIX}/${path}?ref=${encodeURIComponent(branch)}`,
		{ headers: { accept: 'application/vnd.github.raw' } },
	);

	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} při čtení ${path}.`);
	}

	return response.arrayBuffer();
}

export async function writeMedia(path: string, bytes: Uint8Array): Promise<void> {
	// Nahraný soubor se může objevit na stránce, která už je v cache —
	// třeba když redaktor vymění logo v nastavení webu.
	invalidateRenderCache(`nahráno ${path}`);

	if (isLocal) {
		await mkdir(dirname(localPath(path)), { recursive: true });
		await writeFile(localPath(path), bytes);

		return;
	}

	const { owner, repo, branch } = githubConfig();
	const sha = await githubSha(path);

	const response = await github(`/repos/${owner}/${repo}/contents/${REPO_PREFIX}/${path}`, {
		method: 'PUT',
		body: JSON.stringify({
			message: commitMessage(`media: nahrání ${path}`),
			content: Buffer.from(bytes).toString('base64'),
			branch,
			...(sha ? { sha } : {}),
		}),
	});

	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} při nahrávání ${path}: ${await response.text()}`);
	}
}

export async function removeMedia(path: string): Promise<void> {
	invalidateRenderCache(`smazáno ${path}`);

	if (isLocal) {
		await rm(localPath(path), { force: true });

		return;
	}

	const { owner, repo, branch } = githubConfig();
	const sha = await githubSha(path);

	if (!sha) {
		// Co neexistuje, není potřeba mazat.
		return;
	}

	const response = await github(`/repos/${owner}/${repo}/contents/${REPO_PREFIX}/${path}`, {
		method: 'DELETE',
		body: JSON.stringify({ message: commitMessage(`media: smazání ${path}`), sha, branch }),
	});

	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} při mazání ${path}: ${await response.text()}`);
	}
}
