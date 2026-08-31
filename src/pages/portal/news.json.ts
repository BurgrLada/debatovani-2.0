/**
 * Aktuality pro Portál debatování.
 *
 * Portálový skript původně tahal `wp-json/wp/v2/posts?categories=355`
 * (rubrika „Portál“). Tenhle endpoint vrací totéž z našeho obsahu a ve
 * stejném tvaru, aby po vypnutí WordPressu nebylo nutné sahat do skriptu.
 */
import type { APIRoute } from 'astro';
import { listArticles } from '../../lib/data';

/** Rubrika, ze které portál bere aktuality. */
const PORTAL_CATEGORY = 'Portál';
const LIMIT = 10;

export const GET: APIRoute = async () => {
	const articles = await listArticles();
	const posts = articles
		.filter((article) => article.categories.includes(PORTAL_CATEGORY))
		.slice(0, LIMIT)
		.map((article) => ({
			id: article.id,
			date: article.date,
			link: `/aktuality/${article.slug}/`,
			title: { rendered: article.title ?? '' },
			excerpt: { rendered: article.perex ? `<p>${article.perex}</p>` : '' },
		}));

	return new Response(JSON.stringify(posts), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};
