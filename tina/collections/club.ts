import type { Collection } from 'tinacms';

/**
 * Debatní kluby.
 *
 * Data dnes existují jen v Google My Maps (docs/04, otázka 13). Schéma je
 * navržené dopředu, naplní se postupně.
 */
export const ClubCollection: Collection = {
	name: 'club',
	label: 'Debatní kluby',
	path: 'src/content/club',
	format: 'json',
	fields: [
		{ type: 'string', name: 'name', label: 'Název klubu', isTitle: true, required: true },
		{ type: 'string', name: 'school', label: 'Škola' },
		{ type: 'string', name: 'city', label: 'Město' },
		{ type: 'string', name: 'region', label: 'Kraj' },
		{ type: 'number', name: 'lat', label: 'Zeměpisná šířka' },
		{ type: 'number', name: 'lng', label: 'Zeměpisná délka' },
		{
			type: 'string',
			name: 'kind',
			label: 'Typ',
			options: [
				{ label: 'Střední škola', value: 'ss' },
				{ label: 'Základní škola', value: 'zs' },
				{ label: 'Online', value: 'online' },
			],
		},
		{ type: 'string', name: 'contactName', label: 'Kontaktní osoba' },
		{ type: 'string', name: 'email', label: 'E-mail' },
		{ type: 'string', name: 'website', label: 'Web' },
		{ type: 'boolean', name: 'active', label: 'Aktivní' },
	],
};
