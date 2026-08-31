#!/usr/bin/env node
/**
 * Migrace aktualit z WordPressu do `src/content/article/cs/`.
 *
 * Skript je opakovatelný: pouští se znovu, dokud redakce publikuje ve starém
 * webu. Slug se zachovává ze starého webu, aby po přechodu platily odkazy
 * a nespadly pozice ve vyhledávačích.
 *
 * Použití:
 *   node scripts/migrate-articles.mjs            # všechno
 *   node scripts/migrate-articles.mjs --limit 10 # rychlá zkouška
 *   node scripts/migrate-articles.mjs --no-media # bez stahování obrázků
 */
import { load } from 'cheerio';
import TurndownService from 'turndown';
import {
	fetchAll,
	downloadMedia,
	writeFileEnsured,
	decodeEntities,
	rewritePostLinks,
	deobfuscateEmails,
	normalizeLists,
	localizeDocuments,
	yamlBlock,
	yamlString,
} from './lib/wp.mjs';

const args = process.argv.slice(2);
const limit = Number(args[args.indexOf('--limit') + 1]) || Infinity;
const withMedia = !args.includes('--no-media');

const OUT_DIR = 'src/content/article/cs';
const MEDIA_DIR = '/media/aktuality';

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-',
	emDelimiter: '_',
});

// Prázdné odstavce z Gutenbergu jen nafukují výsledný Markdown.
turndown.addRule('dropEmptyParagraphs', {
	filter: (node) => node.nodeName === 'P' && !node.textContent.trim() && !node.querySelector('img'),
	replacement: () => '',
});

// <figure> s obrázkem se vykreslí jako obrázek plus popisek pod ním.
turndown.addRule('figure', {
	filter: 'figure',
	replacement: (_content, node) => {
		const image = node.querySelector('img');
		if (!image) return _content;
		const src = image.getAttribute('src') ?? '';
		const alt = image.getAttribute('alt') ?? '';
		const caption = node.querySelector('figcaption')?.textContent?.trim();
		return `\n\n![${alt}](${src})${caption ? `\n\n_${caption}_` : ''}\n\n`;
	},
});

/** `2023/08/foto.jpg` z celé WP URL — zachová členění po letech. */
const mediaPathFromUrl = (url) => {
	const match = url.match(/\/wp-content\/uploads\/(?:.*\/)?(\d{4}\/\d{2}\/[^/?#]+)/);
	if (match) return `${MEDIA_DIR}/${match[1]}`;
	const name = url.split('/').pop()?.split('?')[0];
	return name ? `${MEDIA_DIR}/ostatni/${name}` : null;
};

/** WP servíruje varianty `foto-1024x683.jpg`; chceme originál. */
const stripSizeSuffix = (url) => url.replace(/-\d{2,4}x\d{2,4}(\.[a-z]{3,4})$/i, '$1');

/**
 * Stáhne obrázek a vrátí lokální cestu. WordPress nemá originál vždycky —
 * někdy existuje jen zmenšená varianta — takže se zkouší obojí. Když
 * neprojde nic, obrázek zůstane na původní adrese: rozbitý odkaz na vlastní
 * web je horší než odkaz na starý WordPress.
 */
async function localizeImage(src) {
	const candidates = [stripSizeSuffix(src), src].filter(
		(url, index, all) => all.indexOf(url) === index,
	);

	for (const candidate of candidates) {
		const localPath = mediaPathFromUrl(candidate);
		if (!localPath) continue;
		if (!withMedia) return { path: localPath, ok: true };
		if (await downloadMedia(candidate, localPath)) return { path: localPath, ok: true };
	}
	return { path: src, ok: false };
}


/**
 * Vyhodí z HTML to, co není obsah. Kromě toho, že skripty a styly v textu
 * nedávají smysl, jejich složené závorky rozbijí parsování MDX, kterým Tina
 * načítá rich-text — celé pole pak spadne do bloku kódu.
 */
function stripNonContent(html) {
	const $ = load(html ?? '', null, false);
	$('script, style, noscript, template, link, meta').remove();
	return $.html();
}

/** V MDX má `{` význam začátku výrazu; v prostém textu ho musíme odescapovat. */
const escapeBraces = (markdown) => markdown.replace(/([{}])/g, '\\$1');

async function localizeImages(html) {
	const $ = load(stripNonContent(deobfuscateEmails(html)), null, false);
	const images = [];

	$('img').each((_, element) => {
		const image = $(element);
		const src = image.attr('src') ?? image.attr('data-src') ?? '';
		if (!src.includes('/wp-content/uploads/')) return;
		// srcset odkazuje na WP varianty, které nemigrujeme — pryč s ním.
		image.removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('loading');
		images.push({ image, src });
	});

	let failed = 0;
	for (const { image, src } of images) {
		const result = await localizeImage(src);
		image.attr('src', result.path);
		if (!result.ok) failed += 1;
	}

	// Absolutní odkazy na vlastní web převedeme na relativní a staré adresy
	// článků rovnou na nové.
	$('a[href]').each((_, element) => {
		const link = $(element);
		const href = (link.attr('href') ?? '').replace('https://debatovani.cz', '');
		link.attr('href', rewritePostLinks(href));
	});

	return { html: $.html(), failed };
}

function buildFrontmatter({ title, date, perex, cover, coverAlt, author, categories }) {
	const lines = [
		'---',
		`title: ${yamlString(title)}`,
		`date: ${yamlString(date)}`,
	];
	if (perex) lines.push('perex: >-', yamlBlock(perex, 2));
	if (cover) lines.push(`cover: ${cover}`);
	if (coverAlt) lines.push(`coverAlt: ${yamlString(coverAlt)}`);
	if (author) lines.push(`author: ${yamlString(author)}`);
	if (categories.length > 0) {
		lines.push('categories:');
		for (const category of categories) lines.push(`  - ${yamlString(category)}`);
	}
	lines.push('---', '');
	return lines.join('\n');
}

async function main() {
	console.log('Stahuji aktuality z WordPressu…');
	const posts = await fetchAll('posts', { _embed: 'wp:featuredmedia,wp:term,author' });
	console.log(`Nalezeno ${posts.length} článků.`);

	const selected = posts.slice(0, limit);
	let written = 0;
	let mediaFailures = 0;
	const redirects = {};

	for (const [index, post] of selected.entries()) {
		const embedded = post._embedded ?? {};
		const featured = embedded['wp:featuredmedia']?.[0];
		const author = embedded.author?.[0]?.name;
		const categories = (embedded['wp:term'] ?? [])
			.flat()
			.filter((term) => term?.taxonomy === 'category')
			.map((term) => decodeEntities(term.name));

		let cover = null;
		if (featured?.source_url) {
			const result = await localizeImage(featured.source_url);
			cover = result.path;
			if (!result.ok) mediaFailures += 1;
		}

		const { html, failed } = await localizeImages(post.content?.rendered ?? '');
		mediaFailures += failed;

		const converted = normalizeLists(
			escapeBraces(turndown.turndown(html))
				// Turndown escapuje tečku za číslicí, aby z „30. 8.“ nevznikl
				// číslovaný seznam. Uprostřed řádku to hrozit nemůže, tak to
				// vrátíme zpět — jinak je text plný `30\.`.
				.replace(/(?<!^[ \t]*)(\d)\\\./gm, '$1.')
				.replace(/\n{3,}/g, '\n\n')
				.trim(),
		);

		// Odkazované dokumenty (metodiky, výnosy, zápisy) stahujeme také —
		// po vypnutí WordPressu by odkazy na `wp-content` přestaly fungovat.
		const localized = await localizeDocuments(converted);
		mediaFailures += localized.failed;
		const body = localized.markdown;

		const perex = decodeEntities(post.excerpt?.rendered ?? '')
			.replace(/<[^>]+>/g, '')
			.replace(/\s+/g, ' ')
			// WP excerpt je automaticky zkrácený začátek článku a končí „[…]“.
			.replace(/\s*\[\s*…\s*\]\s*$/, '')
			.replace(/\s*…\s*$/, '…')
			.trim();

		const frontmatter = buildFrontmatter({
			title: decodeEntities(post.title?.rendered ?? ''),
			date: post.date_gmt ? `${post.date_gmt}Z` : post.date,
			perex,
			cover,
			coverAlt: featured?.alt_text ? decodeEntities(featured.alt_text) : null,
			author,
			categories,
		});

		await writeFileEnsured(`${OUT_DIR}/${post.slug}.mdx`, `${frontmatter}${body}\n`);
		written += 1;

		// Staré URL musí dál fungovat, jinak se ztratí pozice ve vyhledávačích
		// i odkazy z cizích webů (docs/02, sekce 3).
		const oldPath = new URL(post.link).pathname;
		const newPath = `/aktuality/${post.slug}/`;
		if (oldPath !== newPath) redirects[oldPath] = newPath;

		if ((index + 1) % 25 === 0) console.log(`  … ${index + 1}/${selected.length}`);
	}

	await writeFileEnsured('src/data/redirects.json', `${JSON.stringify(redirects, null, '\t')}\n`);

	console.log(`Hotovo: ${written} článků zapsáno do ${OUT_DIR}.`);
	console.log(`Přesměrování starých URL: ${Object.keys(redirects).length} → src/data/redirects.json`);
	if (mediaFailures > 0) console.warn(`Pozor: ${mediaFailures} obrázků se nepodařilo stáhnout.`);
}

await main();
