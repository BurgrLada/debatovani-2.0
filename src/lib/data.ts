/**
 * Načítání obsahu z Tiny + typy, které z něj vypadávají.
 *
 * Všechno jde přes `requestWithMetadata()`, aby stránka vykreslená uvnitř
 * administrace nesla metadata pro `tinaField()` a fungovalo vizuální
 * editování.
 *
 * Typy níže jsou odvozené, ne psané ručně — zdrojem pravdy je Tina schéma.
 * Po `tinacms dev` se přegenerují a všechno navazující se updatuje samo.
 */
import type { TinaRichTextContent } from '@tinacms/astro';
import { requestWithMetadata } from '@tinacms/astro/data';
import client from '../../tina/__generated__/client';

export { DEFAULT_LANG } from './i18n';
import { DEFAULT_LANG } from './i18n';

export const getGlobal = (lang = DEFAULT_LANG) =>
	requestWithMetadata(client.queries.global({ relativePath: `${lang}/global.json` }));

export const getPage = (path: string, lang = DEFAULT_LANG) =>
	requestWithMetadata(client.queries.page({ relativePath: `${lang}/${path}.mdx` }), {
		priority: 'primary',
	});

export const getArticle = (slug: string, lang = DEFAULT_LANG) =>
	requestWithMetadata(client.queries.article({ relativePath: `${lang}/${slug}.mdx` }), {
		priority: 'primary',
	});

export const getProject = (slug: string, lang = DEFAULT_LANG) =>
	requestWithMetadata(client.queries.project({ relativePath: `${lang}/${slug}.mdx` }), {
		priority: 'primary',
	});

/** `cs/o-nas/lide` → `o-nas/lide`. Cesta souboru bez jazyka je zároveň URL. */
const stripLang = (relativePath: string) =>
	relativePath.replace(/^[a-z]{2}\//, '').replace(/\.(mdx|md|json)$/, '');

/**
 * Tina vrací kolekce po stránkách (výchozí velikost je pár desítek záznamů),
 * takže jedno zavolání `…Connection()` nestačí — se 356 aktualitami by se
 * vygenerovala jen první várka. Tohle projde kurzory až na konec.
 */
async function listAll<TNode>(
	query: (variables: { after?: string; first?: number }) => Promise<{
		data: {
			[key: string]: {
				pageInfo?: { hasNextPage?: boolean | null; endCursor?: string | null } | null;
				edges?: ({ node?: TNode | null } | null)[] | null;
			};
		};
	}>,
	connectionKey: string,
): Promise<TNode[]> {
	const nodes: TNode[] = [];
	let after: string | undefined;

	for (;;) {
		const result = await query({ after, first: 100 });
		const connection = result.data[connectionKey];
		nodes.push(
			...(connection.edges ?? []).flatMap((edge) => (edge?.node ? [edge.node] : [])),
		);

		const pageInfo = connection.pageInfo;
		if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break;
		after = pageInfo.endCursor;
	}

	return nodes;
}

export async function listPages(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.pageConnection, 'pageConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.map((node) => ({ ...node, path: stripLang(node._sys.relativePath) }));
}

export async function listArticles(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.articleConnection, 'articleConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.filter((node) => !node.draft)
		.map((node) => ({
			...node,
			slug: node._sys.filename,
			categories: (node.categories ?? []).filter((c): c is string => !!c),
		}))
		.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export async function listProjects(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.projectConnection, 'projectConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.map((node) => ({ ...node, slug: node._sys.filename }));
}

export async function listPeople(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.personConnection, 'personConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export async function listClubs(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.clubConnection, 'clubConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.filter((node) => node.active !== false)
		.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'cs'));
}

export async function listPartners(lang = DEFAULT_LANG) {
	const nodes = await listAll(client.queries.partnerConnection, 'partnerConnection');
	return nodes
		.filter((node) => node._sys.relativePath.startsWith(`${lang}/`))
		.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/* ---------- Typy odvozené ze schématu ---------- */

export type CmsGlobal = Awaited<ReturnType<typeof getGlobal>>['data']['global'];
export type CmsPage = Awaited<ReturnType<typeof getPage>>['data']['page'];
export type CmsArticle = Awaited<ReturnType<typeof getArticle>>['data']['article'];
export type CmsProject = Awaited<ReturnType<typeof getProject>>['data']['project'];

export type ArticleListItem = Awaited<ReturnType<typeof listArticles>>[number];
export type PersonListItem = Awaited<ReturnType<typeof listPeople>>[number];
export type ClubListItem = Awaited<ReturnType<typeof listClubs>>[number];
export type PartnerListItem = Awaited<ReturnType<typeof listPartners>>[number];

export type PageBlock = NonNullable<NonNullable<CmsPage['blocks']>[number]>;

/** Bloky se používají i v projektech; typ je proto odvozený od stránky. */
type BlockOf<T extends PageBlock['__typename']> = Extract<PageBlock, { __typename: T }>;

export type HeroBlock = BlockOf<'PageBlocksHero'>;
export type RichTextBlock = BlockOf<'PageBlocksRichText'>;
export type TextWithImageBlock = BlockOf<'PageBlocksTextWithImage'>;
export type ImageBlockBlock = BlockOf<'PageBlocksImageBlock'>;
export type ButtonsBlock = BlockOf<'PageBlocksButtons'>;
export type IconCardsBlock = BlockOf<'PageBlocksIconCards'>;
export type IconListBlock = BlockOf<'PageBlocksIconList'>;
export type StatsBlock = BlockOf<'PageBlocksStats'>;
export type CardLinksBlock = BlockOf<'PageBlocksCardLinks'>;
export type AccordionBlock = BlockOf<'PageBlocksAccordion'>;
export type DocumentListBlock = BlockOf<'PageBlocksDocumentList'>;
export type PeopleListBlock = BlockOf<'PageBlocksPeopleList'>;
export type PartnerLogosBlock = BlockOf<'PageBlocksPartnerLogos'>;
export type ArticleListBlock = BlockOf<'PageBlocksArticleList'>;
export type UpcomingEventsBlock = BlockOf<'PageBlocksUpcomingEvents'>;
export type ClubMapBlock = BlockOf<'PageBlocksClubMap'>;
export type ContactFormBlock = BlockOf<'PageBlocksContactForm'>;
export type EmbedBlock = BlockOf<'PageBlocksEmbed'>;
export type QuoteBlock = BlockOf<'PageBlocksQuote'>;
export type DividerBlock = BlockOf<'PageBlocksDivider'>;
export type RawHtmlBlock = BlockOf<'PageBlocksRawHtml'>;

/** Rich text je v generovaném klientovi typovaný jako `any`; tohle čeká `<TinaMarkdown>`. */
export type RichText = TinaRichTextContent;
