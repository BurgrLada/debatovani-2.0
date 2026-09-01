import { defineConfig, LocalAuthProvider } from 'tinacms';
import { GoogleWorkspaceAuthProvider } from './auth-provider';
import { PageCollection } from './collections/page';
import { ArticleCollection } from './collections/article';
import { ProjectCollection } from './collections/project';
import { PersonCollection } from './collections/person';
import { ClubCollection } from './collections/club';
import { PartnerCollection } from './collections/partner';
import { GlobalCollection } from './collections/global';

const branch =
	process.env.GITHUB_BRANCH ||
	process.env.VERCEL_GIT_COMMIT_REF ||
	process.env.HEAD ||
	'main';

/**
 * Lokální režim (`pnpm dev`): obsah se čte a zapisuje přímo v pracovní kopii,
 * bez databáze a bez přihlašování. Ve všech ostatních případech běží
 * self-hosted backend — `src/pages/api/tina/[...routes].ts` a `database.ts`.
 */
const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

export default defineConfig({
	branch,

	// Obsah se neukládá do Tina Cloudu, ale přes vlastní backend v tomhle
	// projektu — administrace tedy nemluví s ničím cizím. Platí to i při
	// vývoji, aby se lokálně jezdilo po stejné cestě jako v produkci.
	// Serverový kód tuhle adresu nepoužívá, ten čte databázi přímo
	// (`src/lib/data.ts`).
	contentApiUrlOverride: '/api/tina/gql',
	authProvider: isLocal ? new LocalAuthProvider() : new GoogleWorkspaceAuthProvider(),

	build: { outputFolder: 'admin', publicFolder: 'public' },

	media: {
		tina: {
			// Média jdou do gitu vedle obsahu. 1 377 souborů z WordPressu se
			// nepřenáší celé — migruje se jen to, na co obsah opravdu odkazuje.
			mediaRoot: 'media',
			publicFolder: 'public',
		},
	},

	schema: {
		collections: [
			PageCollection,
			ArticleCollection,
			ProjectCollection,
			PersonCollection,
			ClubCollection,
			PartnerCollection,
			GlobalCollection,
		],
	},
});
