/**
 * Kdo smí do administrace.
 *
 * Přístup se posuzuje na dvou místech a **obě kontroly jsou nutné**:
 *  - při zakládání účtu (`src/lib/auth.ts`), aby cizí účet vůbec nevznikl,
 *  - při každém požadavku na Tina API (`src/pages/api/tina/[...routes].ts`),
 *    aby odebrání ze seznamu odřízlo i účet, který už existuje a má
 *    rozběhnutou relaci.
 *
 * Seznam je v proměnné prostředí, ne v databázi — správa lidí nemá vlastní
 * rozhraní schválně. Kdo edituje web, nemá tím měnit, kdo se do něj dostane.
 * Přidání člověka je úprava `.env` a restart Node procesu.
 */

import './env';

/** Doména organizace. Účet mimo ni neprojde ani po ověření Googlem. */
export const allowedDomain = process.env.AUTH_ALLOWED_DOMAIN ?? 'debatovani.cz';

/**
 * Adresy, které smí do administrace. Prázdný seznam **nepouští nikoho** —
 * mít e-mail na doméně organizace není totéž co spravovat web a tichý opak
 * („prázdné = všichni“) by z překlepu v konfiguraci udělal otevřené dveře.
 */
function readAllowlist(): string[] {
	return (process.env.AUTH_ALLOWED_EMAILS ?? '')
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
}

export type AccessDenial = {
	/** Text pro log a pro odpověď API. */
	reason: string;
};

/**
 * Vrátí `null`, když adresa smí do administrace, jinak důvod odmítnutí.
 *
 * `emailVerified` přichází z Googlu — neověřenou adresu nebereme, protože
 * jinak by stačilo si u cizího poskytovatele nastavit adresu na doméně
 * organizace.
 */
export function denyAccess(
	email: string | null | undefined,
	emailVerified?: boolean,
): AccessDenial | null {
	if (!email) {
		return { reason: 'Účet nemá e-mailovou adresu.' };
	}

	const normalized = email.trim().toLowerCase();

	if (emailVerified === false) {
		return { reason: `Adresa ${normalized} není u Googlu ověřená.` };
	}

	if (!normalized.endsWith(`@${allowedDomain}`)) {
		return { reason: `Adresa ${normalized} není na doméně ${allowedDomain}.` };
	}

	const allowlist = readAllowlist();

	if (allowlist.length === 0) {
		return {
			reason:
				'AUTH_ALLOWED_EMAILS je prázdné, takže do administrace nesmí nikdo. ' +
				'Doplňte adresy oddělené čárkou a restartujte Node proces.',
		};
	}

	if (!allowlist.includes(normalized)) {
		return { reason: `Adresa ${normalized} není v AUTH_ALLOWED_EMAILS.` };
	}

	return null;
}
