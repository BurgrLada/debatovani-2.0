/**
 * Registr editovatelných oblastí. Jedna položka = jedna oblast, kterou umí
 * Tina bridge po úpravě znovu načíst bez reloadu stránky. Dynamická routa
 * `/tina-island/[name]` si registr přečte sama, takže přidání oblasti je
 * jeden záznam tady a nic víc.
 */
import type { IslandRegistry } from '@tinacms/astro/experimental';
import type { QueryResult } from '@tinacms/astro/data';

import type { ArticleQuery, GlobalQuery, PageQuery } from '../../tina/__generated__/types';
import type { CmsArticle, CmsGlobal, CmsPage } from './data';
import PageBody from '../components/islands/PageBody.astro';
import ArticleBody from '../components/islands/ArticleBody.astro';
import Header from '../components/layout/Header.astro';
import Footer from '../components/layout/Footer.astro';
import { getArticle, getGlobal, getPage } from './data';

export const islands: IslandRegistry = {
	page: {
		fetch: (_request, params) => getPage(params.get('path') ?? 'home', (params.get('lang') as never) ?? 'cs'),
		component: PageBody,
		wrapper: { tag: 'div' },
		propsFromData: (data) => ({
			data: (data as QueryResult<PageQuery>).data?.page as CmsPage | undefined,
		}),
	},
	article: {
		fetch: (_request, params) => getArticle(params.get('slug') ?? ''),
		component: ArticleBody,
		wrapper: { tag: 'article' },
		propsFromData: (data) => ({
			data: (data as QueryResult<ArticleQuery>).data?.article as CmsArticle | undefined,
		}),
	},
	header: {
		fetch: (_request, params) => getGlobal((params.get('lang') as never) ?? 'cs'),
		component: Header,
		wrapper: { tag: 'div' },
		propsFromData: (data) => ({
			global: (data as QueryResult<GlobalQuery>).data?.global as CmsGlobal | undefined,
		}),
	},
	footer: {
		fetch: (_request, params) => getGlobal((params.get('lang') as never) ?? 'cs'),
		component: Footer,
		wrapper: { tag: 'div' },
		propsFromData: (data) => ({
			global: (data as QueryResult<GlobalQuery>).data?.global as CmsGlobal | undefined,
		}),
	},
};
