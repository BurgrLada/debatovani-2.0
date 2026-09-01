/**
 * Připojení k MongoDB.
 *
 * Jedna databáze slouží dvěma věcem: drží **index obsahu pro TinaCMS**
 * (přes `mongodb-level`, viz `tina/database.ts`) a **účty a relace
 * better-auth**. Obsah samotný v databázi není — ten zůstává v gitu — takže
 * ztráta databáze znamená přeindexování a odhlášení, ne ztrátu dat.
 *
 * Klienta si `mongodb-level` otevírá vlastního (dostává jen URI), tady je
 * připojení pro better-auth. Vzniká líně, protože modul se načte i při
 * statickém buildu, kde proměnné prostředí pro databázi být nemusí.
 */
import './env';
import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | undefined;
let db: Db | undefined;

export function mongoUri(): string {
	const uri = process.env.MONGODB_URI;

	if (!uri) {
		throw new Error('Chybí MONGODB_URI — bez něj neběží ani index Tiny, ani přihlášení.');
	}

	return uri;
}

export function mongoDbName(): string {
	return process.env.MONGODB_DB ?? 'debatovani';
}

/**
 * Sdílený klient. Driver se připojuje sám a spojení drží v poolu, takže se
 * `connect()` nevolá — opakované volání by jen zdržovalo první požadavek.
 */
export function getMongo(): { client: MongoClient; db: Db } {
	if (!client || !db) {
		client = new MongoClient(mongoUri());
		db = client.db(mongoDbName());
	}

	return { client, db };
}

/**
 * Transakce vyžadují replica set. Samostatně běžící MongoDB je neumí, a to je
 * na vlastním serveru běžný stav — proto se zapínají výslovně.
 */
export function mongoTransactionsEnabled(): boolean {
	return process.env.MONGODB_TRANSACTIONS === 'true';
}
