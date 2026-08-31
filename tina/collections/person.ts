import type { Collection } from 'tinacms';

/** Lidé v ADK — dnes ručně vypsaní na stránce /o-nas/lide/. */
export const PersonCollection: Collection = {
	name: 'person',
	label: 'Lidé',
	path: 'src/content/person',
	format: 'json',
	fields: [
		{ type: 'string', name: 'name', label: 'Jméno', isTitle: true, required: true },
		{ type: 'string', name: 'role', label: 'Role' },
		{
			type: 'string',
			name: 'group',
			label: 'Orgán / skupina',
			description: 'Např. Výkonná rada, Kancelář, Revizní komise.',
		},
		{ type: 'image', name: 'photo', label: 'Fotka' },
		{ type: 'string', name: 'email', label: 'E-mail' },
		{ type: 'string', name: 'bio', label: 'Krátký text', ui: { component: 'textarea' } },
		{ type: 'number', name: 'order', label: 'Pořadí' },
	],
};
