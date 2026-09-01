/**
 * Databáze TinaCMS pro self-hosted režim.
 *
 * Rozdělení odpovědnosti se nemění: **obsah je v gitu**, databáze drží jen
 * index, ze kterého se odpovídá na dotazy administrace. Když se index ztratí,
 * přeindexuje se z repozitáře.
 *
 * Zápis jde přes GitHub API, ne přes lokální pracovní kopii — Node proces na
 * serveru nemá checkout repozitáře. Commity proto vznikají pod servisním
 * účtem, jehož token je v `GITHUB_PERSONAL_ACCESS_TOKEN`, a **v historii
 * nejsou vidět jednotliví redaktoři**. Kdo změnu provedl, se dá dohledat jen
 * v logu přihlášení. Původní plán s GitHub OAuth by autora zachoval, ale
 * vyžadoval by po redakci účty na GitHubu.
 *
 * V lokálním režimu (`TINA_PUBLIC_IS_LOCAL=true`) nic z toho neplatí: obsah
 * se čte a zapisuje přímo v pracovní kopii a index běží v paměti.
 */
import { createDatabase, createLocalDatabase } from '@tinacms/datalayer';
import { GitHubProvider } from 'tinacms-gitprovider-github';
import mongodbLevel from 'mongodb-level';

// `mongodb-level` je zabalený jako UMD a svoje exporty vystavuje až za běhu,
// takže pojmenovaný import z něj selže. Bere se přes výchozí export, kterým
// je celý `module.exports`.
const { MongodbLevel } = mongodbLevel as unknown as typeof import('mongodb-level');

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

const branch =
	process.env.GITHUB_BRANCH ||
	process.env.VERCEL_GIT_COMMIT_REF ||
	process.env.HEAD ||
	'main';

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Chybí proměnná prostředí ${name} — bez ní se obsah nemá kam ukládat.`);
	}

	return value;
}

export default isLocal
	? createLocalDatabase()
	: createDatabase({
			gitProvider: new GitHubProvider({
				owner: requireEnv('GITHUB_OWNER'),
				repo: requireEnv('GITHUB_REPO'),
				token: requireEnv('GITHUB_PERSONAL_ACCESS_TOKEN'),
				branch,
			}),
			databaseAdapter: new MongodbLevel<string, Record<string, any>>({
				collectionName: branch,
				dbName: process.env.MONGODB_DB ?? 'debatovani',
				mongoUri: requireEnv('MONGODB_URI'),
			}),
			// Index se drží po větvích, aby se obsah z různých větví nemíchal.
			namespace: branch,
		});
