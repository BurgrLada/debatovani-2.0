/**
 * Napojení na `debata21` API (akce a přihlášky).
 *
 * Dnešní web tahá tato data klientským JS vlepeným do Elementor `html`
 * widgetu. Tady je to oddělená vrstva, protože podle docs/04 (otázka 6) je
 * portál rozšíření — obsahový model webu se od něj nesmí odvozovat.
 *
 * Data se načtou při buildu (kvůli SEO a chodu bez JS) a komponenta si je na
 * klientovi znovu ověří, aby statická stránka neukazovala prošlé termíny.
 */

export const EVENTS_ENDPOINT = 'https://api-prod.debata21.cz/api/event';

/** Vícejazyčné pole z API — `{ cs, en }` plus servisní sloupce, které nás nezajímají. */
interface LocalizedText {
	cs?: string | null;
	en?: string | null;
}

export interface Debata21Event {
	id: number;
	name?: LocalizedText | null;
	note?: LocalizedText | null;
	beginning?: string | null;
	end?: string | null;
	place?: string | null;
	soft_deadline?: string | null;
	hard_deadline?: string | null;
	organizer?: string | null;
}

export interface DebateEvent {
	id: number;
	title: string;
	place: string | null;
	start: string | null;
	end: string | null;
	deadline: string | null;
	url: string;
}

export const localized = (value: LocalizedText | null | undefined, lang = 'cs'): string =>
	(lang === 'en' ? value?.en : value?.cs) ?? value?.cs ?? '';

export const normalizeEvent = (event: Debata21Event, lang = 'cs'): DebateEvent => ({
	id: event.id,
	title: localized(event.name, lang),
	place: event.place ?? null,
	start: event.beginning ?? null,
	end: event.end ?? null,
	deadline: event.soft_deadline ?? event.hard_deadline ?? null,
	url: `https://portal.debatovani.cz/event/${event.id}`,
});

/**
 * Načte nadcházející akce. Selhání API nesmí shodit build ani stránku —
 * vrací se prázdný seznam a blok se prostě nevykreslí.
 */
export async function fetchEvents(lang = 'cs'): Promise<DebateEvent[]> {
	try {
		const response = await fetch(EVENTS_ENDPOINT, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) return [];
		const payload: unknown = await response.json();
		if (!Array.isArray(payload)) return [];
		return payload
			.map((event) => normalizeEvent(event as Debata21Event, lang))
			.filter((event) => event.title)
			.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
	} catch {
		return [];
	}
}

const MONTHS = [
	'ledna', 'února', 'března', 'dubna', 'května', 'června',
	'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

/** „13. – 18. září 2026“; stejný měsíc i rok se neopakují. */
export function formatDateRange(start: string | null, end: string | null): string {
	if (!start) return '';
	const from = new Date(start);
	if (Number.isNaN(from.valueOf())) return '';
	const to = end ? new Date(end) : null;
	const day = (d: Date) => `${d.getDate()}.`;
	const full = (d: Date) => `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

	if (!to || Number.isNaN(to.valueOf()) || start === end) return full(from);
	if (from.getFullYear() !== to.getFullYear()) return `${full(from)} – ${full(to)}`;
	if (from.getMonth() !== to.getMonth()) {
		return `${from.getDate()}. ${MONTHS[from.getMonth()]} – ${full(to)}`;
	}
	return `${day(from)} – ${full(to)}`;
}
