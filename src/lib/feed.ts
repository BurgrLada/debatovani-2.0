/**
 * RSS kanál aktualit. Sdílí ho česká `/rss.xml` i anglická `/en/rss.xml` —
 * liší se jen jazykem obsahu a adresami položek.
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { listArticles } from './data';
import { localizeHref, t, type Lang } from './i18n';

export async function articlesFeed(context: APIContext, lang: Lang) {
	const articles = await listArticles(lang);
	const strings = t(lang);

	return rss({
		title: strings.newsFeedTitle,
		description: strings.newsFeedDescription,
		site: context.site ?? 'https://debatovani.cz',
		items: articles.map((article) => ({
			title: article.title ?? '',
			description: article.perex ?? '',
			pubDate: article.date ? new Date(article.date) : undefined,
			link: localizeHref(`/aktuality/${article.slug}/`, lang),
		})),
		customData: `<language>${lang}</language>`,
	});
}
