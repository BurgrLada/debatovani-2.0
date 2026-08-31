#!/usr/bin/env node
/**
 * Migrace stránek z Elementoru do blokového obsahu (`src/content/page/cs/`).
 *
 * Na rozdíl od článků tohle **není** převod 1:1 — Elementor skládá stránky
 * z widgetů, náš web z bloků, a mapování je nutně odhad. Skript proto na
 * konci vypíše přehled toho, co si zaslouží ruční kontrolu, a stránky, které
 * nešly rozumně převést, nechá s blokem „Vlastní HTML“.
 *
 * Cesta souboru odpovídá URL: WP `/o-nas/lide/` → `src/content/page/cs/o-nas/lide.mdx`.
 *
 * Použití:
 *   node scripts/migrate-pages.mjs                 # všechny stránky
 *   node scripts/migrate-pages.mjs --slug o-nas    # jedna stránka
 *   node scripts/migrate-pages.mjs --dry-run       # jen přehled, nic nezapisuje
 */
import { load } from 'cheerio';
import TurndownService from 'turndown';
import {
	fetchAll,
	downloadMedia,
	writeFileEnsured,
	decodeEntities,
	yamlBlock,
	yamlString,
	rewritePostLinks,
	deobfuscateEmails,
	normalizeLists,
	localizeDocuments,
	exists,
} from './lib/wp.mjs';
import {
	parsePage,
	fetchElementStyles,
	classifyBackground,
	classifyHeadingTone,
	classifyHeadingSize,
	normalizeAlign,
	stripSizeSuffix,
} from './lib/elementor.mjs';

const args = process.argv.slice(2);
const onlySlug = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
const dryRun = args.includes('--dry-run');

const OUT_DIR = 'src/content/page/cs';
const MEDIA_DIR = '/media/stranky';

/** Stránky, které se do nového webu nepřenášejí (docs/02, sekce 4). */
const SKIP_SLUGS = new Set([
	'testovaci-stranka',
	'home-pumori', // homepage — zrekonstruovaná ručně jako referenční stránka
	'prehled-aktualit', // nahrazuje ji routa /aktuality/
	'aktuality', // dtto — výpis článků generuje `src/pages/aktuality/`
	'portal', // vlastní stránka `src/pages/portal/`, přenesená 1:1 i s JS
	'lide', // přepsaná ručně nad kolekcí `person`
	'dokumenty', // rozcestník napsaný ručně, na WP je stránka prázdná
	'en', // anglická verze má vlastní strom `src/content/page/en/`
]);

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	emDelimiter: '_',
});

const notes = [];
const note = (page, message) => notes.push(`${page}: ${message}`);

const mediaPathFromUrl = (url) => {
	const match = url.match(/\/wp-content\/uploads\/(?:.*\/)?(\d{4}\/\d{2}\/[^/?#]+)/);
	if (match) return `${MEDIA_DIR}/${match[1]}`;
	const name = url.split('/').pop()?.split('?')[0];
	return name ? `${MEDIA_DIR}/ostatni/${name}` : null;
};

/** Stáhne obrázek; při neúspěchu nechá původní adresu (viz migrate-articles). */
async function localizeImage(src) {
	if (!src || !src.includes('/wp-content/uploads/')) return src || null;
	for (const candidate of [stripSizeSuffix(src), src].filter((u, i, a) => a.indexOf(u) === i)) {
		const localPath = mediaPathFromUrl(candidate);
		if (localPath && (await downloadMedia(candidate, localPath))) return localPath;
	}
	return src;
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

const toMarkdown = (html) =>
	escapeBraces(
		turndown.turndown(stripNonContent(deobfuscateEmails(rewritePostLinks(html ?? ''))))
			.replace(/(?<!^[ \t]*)(\d)\\\./gm, '$1.')
			.replace(/\n{3,}/g, '\n\n')
			.trim(),
	);

/**
 * Vzhled nadpisu vytažený z per-stránkového Elementor CSS. Bez toho by všechny
 * nadpisy vyšly oranžové na střed, jenže dnešní web je má v každé sekci jinak.
 */
function headingLook(widget, context) {
	const style = context.styles?.get(widget?.id) ?? {};
	const tone = classifyHeadingTone(style.headingColor);
	const size = classifyHeadingSize(style.headingSize);
	const align = normalizeAlign(style.textAlign);
	return {
		...(tone ? { titleTone: tone } : {}),
		...(size ? { titleSize: size } : {}),
		...(align ? { titleAlign: align } : {}),
	};
}

/** Text z několika widgetů za sebou jako jeden Markdown blok. */
async function joinContent(widgets, context) {
	const parts = [];
	for (const widget of widgets) parts.push(await toContent(widget.html, context));
	return parts.join('\n\n');
}

/** Markdown pro uložení: srovnané seznamy a stažené odkazované dokumenty. */
async function toContent(html, context) {
	const { markdown, failed } = await localizeDocuments(normalizeLists(toMarkdown(html)));
	if (failed > 0) note(context.page, `${failed} odkazovaných souborů se nepodařilo stáhnout`);
	return markdown;
}

/* ------------------------------------------------------------------ */
/*  Rozpoznávání vzorů: sloupec widgetů → jeden nebo více bloků        */
/* ------------------------------------------------------------------ */

/** Opakující se trojice obrázek + nadpis + text = mřížka karet s ikonou. */
function detectIconCards(widgets) {
	const cards = [];
	for (let i = 0; i < widgets.length; i += 1) {
		if (widgets[i].type !== 'image') continue;
		const heading = widgets[i + 1];
		const body = widgets[i + 2];
		if (heading?.type !== 'heading' || body?.type !== 'text-editor') continue;
		cards.push({ image: widgets[i], heading, body, start: i, end: i + 2 });
		i += 2;
	}
	return cards.length >= 2 ? cards : null;
}

/** Sloupec je „obrázkový“, když v něm není nic než obrázky. */
const isImageOnly = (widgets) =>
	widgets.length > 0 && widgets.every((widget) => widget.type === 'image');

const isLayoutOnly = (widgets) =>
	widgets.every((widget) => ['spacer', 'divider', 'menu-anchor'].includes(widget.type));

/* ------------------------------------------------------------------ */
/*  Skládání bloků                                                     */
/* ------------------------------------------------------------------ */

async function buttonsFrom(widgets) {
	return widgets
		.filter((widget) => widget.type === 'button' && widget.label)
		.map((widget) => ({ label: widget.label, href: widget.href, variant: 'lime' }));
}

/** Widgety jednoho sloupce převede na bloky. */
async function widgetsToBlocks(widgets, context) {
	const blocks = [];
	const cards = detectIconCards(widgets);

	if (cards) {
		const before = widgets.slice(0, cards[0].start);
		const beforeHeading = before.find((widget) => widget.type === 'heading');
		blocks.push(...(await plainWidgetsToBlocks(before, context)));

		const items = [];
		for (const card of cards) {
			items.push({
				image: await localizeImage(card.image.src),
				title: card.heading.text,
				text: await toContent(card.body.html, context),
			});
		}
		blocks.push({
			_template: 'iconCards',
			title: beforeHeading?.text ?? null,
			...headingLook(beforeHeading, context),
			columns: '3',
			items,
			...context.section,
		});

		const after = widgets.slice(cards.at(-1).end + 1);
		blocks.push(...(await plainWidgetsToBlocks(after, context)));
		return blocks;
	}

	return plainWidgetsToBlocks(widgets, context);
}

/** Widget po widgetu, bez rozpoznávání vzorů. */
async function plainWidgetsToBlocks(widgets, context) {
	const blocks = [];
	let pendingHeading = null;
	let pendingButtons = [];

	const flushButtons = () => {
		if (pendingButtons.length === 0) return;
		blocks.push({ _template: 'buttons', align: 'center', items: pendingButtons, ...context.section });
		pendingButtons = [];
	};

	for (const widget of widgets) {
		switch (widget.type) {
			case 'heading':
				flushButtons();
				// Nadpis si počká, jestli po něm přijde text — pak tvoří jeden blok.
				if (pendingHeading) {
					blocks.push({
						_template: 'richText',
						title: pendingHeading.text,
						...headingLook(pendingHeading, context),
						body: '',
						...context.section,
					});
				}
				pendingHeading = widget;
				break;

			case 'text-editor': {
				flushButtons();
				blocks.push({
					_template: 'richText',
					title: pendingHeading?.text ?? null,
					...headingLook(pendingHeading, context),
					body: await toContent(widget.html, context),
					width: 'normal',
					...context.section,
				});
				pendingHeading = null;
				break;
			}

			case 'image':
				flushButtons();
				if (pendingHeading) {
					blocks.push({
						_template: 'richText',
						title: pendingHeading.text,
						...headingLook(pendingHeading, context),
						body: '',
						...context.section,
					});
					pendingHeading = null;
				}
				blocks.push({
					_template: 'imageBlock',
					image: await localizeImage(widget.src),
					alt: widget.alt,
					href: widget.href,
					align: 'center',
					size: 'full',
					...context.section,
				});
				break;

			case 'hotspot':
				flushButtons();
				blocks.push({
					_template: 'imageBlock',
					image: await localizeImage(widget.src),
					alt: widget.alt,
					align: 'center',
					size: 'full',
					...context.section,
				});
				note(context.page, 'widget „hotspot“ převeden na obyčejný obrázek — interaktivní body zanikly');
				break;

			case 'button':
				pendingButtons.push({ label: widget.label, href: widget.href, variant: 'lime' });
				break;

			case 'divider':
				flushButtons();
				blocks.push({ _template: 'divider', style: 'line', size: 'normal' });
				break;

			case 'spacer':
				flushButtons();
				blocks.push({ _template: 'divider', style: 'space', size: 'normal' });
				break;

			case 'icon-list':
				flushButtons();
				blocks.push({
					_template: 'iconList',
					title: pendingHeading?.text ?? null,
					...headingLook(pendingHeading, context),
					icon: 'fa6-solid:check',
					columns: '1',
					items: widget.items,
					...context.section,
				});
				pendingHeading = null;
				break;

			case 'be-icon-box':
				flushButtons();
				blocks.push({
					_template: 'iconCards',
					columns: '3',
					items: [
						{ image: await localizeImage(widget.src), title: widget.title, text: widget.text },
					],
					...context.section,
				});
				break;

			case 'accordion':
			case 'tabs': {
				flushButtons();
				const accordionItems = [];
				for (const item of widget.items) {
					accordionItems.push({
						question: item.question,
						answer: await toContent(item.answer, context),
					});
				}
				blocks.push({
					_template: 'accordion',
					title: pendingHeading?.text ?? null,
					...headingLook(pendingHeading, context),
					items: accordionItems,
					...context.section,
				});
				pendingHeading = null;
				if (widget.type === 'tabs') note(context.page, 'záložky převedeny na rozbalovací seznam');
				break;
			}

			case 'be-logo-carousel': {
				flushButtons();
				const items = [];
				for (const item of widget.items) {
					items.push({ logo: await localizeImage(item.logo), href: item.href, name: '' });
				}
				blocks.push({
					_template: 'partnerLogos',
					title: pendingHeading?.text ?? null,
					...headingLook(pendingHeading, context),
					items,
					...context.section,
				});
				pendingHeading = null;
				break;
			}

			case 'google_maps':
			case 'video':
				flushButtons();
				blocks.push({
					_template: 'embed',
					title: pendingHeading?.text ?? null,
					...headingLook(pendingHeading, context),
					url: widget.url,
					ratio: '16-9',
					...context.section,
				});
				pendingHeading = null;
				break;

			case 'shortcode':
				flushButtons();
				blocks.push({
					_template: 'contactForm',
					title: pendingHeading?.text ?? 'Napište nám',
					...headingLook(pendingHeading, context),
					submitLabel: 'Odeslat',
					fields: [
						{ label: 'Jméno', name: 'jmeno', type: 'text', required: true },
						{ label: 'E-mail', name: 'email', type: 'email', required: true },
						{ label: 'Zpráva', name: 'zprava', type: 'textarea' },
					],
					...context.section,
				});
				pendingHeading = null;
				note(context.page, 'formulář z WPForms nahrazen výchozími poli — zkontrolovat a doplnit odesílání');
				break;

			case 'html':
				flushButtons();
				if ((widget.html ?? '').trim().length > 40) {
					blocks.push({ _template: 'rawHtml', note: 'Přeneseno z Elementoru', html: widget.html.trim(), ...context.section });
					note(context.page, 'vlastní HTML/JS přeneseno beze změny — projít a případně nahradit blokem');
				}
				break;

			case 'menu-anchor':
				// Kotva se přenáší na následující blok, samostatný blok netvoří.
				context.pendingAnchor = widget.anchor || null;
				break;

			default:
				flushButtons();
				note(context.page, `widget „${widget.type}“ nemá blok — přeskočen`);
		}
	}

	flushButtons();
	if (pendingHeading) {
		blocks.push({
			_template: 'richText',
			title: pendingHeading.text,
			...headingLook(pendingHeading, context),
			body: '',
			...context.section,
		});
	}
	return blocks;
}

/** Sekce se dvěma sloupci, kde jeden je jen obrázek → text s obrázkem. */
async function twoColumnBlock(section, context) {
	const [left, right] = section.columns;
	const leftIsImage = isImageOnly(left.widgets);
	const rightIsImage = isImageOnly(right.widgets);
	if (leftIsImage === rightIsImage) return null;

	const imageColumn = leftIsImage ? left : right;
	const textColumn = leftIsImage ? right : left;
	const heading = textColumn.widgets.find((widget) => widget.type === 'heading');
	const body = await joinContent(
		textColumn.widgets.filter((widget) => widget.type === 'text-editor'),
		context,
	);

	// Bez textu je to prostě obrázek vedle obrázku — ať to řeší obecná větev.
	if (!heading && !body) return null;

	const widths = { '50': 'half', '33': 'two-thirds', '66': 'third' };

	return {
		_template: 'textWithImage',
		title: heading?.text ?? null,
		...headingLook(heading, context),
		body,
		image: await localizeImage(imageColumn.widgets[0].src),
		alt: imageColumn.widgets[0].alt,
		imagePosition: leftIsImage ? 'left' : 'right',
		imageWidth: widths[imageColumn.widthClass] ?? 'half',
		buttons: await buttonsFrom(textColumn.widgets),
		...context.section,
	};
}

/** Sloupec plný počítadel → blok Čísla. */
async function statsBlock(section, context) {
	const counters = section.columns
		.flatMap((column) => column.widgets)
		.filter((widget) => widget.type === 'be-counter');
	if (counters.length === 0) return null;

	const rest = section.columns
		.flatMap((column) => column.widgets)
		.filter((widget) => !['be-counter', 'divider'].includes(widget.type));
	const statsHeading = rest.find((widget) => widget.type === 'heading');

	return {
		_template: 'stats',
		title: statsHeading?.text ?? null,
		...headingLook(statsHeading, context),
		items: counters.map((counter) => ({ value: counter.value, label: counter.label })),
		text: await joinContent(
			rest.filter((widget) => widget.type === 'text-editor'),
			context,
		),
		buttons: await buttonsFrom(rest),
		...context.section,
	};
}

/**
 * Nadpis a text pod ním jsou v Elementoru dva widgety a často i dvě sekce,
 * takže z prvního průchodu vypadne blok jen s nadpisem a prázdným textem.
 * Tady se slepí s následujícím textovým blokem, který nadpis nemá.
 */
function mergeStrayHeadings(blocks) {
	const result = [];
	for (const block of blocks) {
		const previous = result.at(-1);
		const previousIsBareHeading =
			previous?._template === 'richText' && previous.title && !previous.body;

		if (previousIsBareHeading && !block.title && 'title' in block) {
			// S nadpisem se přenáší i jeho vzhled, jinak by blok dostal
			// výchozí oranžový nadpis na střed.
			result[result.length - 1] = {
				...block,
				title: previous.title,
				...(previous.titleTone ? { titleTone: previous.titleTone } : {}),
				...(previous.titleSize ? { titleSize: previous.titleSize } : {}),
				...(previous.titleAlign ? { titleAlign: previous.titleAlign } : {}),
			};
			continue;
		}
		result.push(block);
	}
	return result;
}

/* ------------------------------------------------------------------ */
/*  Serializace do MDX                                                 */
/* ------------------------------------------------------------------ */

const RICH_TEXT_FIELDS = new Set(['body', 'text', 'answer', 'intro']);

function serializeValue(key, value, indent) {
	const pad = ' '.repeat(indent);

	if (value === null || value === undefined || value === '') return null;
	if (Array.isArray(value)) {
		if (value.length === 0) return null;
		const lines = [`${pad}${key}:`];
		for (const item of value) {
			if (typeof item === 'object') {
				const entries = Object.entries(item)
					.map(([k, v]) => serializeValue(k, v, indent + 4))
					.filter(Boolean);
				if (entries.length === 0) continue;
				lines.push(`${pad}  - ${entries[0].trimStart()}`);
				lines.push(...entries.slice(1));
			} else {
				lines.push(`${pad}  - ${yamlString(item)}`);
			}
		}
		return lines.length > 1 ? lines.join('\n') : null;
	}
	if (typeof value === 'boolean') return `${pad}${key}: ${value}`;
	if (typeof value === 'number') return `${pad}${key}: ${value}`;

	const text = String(value);
	// Rich-text a víceřádkové hodnoty jdou do bloku `|`, aby zůstalo formátování.
	if (RICH_TEXT_FIELDS.has(key) || text.includes('\n')) {
		return `${pad}${key}: |\n${yamlBlock(text, indent + 2)}`;
	}
	return `${pad}${key}: ${yamlString(text)}`;
}

function serializeBlocks(blocks) {
	if (blocks.length === 0) return 'blocks: []';
	const lines = ['blocks:'];
	for (const block of blocks) {
		const { _template, ...rest } = block;
		const entries = Object.entries(rest)
			.map(([key, value]) => serializeValue(key, value, 4))
			.filter(Boolean);
		if (entries.length === 0) {
			lines.push(`  - _template: ${_template}`);
			continue;
		}
		lines.push(`  - ${entries[0].trimStart()}`);
		lines.push(...entries.slice(1));
		lines.push(`    _template: ${_template}`);
	}
	return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Hlavní průchod                                                     */
/* ------------------------------------------------------------------ */

/**
 * Stránky, které nikdo nepřekreslil v Elementoru, jsou pořád klasický
 * WordPress obsah. Ty se převedou jako jeden textový blok — struktura
 * nadpisů a odstavců zůstane, jen bez sekcí.
 *
 * Obsah se bere z vykreslené stránky, ne z REST API: `wp/v2/pages` vrací
 * s polem `content` nevalidní JSON (nějaký plugin do odpovědi vypisuje HTML).
 */
async function classicContentToBlocks(document, context) {
	const html = document('.entry-content').first().html() ?? '';
	if (!html.trim()) return [];

	const $ = load(deobfuscateEmails(html), null, false);
	const images = $('img').toArray();
	for (const element of images) {
		const image = $(element);
		const src = image.attr('src') ?? image.attr('data-src') ?? '';
		image.removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('loading');
		image.attr('src', await localizeImage(src));
	}
	$('a[href]').each((_, element) => {
		const link = $(element);
		const href = (link.attr('href') ?? '').replace('https://debatovani.cz', '');
		link.attr('href', rewritePostLinks(href));
	});

	note(context.page, 'stránka nebyla v Elementoru — převedena jako jeden textový blok');

	return [
		{
			_template: 'richText',
			body: await toContent($.html(), context),
			width: 'narrow',
			background: 'none',
			padding: 'large',
		},
	];
}

async function convertPage(page, pathById) {
	const html = await fetch(page.link).then((response) => response.text());
	const { $, sections } = parsePage(html);
	const context = { page: page.slug, section: {}, pendingAnchor: null };

	if (sections === null) {
		const blocks = await classicContentToBlocks($, context);
		return { path: `${OUT_DIR}/${pathById.get(page.id)}.mdx`, contents: renderMdx(page, blocks), blocks };
	}

	const styles = await fetchElementStyles(page.id);
	context.styles = styles;
	const blocks = [];
	for (const section of sections) {
		const style = styles.get(section.id) ?? {};
		const background = classifyBackground(style.backgroundColor);
		const backgroundImage = style.backgroundImage
			? await localizeImage(style.backgroundImage)
			: null;

		context.section = {
			background: backgroundImage ? 'image' : background,
			...(backgroundImage ? { backgroundImage, overlay: true } : {}),
			padding: 'normal',
		};

		if (section.columns.every((column) => isLayoutOnly(column.widgets))) {
			const anchor = section.columns
				.flatMap((column) => column.widgets)
				.find((widget) => widget.type === 'menu-anchor')?.anchor;
			if (anchor) context.pendingAnchor = anchor;
			continue;
		}

		const stats = await statsBlock(section, context);
		if (stats) {
			blocks.push(stats);
			continue;
		}

		if (section.columns.length === 2) {
			const split = await twoColumnBlock(section, context);
			if (split) {
				blocks.push(split);
				continue;
			}
		}

		for (const column of section.columns) {
			blocks.push(...(await widgetsToBlocks(column.widgets, context)));
		}
	}

	const merged = mergeStrayHeadings(blocks);
	blocks.length = 0;
	blocks.push(...merged);

	// Kotva z `menu-anchor` patří prvnímu bloku, který po ní následuje.
	if (context.pendingAnchor && blocks.length > 0) {
		const target = blocks.find((block) => !block.anchor);
		if (target) target.anchor = context.pendingAnchor;
	}

	return { path: `${OUT_DIR}/${pathById.get(page.id)}.mdx`, contents: renderMdx(page, blocks), blocks };
}

function renderMdx(page, blocks) {
	const title = decodeEntities(page.title?.rendered ?? page.slug);
	return [
		'---',
		`title: ${yamlString(title)}`,
		'seo:',
		`  title: ${yamlString(title)}`,
		serializeBlocks(blocks),
		'---',
		'',
	].join('\n');
}

async function main() {
	console.log('Stahuji seznam stránek…');
	const pages = await fetchAll('pages', {
		_fields: 'id,slug,link,title,parent,menu_order,status',
	});

	const byId = new Map(pages.map((page) => [page.id, page]));
	const pathById = new Map();
	for (const page of pages) {
		const parts = [];
		for (let current = page; current; current = byId.get(current.parent ?? 0)) {
			parts.unshift(current.slug);
		}
		pathById.set(page.id, parts.join('/'));
	}

	const selected = pages.filter((page) => {
		if (SKIP_SLUGS.has(page.slug)) return false;
		if (onlySlug) return page.slug === onlySlug;
		return true;
	});

	console.log(`Převádím ${selected.length} stránek…`);
	let written = 0;

	for (const page of selected) {
		try {
			const result = await convertPage(page, pathById);
			if (result.blocks.length === 0) {
				note(page.slug, 'nevznikl žádný blok — stránka je nejspíš prázdná nebo nestandardní');
			}
			if (!dryRun) {
				// Ruční úpravy nechceme přepsat: stránka, která už existuje,
				// se přeskočí, dokud se skript nespustí s --force.
				const alreadyThere = await exists(result.path);
				if (alreadyThere && !args.includes('--force')) {
					note(page.slug, 'už existuje — přeskočeno (přepis vynutíte --force)');
					continue;
				}
				await writeFileEnsured(result.path, result.contents);
			}
			written += 1;
		} catch (error) {
			note(page.slug, `SELHALO: ${error.message}`);
		}
	}

	console.log(`\nHotovo: ${written} stránek${dryRun ? ' (nasucho, nic se nezapsalo)' : ''}.`);

	if (notes.length > 0) {
		console.log(`\nK ruční kontrole (${notes.length}):`);
		for (const message of notes) console.log(`  • ${message}`);
	}
}

await main();
