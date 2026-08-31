#!/usr/bin/env node
/**
 * Vytáhne lidi ze stránky `/o-nas/lide/` do kolekce `person`.
 *
 * Obecná migrace stránek z nich udělá řadu samostatných obrázků a nadpisů —
 * použitelné, ale ne strukturovaná data. Lidé se přitom mění několikrát
 * ročně a patří do vlastní kolekce (docs/02, sekce 2), aby šli vypsat i jinde
 * než na jedné stránce.
 *
 * Skript je jednorázový pomocník k migraci, ne součást běžného provozu.
 */
import { parsePage, stripSizeSuffix } from './lib/elementor.mjs';
import { downloadMedia, writeFileEnsured, slugify } from './lib/wp.mjs';

const SOURCE = 'https://debatovani.cz/o-nas/lide/';
const OUT_DIR = 'src/content/person/cs';
const MEDIA_DIR = '/media/lide';

/** Nadpis „Předsedkyně - Barbora Lacinová“ nese roli i jméno dohromady. */
function splitRoleAndName(heading, fallbackRole) {
	const match = heading.match(/^(.+?)\s+[-–]\s+(.+)$/);
	if (match) return { role: match[1].trim(), name: match[2].trim() };
	return { role: fallbackRole ?? null, name: heading.trim() };
}

async function main() {
	const html = await fetch(SOURCE).then((response) => response.text());
	const { sections } = parsePage(html);

	const people = [];
	let group = null;
	let roleHeading = null;
	let order = 0;

	for (const section of sections) {
		for (const column of section.columns) {
			let pendingImage = null;
			let current = null;

			for (const widget of column.widgets) {
				if (widget.type === 'heading' && widget.level <= 2) {
					group = widget.text;
					roleHeading = null;
					current = null;
					continue;
				}
				if (widget.type === 'heading' && widget.level === 3) {
					// H3 je název funkce, jméno přijde až v H4 pod fotkou.
					roleHeading = widget.text;
					continue;
				}
				if (widget.type === 'image') {
					pendingImage = widget.src;
					continue;
				}
				if (widget.type === 'heading' && widget.level >= 4) {
					// Bez fotky ani názvu funkce to není člověk, ale podtitulek sekce.
					if (!pendingImage && !roleHeading) continue;

					const { role, name } = splitRoleAndName(widget.text, roleHeading);
					if (!name) continue;
					order += 1;
					current = { name, role, group, photo: pendingImage, order, bio: null };
					people.push(current);
					pendingImage = null;
					roleHeading = null;
					continue;
				}
				if (widget.type === 'text-editor' && current) {
					// Delší odstavec za jménem je životopis; krátký bývá popis orgánu.
					const isAboutPerson = current.name && widget.text.startsWith(current.name.split(' ')[0]);
					if (isAboutPerson) current.bio = widget.text;
					current = null;
				}
			}
		}
	}

	if (people.length === 0) {
		console.error('Na stránce se nepodařilo najít žádné lidi — změnila se struktura?');
		process.exitCode = 1;
		return;
	}

	for (const person of people) {
		let photo = null;
		if (person.photo) {
			const name = stripSizeSuffix(person.photo).split('/').pop();
			photo = await downloadMedia(stripSizeSuffix(person.photo), `${MEDIA_DIR}/${name}`);
			if (!photo) photo = await downloadMedia(person.photo, `${MEDIA_DIR}/${person.photo.split('/').pop()}`);
		}

		const record = {
			name: person.name,
			...(person.role ? { role: person.role } : {}),
			...(person.group ? { group: person.group } : {}),
			...(photo ? { photo } : {}),
			...(person.bio ? { bio: person.bio } : {}),
			order: person.order,
		};

		await writeFileEnsured(
			`${OUT_DIR}/${slugify(person.name)}.json`,
			`${JSON.stringify(record, null, '\t')}\n`,
		);
	}

	console.log(`Zapsáno ${people.length} osob do ${OUT_DIR}:`);
	for (const person of people) {
		console.log(`  • ${person.name}${person.role ? ` — ${person.role}` : ''} (${person.group ?? 'bez skupiny'})`);
	}
}

await main();
