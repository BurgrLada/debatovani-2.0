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
import { DEFAULT_LANG, isLang, type Lang } from './i18n';

/** Jazyk z parametrů oblasti; neznámá hodnota spadne na výchozí. */
const langParam = (params: URLSearchParams): Lang => {
	const value = params.get('lang') ?? '';
	return isLang(value) ? value : DEFAULT_LANG;
};

export const islands: IslandRegistry = {
	page: {
		fetch: (_request, params) => getPage(params.get('path') ?? 'home', langParam(params)),
		component: PageBody,
		wrapper: { tag: 'div' },
		propsFromData: (data) => ({
			data: (data as QueryResult<PageQuery>).data?.page as CmsPage | undefined,
		}),
	},
	article: {
		fetch: (_request, params) => getArticle(params.get('slug') ?? '', langParam(params)),
		component: ArticleBody,
		wrapper: { tag: 'article' },
		propsFromData: (data) => ({
			data: (data as QueryResult<ArticleQuery>).data?.article as CmsArticle | undefined,
		}),
	},
	/*
	 * Hlavička a patička mají obal `display: contents`. Kdyby to byl běžný
	 * `div`, rozbil by rozvržení: hlavička je `position: sticky` a lepila by se
	 * jen uvnitř obalu, patička má `mt-auto` a to platí pro přímého potomka
	 * flexového `body`. S `contents` obal nevytváří box a obojí funguje dál.
	 */
	header: {
		fetch: (_request, params) => getGlobal(langParam(params)),
		component: Header,
		wrapper: { tag: 'div', className: 'contents' },
		propsFromData: (data, params) => ({
			global: (data as QueryResult<GlobalQuery>).data?.global as CmsGlobal | undefined,
			lang: langParam(params),
			// Zvýraznění aktivní položky menu se po překreslení nesmí ztratit.
			currentPath: params.get('path') ?? '',
		}),
	},
	footer: {
		fetch: (_request, params) => getGlobal(langParam(params)),
		component: Footer,
		wrapper: { tag: 'div', className: 'contents' },
		propsFromData: (data) => ({
			global: (data as QueryResult<GlobalQuery>).data?.global as CmsGlobal | undefined,
		}),
	},
};
