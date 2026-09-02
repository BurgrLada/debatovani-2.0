/**
 * Index TinaCMS pro self-hosted režim.
 *
 * Rozdělení odpovědnosti: **obsah je v gitu**, index drží jen to, z čeho se
 * odpovídá na dotazy administrace. Když se index ztratí, přeindexuje se
 * z repozitáře — dělá to `tinacms build` před každým `astro build`.
 *
 * Index není databázový server, ale soubor v `DATA_DIR` (`src/lib/db.ts`).
 * K provozu tak stačí jediný Node proces; zdůvodnění je v docs/16.
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
import { SqliteLevel } from 'sqlite-level';
import { indexPath } from '../src/lib/db';

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
			databaseAdapter: new SqliteLevel<string, Record<string, any>>({
				filename: indexPath(branch),
			}),
			// Index se drží po větvích, aby se obsah z různých větví nemíchal.
			// Vedle prefixu klíčů je větev i v názvu souboru — viz `indexPath()`.
			namespace: branch,
		});
