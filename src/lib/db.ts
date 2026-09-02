/**
 * Kde leží data, která nejsou v gitu.
 *
 * Projekt nemá databázový server. Obojí, co si administrace potřebuje
 * pamatovat, žije jako SQLite soubor v jednom adresáři (`DATA_DIR`):
 *
 *  - `index-<větev>.sqlite` — **index obsahu pro TinaCMS** (`sqlite-level`,
 *    viz `tina/database.ts`). Obsah samotný v něm není, ten zůstává v gitu,
 *    takže ztráta indexu znamená přeindexování, ne ztrátu dat.
 *  - `auth.sqlite` — **účty a relace better-auth** (`src/lib/auth.ts`).
 *    Tenhle soubor odvozený z ničeho není; když se ztratí, redakce se
 *    odhlásí a účty vzniknou znovu při dalším přihlášení.
 *
 * V produkci proto musí `DATA_DIR` ležet na persistentním volume. Na
 * ephemerálním kontejneru by se index po každém startu stavěl znovu
 * a přihlášení by nepřežilo restart.
 *
 * Rozdělení do dvou souborů je schválné: index je zahoditelný a při buildu
 * se přepisuje celý, relace ne. Sdílet jeden soubor by znamenalo, že se obojí
 * musí zálohovat stejně opatrně.
 */
import './env';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

/**
 * Adresář s daty. Vytvoří se, když neexistuje — `better-sqlite3` nadřazenou
 * složku nezakládá a selhal by až otevřením souboru.
 *
 * Výchozí `.data` je pro vývoj; v produkci se `DATA_DIR` nastavuje výslovně.
 */
export function dataDir(): string {
	const dir = process.env.DATA_DIR ?? '.data';

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
	return join(dataDir(), `index-${branch}.sqlite`);
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
