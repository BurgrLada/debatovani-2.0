/**
 * Všechny cesty better-auth — přihlášení, návrat od Googla, odhlášení, relace.
 *
 * Routa je `prerender = false`, takže ji obsluhuje Node proces. Když spadne,
 * statický web běží dál a nedostupná je jen administrace (docs/06, sekce 2).
 */
import type { APIRoute } from 'astro';
import { ensureAuthSchema, getAuth } from '../../../lib/auth';

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
	// Tabulky v `auth.sqlite` vzniknou při prvním požadavku, ne při nasazení.
	// Memoizované, takže se to platí jednou za život procesu.
	await ensureAuthSchema();

	return getAuth().handler(request);
};
