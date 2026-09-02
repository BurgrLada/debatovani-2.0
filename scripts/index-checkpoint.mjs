/**
 * Složí WAL indexu do hlavního souboru, aby se dal přenést jako jeden kus.
 *
 * `sqlite-level` jede v režimu WAL a po skončení buildu zůstávají vedle
 * `index-<větev>.sqlite` ještě `-wal` a `-shm`. **Zápisy z posledního běhu
 * jsou v tu chvíli jen ve WAL**, takže zkopírovat samotný `.sqlite` znamená
 * přenést neúplný index — změřeno na tomhle projektu: 4 903 z 5 513 záznamů.
 *
 * `wal_checkpoint(TRUNCATE)` WAL zapíše do hlavního souboru a vyprázdní ho.
 * Po něm je `index-<větev>.sqlite` úplný a je to jediný soubor, který se
 * nasazuje (docs/16, varianta A).
 *
 * Pouští se automaticky na konci `pnpm build`. Když index neexistuje
 * (lokální build ho nezakládá), skript mlčky skončí.
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

try {
	// `.env` nemusí existovat — pak platí jen to, co je v prostředí.
	process.loadEnvFile();
} catch {}

const branch =
	process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main';

const file = join(process.env.DATA_DIR ?? '.data', `index-${branch}.sqlite`);

if (!existsSync(file)) {
	process.exit(0);
}

// Zápisové připojení: samotné otevření nedokončený WAL obnoví, pragma pak
// dorovná zbytek. Proto se nekontrolují vrácená čísla (po obnovení při
// otevření bývají nulová), ale výsledek — jestli WAL zmizel.
const db = new Database(file);
const { busy } = db.pragma('wal_checkpoint(TRUNCATE)', { simple: false })[0];
db.close();

const leftover = existsSync(`${file}-wal`) && statSync(`${file}-wal`).size > 0;

if (busy || leftover) {
	console.error(
		`[index] ${file}: checkpoint neproběhl celý — do souboru nejspíš zapisuje ` +
			'někdo další. Nasazovat ho takhle nelze, WAL by zůstal stranou ' +
			'a index by byl neúplný.',
	);
	process.exit(1);
}

const mb = (statSync(file).size / 1024 / 1024).toFixed(1);

console.log(`[index] ${file}: WAL složen, index je jeden soubor o ${mb} MB.`);
