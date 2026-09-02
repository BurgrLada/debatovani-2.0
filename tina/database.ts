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
import { createDatabase, createLocalDatabase, type GitProvider } from '@tinacms/datalayer';
import { GitHubProvider } from 'tinacms-gitprovider-github';
import { SqliteLevel } from 'sqlite-level';
import { indexPath } from '../src/lib/db';
import { commitMessage } from '../src/lib/editor';
import { invalidateRenderCache } from '../src/lib/render-cache';

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

/**
 * Git provider, jehož zpráva commitu nese podpis přihlášeného redaktora.
 *
 * `GitHubProvider` bere `commitMessage` v konstruktoru, takže by pro všechny
 * commity byla stejná. Přepisovat ji na sdílené instanci před každým zápisem
 * nejde bezpečně — mezi nastavením a použitím je `await`, takže by si dva
 * souběžné požadavky mohly podpisy prohodit. Vyrábí se proto instance na
 * operaci; je to jen obal nad Octokitem, vedle síťových volání kolem to nic
 * nestojí.
 */
function signedGitProvider(): GitProvider {
	const options = {
		owner: requireEnv('GITHUB_OWNER'),
		repo: requireEnv('GITHUB_REPO'),
		token: requireEnv('GITHUB_PERSONAL_ACCESS_TOKEN'),
		branch,
	};

	const forMessage = (summary: string) =>
		new GitHubProvider({ ...options, commitMessage: commitMessage(summary) });

	// Zápis do gitu je zároveň jediné spolehlivé místo, kde se pozná, že se
	// obsah změnil — cache vykreslených stránek se proto zahazuje tady.
	// Až *po* úspěšném zápisu: kdyby commit selhal, není co invalidovat.
	return {
		onPut: async (key, value) => {
			await forMessage(`obsah: úprava ${key}`).onPut(key, value);
			invalidateRenderCache(`uložen ${key}`);
		},
		onDelete: async (key) => {
			await forMessage(`obsah: smazání ${key}`).onDelete(key);
			invalidateRenderCache(`smazán ${key}`);
		},
	};
}

export default isLocal
	? createLocalDatabase()
	: createDatabase({
			gitProvider: signedGitProvider(),
			databaseAdapter: new SqliteLevel<string, Record<string, any>>({
				filename: indexPath(branch),
			}),
			// Index se drží po větvích, aby se obsah z různých větví nemíchal.
			// Vedle prefixu klíčů je větev i v názvu souboru — viz `indexPath()`.
			namespace: branch,
		});
