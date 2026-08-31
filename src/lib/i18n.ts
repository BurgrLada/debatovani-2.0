/**
 * Jazyky webu.
 *
 * Jazyk je první úroveň adresáře v `src/content/<kolekce>/<jazyk>/` a zároveň
 * prefix v URL: čeština běží na kořeni (`/o-nas/`), angličtina pod `/en/`.
 * Rozsah anglické verze je otevřená otázka (docs/04, otázka 8), takže je
 * záměrně možné mít anglicky jen část webu — přepínač v hlavičce se v takovém
 * případě vrátí na anglickou úvodní stránku.
 */

export const LANGS = ['cs', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'cs';

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/** `/en/o-nas/` → `en`; všechno ostatní je čeština. */
export function langFromPath(pathname: string): Lang {
	const first = pathname.split('/').filter(Boolean)[0];
	return first && isLang(first) && first !== DEFAULT_LANG ? first : DEFAULT_LANG;
}

/** Čeština běží bez prefixu, ostatní jazyky s ním. */
export const localizeHref = (path: string, lang: Lang): string => {
	const clean = `/${path.replace(/^\/+/, '')}`;
	return lang === DEFAULT_LANG ? clean : `/${lang}${clean === '/' ? '/' : clean}`;
};

/** Popisky rozhraní, které nejsou součástí obsahu spravovaného v CMS. */
const UI = {
	cs: {
		skipToContent: 'Přeskočit na obsah',
		openMenu: 'Otevřít menu',
		mainNav: 'Hlavní navigace',
		news: 'Aktuality',
		readMore: 'Číst dál',
		allNews: 'Všechny aktuality',
		pagination: 'Stránkování',
		newer: '← Novější',
		older: 'Starší →',
		pageOf: (page: number, total: number) => `Strana ${page} z ${total}`,
		notFoundTitle: 'Tuhle stránku jsme nenašli',
		notFoundText: 'Odkaz je nejspíš starý nebo obsahuje překlep. Zkuste hlavní rozcestník nebo aktuality.',
		toHomepage: 'Na úvodní stránku',
		switchTo: 'Switch to English',
		noEvents: 'Momentálně nemáme vypsanou žádnou akci. Sledujte aktuality.',
		signUp: 'Přihlásit se',
		submit: 'Odeslat',
		formDisabled: 'Odesílání zatím není nastavené — doplňte v editoru pole „Kam se formulář odesílá“.',
		show: 'Zobrazit',
		newsFeedTitle: 'Aktuality – Asociace debatních klubů',
		newsFeedDescription: 'Novinky, výsledky a výzvy z debatního programu.',
	},
	en: {
		skipToContent: 'Skip to content',
		openMenu: 'Open menu',
		mainNav: 'Main navigation',
		news: 'News',
		readMore: 'Read more',
		allNews: 'All news',
		pagination: 'Pagination',
		newer: '← Newer',
		older: 'Older →',
		pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
		notFoundTitle: 'We could not find this page',
		notFoundText: 'The link is probably outdated or contains a typo. Try the homepage or the news section.',
		toHomepage: 'Go to homepage',
		switchTo: 'Přepnout do češtiny',
		noEvents: 'No events are scheduled right now. Watch the news section.',
		signUp: 'Sign up',
		submit: 'Send',
		formDisabled: 'Submitting is not configured yet — fill in the “Where the form is sent” field in the editor.',
		show: 'View',
		newsFeedTitle: 'News – Czech Debate Association',
		newsFeedDescription: 'News, results and calls from the debate programme.',
	},
} as const;

export const t = (lang: Lang) => UI[lang];

/** Vlaječka, na kterou se ve stávajícím jazyce kliká pro přepnutí. */
export const switcher = (lang: Lang) =>
	lang === 'cs'
		? { to: 'en' as Lang, flag: '/media/brand/vlajka-en.png', alt: 'English' }
		: { to: 'cs' as Lang, flag: '/media/brand/vlajka-cz.png', alt: 'Čeština' };
