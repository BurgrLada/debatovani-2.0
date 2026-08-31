/**
 * Čtení stránek postavených v Elementoru.
 *
 * Elementor nevystavuje svá data přes REST (`_elementor_data` je privátní
 * postmeta), takže jediný spolehlivý zdroj je vykreslené HTML plus
 * per-stránkové CSS, které Elementor generuje do
 * `wp-content/uploads/elementor/css/post-<id>.css`. Odtud se dají vytáhnout
 * barvy pozadí sekcí, které v HTML nejsou.
 */
import { load } from 'cheerio';
import { WP_BASE, decodeEntities, deobfuscateEmails } from './wp.mjs';

/** Widgety, jejichž obsah umíme přenést. Ostatní se hlásí v přehledu. */
export const KNOWN_WIDGETS = new Set([
	'heading',
	'text-editor',
	'image',
	'button',
	'divider',
	'spacer',
	'icon-list',
	'be-icon-box',
	'be-counter',
	'be-logo-carousel',
	'accordion',
	'tabs',
	'shortcode',
	'html',
	'google_maps',
	'menu-anchor',
	'video',
	'image-gallery',
	'hotspot',
]);

const text = ($, element) => decodeEntities($(element).text()).replace(/\s+/g, ' ').trim();

/** `foto-1024x683.jpg` → `foto.jpg`; chceme originál, ne WP variantu. */
export const stripSizeSuffix = (url) => url.replace(/-\d{2,4}x\d{2,4}(\.[a-z]{3,4})$/i, '$1');

export const toRelative = (href) =>
	String(href ?? '').replace(/^https?:\/\/(www\.)?debatovani\.cz/, '') || '/';

/** Stáhne per-stránkové Elementor CSS a vytáhne pozadí jednotlivých prvků. */
export async function fetchElementStyles(postId) {
	const styles = new Map();
	try {
		const response = await fetch(
			`${WP_BASE}/wp-content/uploads/elementor/css/post-${postId}.css`,
			{ signal: AbortSignal.timeout(20_000) },
		);
		if (!response.ok) return styles;
		const css = await response.text();

		const rule = /\.elementor-element\.elementor-element-([a-z0-9]+)([^{}]*)\{([^}]*)\}/g;
		for (const match of css.matchAll(rule)) {
			const [, id, selectorTail, body] = match;
			const entry = styles.get(id) ?? {};

			const color = body.match(/background-color\s*:\s*([^;]+)/);
			const image = body.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/);
			if (color) entry.backgroundColor = color[1].trim();
			if (image) entry.backgroundImage = image[1].trim();

			// Vzhled nadpisu. Elementor ho zapisuje do pravidla, jehož selektor
			// pokračuje `.elementor-heading-title`; zarovnání sedí na samotném
			// prvku widgetu, proto se čtou obě varianty.
			if (selectorTail.includes('heading-title')) {
				const textColor = body.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
				const fontSize = body.match(/font-size\s*:\s*(\d+)px/);
				if (textColor) entry.headingColor = textColor[1].trim();
				if (fontSize) entry.headingSize = Number(fontSize[1]);
			}
			const align = body.match(/text-align\s*:\s*(left|center|right|start|end)/);
			if (align) entry.textAlign = align[1].trim();

			styles.set(id, entry);
		}
	} catch {
		// CSS je jen doplněk — bez něj sekce prostě vyjde s bílým pozadím.
	}
	return styles;
}

/** Barvu pozadí namapuje na token sekce. Neznámé → bílá. */
export function classifyBackground(color) {
	if (!color) return 'none';
	const normalized = color.toLowerCase().replace(/\s/g, '');
	if (/^(transparent|rgba\(0,0,0,0\)|#fff(fff)?)$/.test(normalized)) return 'none';
	if (normalized.includes('faf0e6') || normalized.includes('ecc198') || normalized.includes('ffbc7d'))
		return 'alt';
	if (normalized.includes('f9fae5') || normalized.includes('e8eb93')) return 'lime';
	if (normalized.includes('002866') || normalized.includes('15191c')) return 'dark';
	return 'alt';
}

/** Widgety uvnitř prvku, včetně vnořených sekcí, v pořadí výskytu. */
function collectWidgets($, root) {
	const widgets = [];
	$(root)
		.find('[data-widget_type]')
		.each((_, element) => {
			const type = ($(element).attr('data-widget_type') ?? '').split('.')[0];
			widgets.push({ type, element, id: $(element).attr('data-id') ?? '' });
		});
	return widgets;
}

/** Vytáhne z widgetu to, co potřebujeme k sestavení bloku. */
export function readWidget($, widget) {
	const { type, element } = widget;
	const node = $(element);
	const base = { type, id: widget.id };

	switch (type) {
		case 'heading': {
			const heading = node.find('.elementor-heading-title').first();
			const tag = (heading.prop('tagName') ?? 'h2').toLowerCase();
			return { ...base, text: text($, heading), level: Number(tag.replace('h', '')) || 2 };
		}
		case 'text-editor': {
			const container = node.find('.elementor-widget-container').first();
			return { ...base, html: container.html() ?? '', text: text($, container) };
		}
		case 'image': {
			const image = node.find('img').first();
			const link = node.find('a').first().attr('href');
			return {
				...base,
				src: stripSizeSuffix(image.attr('src') ?? image.attr('data-src') ?? ''),
				alt: decodeEntities(image.attr('alt') ?? ''),
				href: link ? toRelative(link) : null,
			};
		}
		case 'button': {
			const link = node.find('a').first();
			return { ...base, label: text($, link), href: toRelative(link.attr('href') ?? '#') };
		}
		case 'be-counter':
			return {
				...base,
				value: text($, node.find('.elementor-counter__number').first()),
				label: text($, node.find('.elementor-counter__title').first()),
			};
		case 'be-icon-box':
			return {
				...base,
				title: text($, node.find('.elementor-icon-box-title, h3, h4').first()),
				text: text($, node.find('.elementor-icon-box-description, p').first()),
				src: stripSizeSuffix(node.find('img').first().attr('src') ?? ''),
			};
		case 'icon-list':
			return {
				...base,
				items: node
					.find('.elementor-icon-list-item')
					.map((_, item) => ({
						label: text($, item),
						href: toRelative($(item).find('a').attr('href') ?? '') || null,
					}))
					.get(),
			};
		case 'accordion':
			return {
				...base,
				items: node
					.find('.elementor-tab-title')
					.map((index, title) => ({
						question: text($, title),
						answer: $(node.find('.elementor-tab-content').get(index)).html() ?? '',
					}))
					.get(),
			};
		case 'tabs':
			return {
				...base,
				items: node
					.find('.elementor-tab-title')
					.map((index, title) => ({
						question: text($, title),
						answer: $(node.find('.elementor-tab-content').get(index)).html() ?? '',
					}))
					.get(),
			};
		case 'be-logo-carousel':
			return {
				...base,
				items: node
					.find('a')
					.map((_, link) => ({
						href: $(link).attr('href') ?? '',
						logo: stripSizeSuffix($(link).find('img').attr('src') ?? ''),
					}))
					.get()
					.filter((item) => item.logo),
			};
		case 'google_maps':
		case 'video':
			return { ...base, url: node.find('iframe').attr('src') ?? '' };
		case 'html':
			return {
				...base,
				html: deobfuscateEmails(node.find('.elementor-widget-container').first().html() ?? ''),
			};
		case 'shortcode':
			return { ...base, html: node.find('.elementor-widget-container').first().html() ?? '' };
		case 'menu-anchor':
			return { ...base, anchor: node.find('.elementor-menu-anchor').attr('id') ?? '' };
		case 'hotspot':
			return {
				...base,
				src: stripSizeSuffix(node.find('img').first().attr('src') ?? ''),
				alt: decodeEntities(node.find('img').first().attr('alt') ?? ''),
			};
		default:
			return { ...base, text: text($, node) };
	}
}

/**
 * Rozloží stránku na sekce → sloupce → widgety.
 *
 * Vrací `sections: null`, pokud stránka není postavená v Elementoru. Hledat
 * `.elementor-section` v celém dokumentu nejde — hlavička i patička jsou
 * taky Elementor šablony a propašovaly by se do obsahu.
 */
export function parsePage(html) {
	const $ = load(html);
	const root = $('[data-elementor-type="wp-page"]').first();
	if (root.length === 0) return { $, sections: null };
	const scope = root;

	const sections = [];
	// Elementor 3.x obaluje sekce několika divy (`.elementor-inner`,
	// `.elementor-section-wrap`) a v této verzi má mezi kontejnerem a sloupci
	// ještě `.elementor-row`. Proto se sekce hledají podle třídy kdekoli
	// uvnitř a sloupce se berou z obou možných úrovní.
	scope.find('.elementor-top-section').each((_, element) => {
		const section = $(element);
		const columns = section
			.find('> .elementor-container > .elementor-column, > .elementor-container > .elementor-row > .elementor-column')
			.map((_, column) => ({
				id: $(column).attr('data-id') ?? '',
				widthClass: ($(column).attr('class') ?? '').match(/elementor-col-(\d+)/)?.[1] ?? '100',
				widgets: collectWidgets($, column).map((widget) => readWidget($, widget)),
			}))
			.get();

		sections.push({
			id: section.attr('data-id') ?? '',
			full: (section.attr('class') ?? '').includes('elementor-section-full_width'),
			columns,
		});
	});

	return { $, sections };
}

/**
 * Barvu nadpisu z Elementoru namapuje na token. Web má nadpisy ve čtyřech
 * barvách — oranžové, modré, limetkové a tmavé — plus bílé na fotkách.
 */
export function classifyHeadingTone(color) {
	if (!color) return null;
	const value = color.toLowerCase().replace(/\s/g, '');
	if (/#fff(fff)?|rgb\(255,255,255\)/.test(value)) return 'inverse';
	if (value.includes('d88230') || value.includes('f6862f') || value.includes('ecc198')) return 'heading';
	if (value.includes('23a3dd') || value.includes('00b2ef') || value.includes('002866')) return 'sub';
	if (value.includes('d1d626') || value.includes('c8da2b') || value.includes('e8eb93')) return 'lime';
	if (value.includes('000000') || value.includes('#000') || value.includes('111') || value.includes('333'))
		return 'text';
	return null;
}

/** Velikost nadpisu v px na nejbližší token. */
export function classifyHeadingSize(size) {
	if (!size) return null;
	if (size >= 60) return 'hero';
	if (size >= 43) return 'section';
	if (size >= 36) return 'lead';
	if (size >= 30) return 'h2';
	if (size >= 26) return 'panel';
	return 'h3';
}

/** `start`/`end` z Elementoru na hodnoty, které rozumí bloky. */
export const normalizeAlign = (align) =>
	align === 'start' ? 'left' : align === 'end' ? 'right' : (align ?? null);
