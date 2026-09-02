/**
 * Přihlašování do administrace — better-auth s jediným poskytovatelem: Google.
 *
 * Organizace má všechny adresy v Google Workspace na doméně `debatovani.cz`,
 * takže se nezakládají žádná hesla a odchod člověka z organizace mu přístup
 * odebere sám. Proti původnímu plánu (GitHub OAuth, docs/06 sekce 6 bod 4) to
 * navíc nevyžaduje, aby redakce měla účty na GitHubu.
 *
 * Přístup hlídají tři nezávislé vrstvy:
 *  1. **Consent screen typu Internal** v Google Cloudu — Google sám nepustí
 *     dál účet mimo organizaci a aplikace nepotřebuje jeho verifikaci.
 *  2. **`hd`** níže — better-auth pošle doménu Googlu jako `hd` a zároveň ji
 *     ověří proti claimu `hd` ve vráceném ID tokenu. Není to jen nápověda
 *     v URL: přihlášení bez odpovídajícího claimu se odmítne.
 *  3. **Allowlist** v `src/lib/access.ts` — kdo z domény smí do administrace.
 *
 * Modul se načítá i při statickém buildu, kde přihlašovací údaje k dispozici
 * být nemusí, proto instance vzniká líně přes `getAuth()`.
 */
import './env';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { allowedDomain, denyAccess } from './access';
import { getAuthDb } from './db';
import type { Editor } from './editor';

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Chybí proměnná prostředí ${name} — bez ní se nedá přihlásit do administrace.`);
	}

	return value;
}

/**
 * Konfigurace na jednom místě, protože ji potřebují dva: `betterAuth()` níž
 * a `getMigrations()` v `ensureAuthSchema()`. Návratový typ je uvedený
 * výslovně — bez něj se odvodí z literálu a `betterAuth()` pak neuzná
 * databázový adaptér.
 */
function authOptions(): BetterAuthOptions {
	return {
		baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? 'http://localhost:4321',
		secret: requireEnv('BETTER_AUTH_SECRET'),
		basePath: '/api/auth',

		// Instance `better-sqlite3` se předává rovnou. better-auth ji pozná,
		// složí si nad ní `SqliteDialect` a zapne transakce — na rozdíl od
		// samostatně běžící MongoDB, kde se musely vypínat.
		database: getAuthDb(),

		// Hesla se nezakládají. Jediná cesta dovnitř je pracovní účet Googlu.
		emailAndPassword: { enabled: false },

		socialProviders: {
			google: {
				clientId: requireEnv('GOOGLE_CLIENT_ID'),
				clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
				hd: allowedDomain,
				// Redakce se do administrace vrací zřídka a lidé bývají přihlášení
				// pod víc účty najednou; bez výběru by se Google tiše přihlásil tím
				// posledním použitým, což je u soukromého účtu matoucí.
				prompt: 'select_account',
			},
		},

		// Účet nejde spárovat s jiným poskytovatelem — dvojí cesta dovnitř
		// by obcházela kontrolu domény.
		account: { accountLinking: { enabled: false } },

		databaseHooks: {
			user: {
				create: {
					/**
					 * Cizí účet se nemá ani založit. Kontrola se opakuje při každém
					 * požadavku na Tina API — tohle je jen první, ne jediná obrana.
					 */
					before: async (user) => {
						const denial = denyAccess(user.email, user.emailVerified);

						if (denial) {
							console.warn(`[auth] Odmítnuté přihlášení: ${denial.reason}`);
							throw new APIError('FORBIDDEN', {
								message: 'Tenhle účet nemá přístup do administrace webu.',
							});
						}

						return { data: user };
					},
				},
			},
		},
	};
}

function createAuth() {
	return betterAuth(authOptions());
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
	auth ??= createAuth();

	return auth;
}

export type EditorDenial = { status: number; message: string };

export type EditorAuth =
	| { ok: true; editor: Editor }
	| ({ ok: false } & EditorDenial);

/**
 * Ověří, že požadavek nese relaci redaktora, který smí do administrace,
 * a vrátí, kdo to je — podpis pak jde do zprávy commitu (`src/lib/editor.ts`).
 *
 * Sdílí to Tina API (`src/pages/api/tina/[...routes].ts`) i knihovna médií
 * (`src/pages/api/media/[...path].ts`). Kontrola allowlistu se opakuje při
 * každém požadavku — účet už může mít rozběhnutou relaci, ale mezitím
 * vypadnout z `AUTH_ALLOWED_EMAILS`; bez toho by odebrání ze seznamu
 * zabralo až vypršením relace.
 */
export async function authorizeEditor(headers: Headers): Promise<EditorAuth> {
	await ensureAuthSchema();

	const session = await getAuth().api.getSession({ headers });

	if (!session) {
		return { ok: false, status: 401, message: 'Nepřihlášeno.' };
	}

	const denial = denyAccess(session.user.email, session.user.emailVerified);

	if (denial) {
		console.warn(`[auth] Odmítnutý požadavek: ${denial.reason}`);

		return {
			ok: false,
			status: 403,
			message: 'Tenhle účet nemá přístup do administrace webu.',
		};
	}

	return { ok: true, editor: { name: session.user.name, email: session.user.email } };
}

let schemaReady: Promise<void> | undefined;

/**
 * Založí v `auth.sqlite` tabulky, které tam ještě nejsou.
 *
 * S MongoDB tenhle krok nebyl potřeba — dokumentová databáze si kolekce
 * vyrobila zápisem. SQLite schéma mít musí, a `getMigrations()` ho umí
 * doplnit: introspektuje, co chybí, a je idempotentní.
 *
 * Volá se z obou asynchronních vstupů, kde se relace poprvé čte
 * (`src/pages/api/auth/[...all].ts` a autorizace v
 * `src/pages/api/tina/[...routes].ts`). Samostatný příkaz při nasazení by
 * fungoval taky, ale je to krok, na který se dá zapomenout — a projevilo by
 * se to až selháním přihlášení. Promise je memoizovaná, takže se migrace
 * spustí jednou za život procesu a každé další čekání je zadarmo.
 */
export function ensureAuthSchema(): Promise<void> {
	schemaReady ??= (async () => {
		const { getMigrations } = await import('better-auth/db/migration');
		const { toBeCreated, toBeAdded, toBeAddedIndexes, runMigrations } =
			await getMigrations(authOptions());

		if (toBeCreated.length === 0 && toBeAdded.length === 0 && toBeAddedIndexes.length === 0) {
			return;
		}

		console.info(
			`[auth] Doplňuji schéma: ${toBeCreated.length} tabulek, ` +
				`${toBeAdded.length} sloupců, ${toBeAddedIndexes.length} indexů.`,
		);

		await runMigrations();
	})().catch((error) => {
		// Bez schématu se nikdo nepřihlásí, ale zapamatovat si selhání natrvalo
		// by znamenalo, že se to nezkusí ani po opravě příčiny (třeba práv
		// k adresáři). Další požadavek proto začne nanovo.
		schemaReady = undefined;
		throw error;
	});

	return schemaReady;
}
