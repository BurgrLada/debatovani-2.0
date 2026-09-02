/**
 * Kde leží data, která nejsou v gitu.
 *
 * Projekt nemá databázový server. Obojí, co si administrace potřebuje
 * pamatovat, žije jako SQLite soubor — ale ve **dvou různých adresářích**,
 * protože každý z těch souborů má jinou životnost:
 *
 *  - `auth.sqlite` v **`DATA_DIR`** — účty a relace better-auth
 *    (`src/lib/auth.ts`). Odvozený z ničeho není: když se ztratí, redakce se
 *    odhlásí a účty vzniknou znovu při dalším přihlášení. **V produkci proto
 *    `DATA_DIR` patří na persistentní volume.**
 *  - `index-<větev>.sqlite` v **`INDEX_DIR`** — index obsahu pro TinaCMS
 *    (`sqlite-level`, viz `tina/database.ts`). Obsah v něm není, ten zůstává
 *    v gitu, takže je to **čistý artefakt buildu**: vzniká při `tinacms build`
 *    a ztráta znamená přeindexování, ne ztrátu dat.
 *
 * Rozdělení není kosmetické. Kdyby index ležel na sdíleném volume, dva
 * kontejnery při rolling update (Coolify pouští nový vedle starého) by sáhly
 * na týž soubor — a nový by ten starý přepsal verzí z buildu i s jeho
 * žurnálem. Když má každý kontejner index u sebe, tenhle překryv nikoho
 * nezajímá a na volume zbude jediný soubor, který je opravdu potřeba udržet.
 *
 * `INDEX_DIR` je nepovinný; bez něj se index drží vedle účtů, což je při
 * vývoji to pohodlnější uspořádání.
 */
import './env';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

/**
 * Adresář s účty a relacemi. Vytvoří se, když neexistuje — `better-sqlite3`
 * nadřazenou složku nezakládá a selhal by až otevřením souboru.
 *
 * Výchozí `.data` je pro vývoj; v produkci se `DATA_DIR` nastavuje výslovně
 * a míří na persistentní volume.
 */
export function dataDir(): string {
	const dir = process.env.DATA_DIR ?? '.data';

	mkdirSync(dir, { recursive: true });

	return dir;
}

/** Adresář s indexem. Bez `INDEX_DIR` splývá s `DATA_DIR`. */
export function indexDir(): string {
	const dir = process.env.INDEX_DIR;

	if (!dir) {
		return dataDir();
	}

	mkdirSync(dir, { recursive: true });

	return dir;
}

/**
 * Soubor s indexem obsahu pro danou větev.
 *
 * Větev je v názvu souboru, ne uvnitř: `SqliteLevel` nemá obdobu
 * `collectionName`, kterou k oddělení větví používal `MongodbLevel`. Míchat
 * větve v jednom souboru by šlo (`createDatabase` klíče prefixuje přes
 * `namespace`), ale samostatný soubor jde zahodit bez ohledu na ostatní.
 */
export function indexPath(branch: string): string {
	return join(indexDir(), `index-${branch}.sqlite`);
}

let authDb: Database.Database | undefined;

/**
 * Připojení k `auth.sqlite`.
 *
 * Vzniká líně, protože modul se načte i při statickém buildu, kde se
 * přihlašování neúčastní a zakládat kvůli němu soubor nemá smysl.
 *
 * Instance se předává better-authu přímo — ten si nad ní složí `SqliteDialect`
 * sám a **zapne transakce**, což samostatně běžící MongoDB neuměla.
 */
export function getAuthDb(): Database.Database {
	authDb ??= new Database(join(dataDir(), 'auth.sqlite'));

	return authDb;
}
