import { DEFAULT_LANG, LANGS, isLang, localizeHref, type Lang } from '../../src/lib/i18n';

/**
 * Adresa náhledu pro dokument otevřený v editoru.
 *
 * První úroveň adresáře je jazyk (`src/content/page/en/home.mdx`), takže se
 * musí promítnout do URL jako prefix — bez toho editor otevře českou verzi
 * a anglická stránka se v náhledu nikdy neukáže.
 *
 * `routedLangs` vymezuje jazyky, ve kterých kolekce opravdu má routu. Pro
 * ostatní vrací `undefined`: editor pak nabídne jen formulář místo náhledu,
 * který by stejně skončil na cizojazyčné stránce nebo na 404.
 */
export function localizedRoute(
	breadcrumbs: string[],
	build: (path: string) => string,
	routedLangs: readonly Lang[] = LANGS,
): string | undefined {
	const [first, ...rest] = breadcrumbs;
	const hasLang = isLang(first ?? '');
	const lang = hasLang ? (first as Lang) : DEFAULT_LANG;
	if (!routedLangs.includes(lang)) return undefined;

	return localizeHref(build((hasLang ? rest : breadcrumbs).join('/')), lang);
}
