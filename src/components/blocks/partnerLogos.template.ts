import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const partnerLogosBlockSchema: Template = {
	name: 'partnerLogos',
	label: 'Loga partnerů',
	ui: { defaultItem: { title: 'Podporují nás' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{
			type: 'object',
			name: 'items',
			label: 'Loga',
			list: true,
			ui: {
				defaultItem: { name: 'Partner' },
				itemProps: (item: { name?: string }) => ({ label: item?.name ?? 'Logo' }),
			},
			fields: [
				{ type: 'image', name: 'logo', label: 'Logo' },
				{ type: 'string', name: 'name', label: 'Název' },
				{ type: 'string', name: 'href', label: 'Odkaz' },
			],
		},
		...sectionFields(),
	],
};
