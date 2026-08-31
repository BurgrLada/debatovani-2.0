import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { listArticles } from '../lib/data';

export async function GET(context: APIContext) {
	const articles = await listArticles();
	return rss({
		title: 'Aktuality – Asociace debatních klubů',
		description: 'Novinky, výsledky a výzvy z debatního programu.',
		site: context.site ?? 'https://debatovani.cz',
		items: articles.map((article) => ({
			title: article.title ?? '',
			description: article.perex ?? '',
			pubDate: article.date ? new Date(article.date) : undefined,
			link: `/aktuality/${article.slug}/`,
		})),
		customData: '<language>cs</language>',
	});
}
