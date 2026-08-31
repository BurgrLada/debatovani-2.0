import type { Collection } from 'tinacms';

/** Partneři a donoři — dnes ručně vypsaní na homepage. */
export const PartnerCollection: Collection = {
	name: 'partner',
	label: 'Partneři',
	path: 'src/content/partner',
	format: 'json',
	fields: [
		{ type: 'string', name: 'name', label: 'Název', isTitle: true, required: true },
		{ type: 'image', name: 'logo', label: 'Logo' },
		{ type: 'string', name: 'url', label: 'Web' },
		{
			type: 'string',
			name: 'kind',
			label: 'Typ',
			options: [
				{ label: 'Donor', value: 'donor' },
				{ label: 'Partner', value: 'partner' },
			],
		},
		{ type: 'number', name: 'order', label: 'Pořadí' },
	],
};
