import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const documentListBlockSchema: Template = {
	name: 'documentList',
	label: 'Seznam dokumentů',
	ui: { defaultItem: { items: [{ title: 'Nový dokument' }] } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{
			type: 'object',
			name: 'items',
			label: 'Dokumenty',
			list: true,
			ui: {
				defaultItem: { title: 'Nový dokument' },
				itemProps: (item: { title?: string }) => ({ label: item?.title ?? 'Dokument' }),
			},
			fields: [
				{ type: 'string', name: 'title', label: 'Název' },
				{ type: 'string', name: 'href', label: 'Odkaz na soubor' },
				{ type: 'string', name: 'note', label: 'Poznámka (platnost, verze…)' },
				{
					type: 'string',
					name: 'kind',
					label: 'Typ',
					options: [
						{ label: 'PDF', value: 'pdf' },
						{ label: 'Dokument', value: 'doc' },
						{ label: 'Tabulka', value: 'sheet' },
						{ label: 'Složka', value: 'folder' },
						{ label: 'Odkaz', value: 'link' },
					],
				},
			],
		},
		...sectionFields(),
	],
};
