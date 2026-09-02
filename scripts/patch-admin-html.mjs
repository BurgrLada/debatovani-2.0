/**
 * Přebarvení hlavičky administrace na značku asociace.
 *
 * `public/admin/index.html` generuje `tinacms build`/`tinacms dev` a Tina do
 * něj dává svůj titulek („TinaCMS“) a svoje lamí logo. Konfigurací se to
 * nastavit nedá — v `defineConfig` na to není pole a soubor se navíc při
 * každém buildu přepíše, takže ruční úprava by nevydržela. Proto se hlavička
 * po vygenerování přepíše tímhle skriptem; v `package.json` běží mezi
 * `tinacms build` a `astro build` (`-c "node scripts/… && astro build"`),
 * tedy dřív, než Astro obsah `public/` zkopíruje do `dist/client`.
 *
 * Titulek je schválně fixní. Tina uvnitř administrace `document.title`
 * nepřepisuje, takže záložka zůstane takhle pojmenovaná po celou dobu editace.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../public/admin/index.html', import.meta.url);
const TITLE = 'Administrace – Asociace debatních klubů';

/** Značka, aby opakované spuštění nenaskládalo ikony podruhé. */
const MARK = '<!-- branding: patch-admin-html.mjs -->';

const ICONS = `${MARK}
    <link rel="icon" href="/media/brand/favicon-32.png" sizes="32x32" />
    <link rel="icon" href="/media/brand/favicon-192.png" sizes="192x192" />
    <link rel="apple-touch-icon" href="/media/brand/favicon-192.png" />`;

let html;
try {
	html = await readFile(FILE, 'utf8');
} catch (e) {
	if (e.code === 'ENOENT') {
		// Administrace se ještě negenerovala. Není důvod kvůli tomu shodit build
		// webu — jen ať je v logu vidět, proč zůstala Tinina hlavička.
		console.warn('[admin] public/admin/index.html neexistuje, hlavička se nepřepisuje.');
		process.exit(0);
	}
	throw e;
}

if (html.includes(MARK)) {
	process.exit(0);
}

const before = html;

html = html
	.replace(/<html lang="en">/, '<html lang="cs">')
	.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
	.replace(/<link rel="icon"[^>]*>/, ICONS);

if (html === before) {
	// Tina si přestavěla hlavičku jinak, než tenhle skript čeká. Radši spadnout
	// než tiše nasadit administraci s cizím logem.
	console.error('[admin] V public/admin/index.html se nenašlo, co přepsat — zkontrolujte skript po aktualizaci Tiny.');
	process.exit(1);
}

await writeFile(FILE, html);
console.log(`[admin] Hlavička administrace přepsána na „${TITLE}“.`);
