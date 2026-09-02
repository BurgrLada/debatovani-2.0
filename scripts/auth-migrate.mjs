/**
 * Doplní schéma v `auth.sqlite` a skončí.
 *
 * Za normálního provozu tenhle skript potřeba není — `ensureAuthSchema()`
 * v `src/lib/auth.ts` se postará o totéž při prvním požadavku na přihlášení.
 * Hodí se při ladění nasazení, kdy je rozdíl mezi „schéma nejde vytvořit“
 * a „přihlášení nefunguje z jiného důvodu“ potřeba vidět zvlášť.
 *
 *   DATA_DIR=/var/lib/debatovani pnpm auth:migrate
 */
import { getMigrations } from 'better-auth/db/migration';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

try {
	// `.env` nemusí existovat — pak platí jen to, co je v prostředí.
	process.loadEnvFile();
} catch {}

const dir = process.env.DATA_DIR ?? '.data';
mkdirSync(dir, { recursive: true });

const file = join(dir, 'auth.sqlite');
const { toBeCreated, toBeAdded, toBeAddedIndexes, runMigrations } = await getMigrations({
	// Migrace čte ze schématu better-authu, ne z konfigurace přihlašování,
	// takže OAuth údaje tady nejsou potřeba a skript jde spustit i bez nich.
	database: new Database(file),
	secret: process.env.BETTER_AUTH_SECRET ?? 'auth-migrate',
});

if (toBeCreated.length === 0 && toBeAdded.length === 0 && toBeAddedIndexes.length === 0) {
	console.log(`${file}: schéma je aktuální, není co dělat.`);
	process.exit(0);
}

console.log(
	`${file}: ${toBeCreated.length} tabulek, ${toBeAdded.length} sloupců, ` +
		`${toBeAddedIndexes.length} indexů.`,
);

await runMigrations();

console.log('Hotovo.');
