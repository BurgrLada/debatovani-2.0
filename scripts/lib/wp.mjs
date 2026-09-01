/**
 * Sdílené kousky migrace z WordPressu.
 *
 * Migrace je záměrně **opakovatelná** — redakce publikuje dál, dokud se web
 * nepřepne, takže se skripty budou pouštět znovu těsně před spuštěním
 * (docs/02, sekce 3). Proto se všude jen přepisuje podle `id`/slugu a nikdy
 * negenerují nová náhodná jména.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';

export const WP_BASE = 'https://debatovani.cz';

export const exists = (path) =>
	access(path).then(
		() => true,
		() => false,
	);

export async function writeFileEnsured(path, contents) {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, contents);
}

/** Projde stránkovaný WP REST endpoint a vrátí všechny položky. */
export async function fetchAll(endpoint, params = {}) {
	const items = [];
	for (let page = 1; ; page += 1) {
		const url = new URL(`${WP_BASE}/wp-json/wp/v2/${endpoint}`);
		url.searchParams.set('per_page', '100');
		url.searchParams.set('page', String(page));
		for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

		const response = await fetch(url, { headers: { Accept: 'application/json' } });
		// Za poslední stranou vrací WP 400, ne prázdné pole.
		if (response.status === 400) break;
		if (!response.ok) throw new Error(`${endpoint} strana ${page}: HTTP ${response.status}`);

		const batch = await response.json();
		if (!Array.isArray(batch) || batch.length === 0) break;
		items.push(...batch);

		const totalPages = Number(response.headers.get('x-wp-totalpages') ?? '1');
		if (page >= totalPages) break;
	}
	return items;
}

/**
 * Stáhne soubor z WordPressu do `public/`, pokud tam ještě není.
 * Vrací cestu použitelnou v obsahu (`/media/…`), nebo null když to selže.
 */
export async function downloadMedia(remoteUrl, localPath, { force = false } = {}) {
	// Cesta se normalizuje na NFC na jednom místě, protože stejnou podobu musí
	// mít soubor na disku i odkaz v obsahu — jinak build hlásí chybějící obrázek.
	const path = localPath.normalize('NFC');
	const publicPath = `public${path}`;
	if (!force && (await exists(publicPath))) return path;

	try {
		// Část souborů má v názvu diakritiku. WP REST je vrací v rozloženém
		// Unicode (NFD), zatímco server je servíruje pod složenou podobou
		// (NFC) — bez normalizace by percent-encoding ukázal jinam a vrátil
		// se 404.
		const response = await fetch(encodeURI(remoteUrl.normalize('NFC')), {
			signal: AbortSignal.timeout(30_000),
		});
		if (!response.ok) return null;
		await writeFileEnsured(publicPath, Buffer.from(await response.arrayBuffer()));
		return path;
	} catch {
		return null;
	}
}

/** Odstraní diakritiku a udělá z textu URL slug. */
export const slugify = (value) =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

/** Odsazení víceřádkového textu pro YAML blok `|`. */
export const yamlBlock = (value, indent) => {
	const pad = ' '.repeat(indent);
	return String(value ?? '')
		.split('\n')
		.map((line) => (line.trim() ? pad + line : ''))
		.join('\n')
		.replace(/\s+$/, '');
};

/** Uvozovkování jednořádkové YAML hodnoty. */
export const yamlString = (value) => {
	const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
	return `'${text.replace(/'/g, "''")}'`;
};

export const decodeEntities = (value) =>
	String(value ?? '')
		.replace(/&#8217;|&#x2019;/g, '’')
		.replace(/&#8211;/g, '–')
		.replace(/&#8212;/g, '—')
		.replace(/&#8220;/g, '„')
		.replace(/&#8221;/g, '“')
		.replace(/&#8230;|&hellip;/g, '…')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&#x27;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&amp;/g, '&');

/**
 * Staré URL článků mají tvar `/2026/08/21/slug/`, nové `/aktuality/slug/`.
 * Odkazy uvnitř obsahu se přepisují rovnou, aby po přechodu nevedly přes
 * přesměrování; samotná přesměrování se generují zvlášť (viz `redirects.json`).
 */
export const POST_URL_PATTERN = /(?:https?:\/\/(?:www\.)?debatovani\.cz)?\/(?:19|20)\d{2}\/\d{2}\/\d{2}\/([a-z0-9-]+)\/?/g;

export const rewritePostLinks = (text) =>
	String(text ?? '').replace(POST_URL_PATTERN, (_match, slug) => `/aktuality/${slug}/`);

/**
 * Cloudflare obfuskuje e-mailové adresy na `/cdn-cgi/l/email-protection#<hex>`
 * a rozbaluje je až svým skriptem. Na novém webu ten skript neběží, takže by
 * odkazy vedly nikam — dekódujeme je zpátky na `mailto:`.
 *
 * Formát: první bajt je klíč, každý další se s ním XORuje.
 */
export function decodeCloudflareEmail(hex) {
	if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4 || hex.length % 2 !== 0) return null;
	const key = Number.parseInt(hex.slice(0, 2), 16);
	let email = '';
	for (let i = 2; i < hex.length; i += 2) {
		email += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
	}
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Nahradí všechny obfuskované odkazy i vložené `<span data-cfemail>`. */
export function deobfuscateEmails(html) {
	return String(html ?? '')
		.replace(/(?:https?:\/\/[^"'\s]*)?\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi, (match, hex) => {
			const email = decodeCloudflareEmail(hex);
			return email ? `mailto:${email}` : match;
		})
		.replace(/<span[^>]*class="__cf_email__"[^>]*data-cfemail="([0-9a-f]+)"[^>]*>.*?<\/span>/gi, (match, hex) => {
			const email = decodeCloudflareEmail(hex);
			return email ?? match;
		})
		.replace(/\[email&#160;protected\]|\[email protected\]/gi, '');
}

/**
 * Turndown píše odrážky jako `-   text` a vnořené úrovně odsazuje po čtyřech
 * mezerách. MDX, kterým Tina načítá rich-text, ale čtyři mezery na začátku
 * řádku čte jako blok kódu — celý text pak skončí v `<pre>`. Převedeme
 * odrážky na `- ` a vnoření na dvě mezery.
 */
export function normalizeLists(markdown) {
	return String(markdown ?? '')
		.split('\n')
		.map((line) => {
			const match = line.match(/^( *)([-*+]|\d+\.)( +)(.*)$/);
			if (!match) return line;
			const [, indent, marker, , rest] = match;
			const level = Math.floor(indent.length / 4);
			return `${'  '.repeat(level)}${marker} ${rest}`;
		})
		.join('\n');
}

/**
 * Odkazy na soubory ve `wp-content/uploads` (metodiky, soutěžní dokumenty,
 * zápisy) by po vypnutí WordPressu přestaly fungovat. Stahujeme je vedle
 * obsahu a odkaz přepisujeme na lokální kopii.
 */
const DOCUMENT_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|csv|zip|jpe?g|png|gif|webp|svg)$/i;

export async function localizeDocuments(markdown, downloadTo = '/media/dokumenty') {
	const links = new Set();
	const pattern = /(?:https?:\/\/(?:www\.)?debatovani\.cz)?\/wp-content\/uploads\/([^)"'\s]+)/g;
	for (const match of String(markdown ?? '').matchAll(pattern)) {
		if (DOCUMENT_EXTENSIONS.test(match[1])) links.add(match[0]);
	}

	let result = String(markdown ?? '');
	let failed = 0;

	for (const link of links) {
		const relative = link.split('/wp-content/uploads/')[1];
		const localPath = `${downloadTo}/${relative}`.normalize('NFC');
		const remote = link.startsWith('http') ? link : `${WP_BASE}${link}`;
		if (await downloadMedia(remote, localPath)) {
			result = result.split(link).join(localPath);
		} else {
			failed += 1;
		}
	}

	return { markdown: result, failed };
}

/**
 * Odhad jazyka textu.
 *
 * WordPress na produkci jazyk nijak neeviduje — není tam Polylang ani WPML
 * a anglické články leží ve stejné rubrice jako české. Rozlišit se dají jen
 * podle textu, a to naštěstí spolehlivě: české články mají 26–84 ‰ znaků
 * s diakritikou, anglické 0–3 ‰. Práh uprostřed té mezery je bezpečný,
 * a druhá podmínka (poměr funkčních slov) chrání krátké texty, kde by
 * samotná diakritika stačit nemusela.
 */
const CZECH_DIACRITICS = /[ěščřžýáíéůúňťďóĚŠČŘŽÝÁÍÉŮÚŇŤĎÓ]/g;
const ENGLISH_WORDS = /\b(the|and|of|will|was|were|their|which|about|with|for)\b/gi;
const CZECH_WORDS = /\b(a|se|na|v|je|pro|že|které|byl|do|si|nebo)\b/g;

export function detectLang(text) {
	if (text.length < 200) return 'cs';

	const diacritics = (text.match(CZECH_DIACRITICS) ?? []).length / text.length;
	const english = (text.match(ENGLISH_WORDS) ?? []).length;
	const czech = (text.match(CZECH_WORDS) ?? []).length;

	return diacritics < 0.01 && english > czech ? 'en' : 'cs';
}
