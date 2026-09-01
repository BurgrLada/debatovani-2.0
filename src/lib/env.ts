/**
 * Načtení `.env` pro serverový kód.
 *
 * Astro dává obsah `.env` do `import.meta.env`, které se ale při buildu
 * nahrazuje staticky — přihlašovací údaje by skončily zapečené v sestaveném
 * souboru. Serverový kód proto čte `process.env`, kam je v produkci dodá
 * systemd nebo kontejner.
 *
 * Při vývoji žádné takové prostředí není, takže se `.env` načte tady. Import
 * tohohle modulu musí předcházet prvnímu čtení `process.env`.
 */
if (process.env.NODE_ENV !== 'production') {
	try {
		process.loadEnvFile();
	} catch {
		// `.env` nemusí existovat — pak platí jen to, co je v prostředí.
	}
}

export {};
