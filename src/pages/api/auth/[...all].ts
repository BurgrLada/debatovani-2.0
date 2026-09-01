/**
 * Všechny cesty better-auth — přihlášení, návrat od Googla, odhlášení, relace.
 *
 * Routa je `prerender = false`, takže ji obsluhuje Node proces. Když spadne,
 * statický web běží dál a nedostupná je jen administrace (docs/06, sekce 2).
 */
import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/auth';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => getAuth().handler(request);
