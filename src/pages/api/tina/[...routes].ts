/**
 * Backend TinaCMS — jediné místo, kudy administrace čte a zapisuje obsah.
 *
 * Tina dodává handler psaný pro Node API (`IncomingMessage`/`ServerResponse`),
 * kdežto Astro pracuje s `Request`/`Response`. Handler je ale nenáročný: čte
 * `req.url`, `req.method`, `req.headers` a už rozparsované `req.body`, a
 * odpovídá přes `res.statusCode`, `res.write()` a `res.end()`. Proto stačí
 * tenký překlad níž místo skutečného Node serveru vedle Astra.
 *
 * Autorizace je tady, ne v administraci: `/admin/index.html` je statický
 * soubor, který si stáhne kdokoli, ale bez platné relace z něj nejde přečíst
 * ani uložit nic.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { APIRoute } from 'astro';
import {
	TinaNodeBackend,
	LocalBackendAuthProvider,
	type BackendAuthProvider,
} from '@tinacms/datalayer';
import databaseClient from '../../../../tina/__generated__/databaseClient';
import { ensureAuthSchema, getAuth } from '../../../lib/auth';
import { denyAccess } from '../../../lib/access';

export const prerender = false;

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

/**
 * Relace z better-auth. Kontrola allowlistu se opakuje i tady — účet už může
 * existovat a mít rozběhnutou relaci, ale mezitím vypadnout z
 * `AUTH_ALLOWED_EMAILS`. Bez téhle druhé kontroly by odebrání ze seznamu
 * zabralo až vypršením relace.
 */
const BetterAuthBackend = (): BackendAuthProvider => ({
	isAuthorized: async (req) => {
		await ensureAuthSchema();

		const session = await getAuth().api.getSession({
			headers: new Headers(req.headers as Record<string, string>),
		});

		if (!session) {
			return {
				isAuthorized: false,
				errorCode: 401,
				errorMessage: 'Nepřihlášeno.',
			};
		}

		const denial = denyAccess(session.user.email, session.user.emailVerified);

		if (denial) {
			console.warn(`[tina] Odmítnutý požadavek: ${denial.reason}`);

			return {
				isAuthorized: false,
				errorCode: 403,
				errorMessage: 'Tenhle účet nemá přístup do administrace webu.',
			};
		}

		// Tina předá uživatele dál do GraphQL vrstvy.
		(req as IncomingMessage & { session?: unknown }).session = {
			user: { name: session.user.name, email: session.user.email },
		};

		return { isAuthorized: true };
	},
});

const handler = TinaNodeBackend({
	authProvider: isLocal ? LocalBackendAuthProvider() : BetterAuthBackend(),
	databaseClient,
});

export const ALL: APIRoute = async ({ request, url }) => {
	const headers = Object.fromEntries(request.headers);

	// Handler si z `host` skládá absolutní URL, aby z cesty vytáhl název routy.
	headers.host ??= url.host;

	const req = {
		url: url.pathname + url.search,
		method: request.method,
		headers,
		// Tina očekává tělo už rozparsované — v Node by to udělal body parser.
		body: request.method === 'POST' ? await request.json().catch(() => undefined) : undefined,
	} as unknown as IncomingMessage;

	const chunks: string[] = [];
	let finished: () => void;
	const done = new Promise<void>((resolve) => {
		finished = resolve;
	});

	const res = {
		statusCode: 200,
		write(chunk: unknown) {
			chunks.push(String(chunk));
			return true;
		},
		end(chunk?: unknown) {
			if (chunk !== undefined) {
				chunks.push(String(chunk));
			}
			finished();
			return res;
		},
		setHeader() {
			return res;
		},
	};

	await handler(req, res as unknown as ServerResponse);
	await done;

	return new Response(chunks.join(''), {
		status: res.statusCode,
		headers: { 'content-type': 'application/json' },
	});
};
