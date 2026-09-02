/**
 * Kdo je přihlášený redaktor v právě obsluhovaném požadavku.
 *
 * Obsah i média commituje **servisní účet**, jehož token je
 * v `GITHUB_PERSONAL_ACCESS_TOKEN`, takže autor commitu je vždy tentýž
 * a v historii repozitáře nejde poznat, který redaktor co změnil. Doplnit
 * to do zprávy commitu je nejlevnější způsob, jak tu informaci nezahodit
 * ([docs/15](../../docs/15-tinacms-vs-decap.md), sekce 8, bod 2).
 *
 * Problém je, že místo, kde se commit skládá, je od přihlášení daleko:
 * `GitProvider.onPut()` dostane jen cestu a obsah. Předávat redaktora přes
 * argumenty by znamenalo protáhnout ho půlkou TinaCMS. `AsyncLocalStorage`
 * ho místo toho nese kontextem požadavku — routa ho nastaví, git provider
 * si ho vyzvedne, a mezi souběžnými požadavky se to neplete.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export type Editor = { name?: string | null; email: string };

/**
 * Ve schránce, ne přímo: u Tina API se autorizace odehrává **uvnitř** jejího
 * handleru, takže v okamžiku otevření kontextu se ještě neví, kdo požadavek
 * poslal. Schránka se proto otevře prázdná a doplní se, jakmile to autorizace
 * zjistí.
 */
type Holder = { editor?: Editor };

const storage = new AsyncLocalStorage<Holder>();

/** Obalí obsluhu požadavku, u kterého je redaktor známý předem. */
export function runAsEditor<T>(editor: Editor, fn: () => T): T {
	return storage.run({ editor }, fn);
}

/** Otevře kontext, do kterého se redaktor doplní až během obsluhy. */
export function runWithEditor<T>(fn: () => T): T {
	return storage.run({}, fn);
}

export function setEditor(editor: Editor): void {
	const holder = storage.getStore();

	if (holder) {
		holder.editor = editor;
	}
}

export function currentEditor(): Editor | undefined {
	return storage.getStore()?.editor;
}

/**
 * Zpráva commitu s podpisem redaktora.
 *
 * Podpis je na samostatném řádku pod prázdným, takže z něj je v gitu tělo
 * commitu a dá se na něj grepovat (`git log --grep`). Když se redaktora
 * nepodaří zjistit — třeba u zápisu z lokálního režimu — zůstane jen
 * shrnutí, aby zpráva nikdy nelhala o tom, kdo za změnou stojí.
 */
export function commitMessage(summary: string): string {
	const editor = currentEditor();

	if (!editor) {
		return summary;
	}

	const who = editor.name ? `${editor.name} <${editor.email}>` : editor.email;

	return `${summary}\n\nUpravil: ${who}`;
}
