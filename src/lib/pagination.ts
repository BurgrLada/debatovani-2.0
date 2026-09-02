/**
 * Stránkování pro routy vykreslované na vyžádání.
 *
 * Astro nabízí `paginate()`, ale jen uvnitř `getStaticPaths()` — tedy přesně
 * tam, kde se routy generují dopředu. Výpisy aktualit se od přechodu na
 * okamžitou publikaci vykreslují na vyžádání, takže si `Page` musí složit samy.
 *
 * Tvar odpovídá `Page` z Astra, aby komponenty (`NewsList.astro`) nepoznaly
 * rozdíl a daly se použít v obou režimech.
 */
import type { Page } from 'astro';

export type PaginateOptions = {
	/** Všechny položky, už seřazené. */
	items: unknown[];
	/** Číslo stránky z URL. První strana je 1. */
	current: number;
	pageSize: number;
	/** Adresa první strany včetně lomítek, např. `/aktuality/`. */
	base: string;
};

/**
 * Vrátí `Page` pro danou stranu, nebo `null`, když strana neexistuje —
 * volající z toho udělá 404. Bez téhle kontroly by `/aktuality/999/` vrátilo
 * prázdný výpis se stavem 200, což je pro vyhledávače horší než poctivá 404.
 */
export function paginate<T>({ items, current, pageSize, base }: PaginateOptions): Page<T> | null {
	const total = items.length;
	const lastPage = Math.max(1, Math.ceil(total / pageSize));

	if (!Number.isInteger(current) || current < 1 || current > lastPage) {
		return null;
	}

	const start = (current - 1) * pageSize;
	const end = Math.min(start + pageSize, total);

	// První strana je na `base`, další na `base<číslo>/` — stejné adresy, jaké
	// dřív generoval `paginate()` v `getStaticPaths()`, aby se odkazy nezměnily.
	const pageUrl = (n: number) => (n === 1 ? base : `${base}${n}/`);

	return {
		data: items.slice(start, end) as T[],
		start,
		end: end - 1,
		size: pageSize,
		total,
		currentPage: current,
		lastPage,
		url: {
			current: pageUrl(current),
			prev: current > 1 ? pageUrl(current - 1) : undefined,
			next: current < lastPage ? pageUrl(current + 1) : undefined,
			first: current > 1 ? pageUrl(1) : undefined,
			last: current < lastPage ? pageUrl(lastPage) : undefined,
		},
	};
}

/**
 * Číslo strany z rest parametru routy `[...page]`.
 *
 * `/aktuality/` → 1, `/aktuality/3/` → 3, cokoli jiného → `null` (404).
 * Řetězec se kontroluje na číslice, aby `/aktuality/03/` nebo `/aktuality/1x/`
 * neprošly jako duplicitní adresa téže strany.
 */
export function pageNumberFrom(param: string | undefined): number | null {
	if (!param) {
		return 1;
	}

	const cleaned = param.replace(/\/$/, '');

	if (!/^[1-9][0-9]*$/.test(cleaned)) {
		return null;
	}

	return Number(cleaned);
}
