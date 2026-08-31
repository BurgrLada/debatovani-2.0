import { defineConfig } from 'tinacms';
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

export default defineConfig({
	branch,

	// Bez těchto proměnných běží Tina v lokálním režimu (`tinacms dev`):
	// obsah čte a zapisuje přímo do gitu, bez cloudu a bez databáze.
	// Self-hosted backend (GitHub OAuth + index) přijde na řadu při nasazení
	// — viz docs/06, sekce 6.
	clientId: process.env.PUBLIC_TINA_CLIENT_ID,
	token: process.env.TINA_TOKEN,

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
