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
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { allowedDomain, denyAccess } from './access';
import { getMongo, mongoTransactionsEnabled } from './mongo';

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Chybí proměnná prostředí ${name} — bez ní se nedá přihlásit do administrace.`);
	}

	return value;
}

function createAuth() {
	const { client, db } = getMongo();

	return betterAuth({
		baseURL: process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? 'http://localhost:4321',
		secret: requireEnv('BETTER_AUTH_SECRET'),
		basePath: '/api/auth',

		database: mongodbAdapter(db, {
			client,
			transaction: mongoTransactionsEnabled(),
		}),

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
	});
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
	auth ??= createAuth();

	return auth;
}
