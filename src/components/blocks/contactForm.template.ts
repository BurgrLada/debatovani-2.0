import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const contactFormBlockSchema: Template = {
	name: 'contactForm',
	label: 'Formulář',
	ui: { defaultItem: { title: 'Napište nám!', submitLabel: 'Odeslat', background: 'image' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'string', name: 'intro', label: 'Úvodní text', ui: { component: 'textarea' } },
		{
			type: 'string',
			name: 'action',
			label: 'Kam se formulář odesílá',
			description:
				'URL zpracování. Dokud není doplněná, formulář se vykreslí, ale odeslání je vypnuté.',
		},
		{
			type: 'object',
			name: 'fields',
			label: 'Pole formuláře',
			list: true,
			ui: {
				defaultItem: { label: 'Nové pole', name: 'pole', type: 'text' },
				itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Pole' }),
			},
			fields: [
				{ type: 'string', name: 'label', label: 'Popisek' },
				{ type: 'string', name: 'name', label: 'Název pole (bez diakritiky)' },
				{
					type: 'string',
					name: 'type',
					label: 'Typ',
					options: [
						{ label: 'Text', value: 'text' },
						{ label: 'E-mail', value: 'email' },
						{ label: 'Telefon', value: 'tel' },
						{ label: 'Delší text', value: 'textarea' },
						{ label: 'Výběr z možností', value: 'select' },
					],
				},
				{ type: 'boolean', name: 'required', label: 'Povinné' },
				{
					type: 'string',
					name: 'options',
					label: 'Možnosti',
					list: true,
					description: 'Použije se jen u typu „Výběr z možností“.',
				},
			],
		},
		{ type: 'string', name: 'submitLabel', label: 'Popisek odesílacího tlačítka' },
		{ type: 'string', name: 'note', label: 'Poznámka pod formulářem', ui: { component: 'textarea' } },
		...sectionFields(),
	],
};
