import type { Template } from 'tinacms';
import { anchorField, buttonListField } from './_shared';

export const heroBlockSchema: Template = {
	name: 'hero',
	label: 'Hero (úvodní pás)',
	ui: {
		defaultItem: {
			eyebrow: 'Jsme asociace debatních klubů',
			headline: 'Učíme nejen mluvit,\nale i přemýšlet.',
			overlay: true,
			height: 'tall',
		},
	},
	fields: [
		{ type: 'string', name: 'eyebrow', label: 'Popisek nad nadpisem' },
		{
			type: 'string',
			name: 'headline',
			label: 'Hlavní nadpis',
			ui: { component: 'textarea' },
			description: 'Zalomení řádku respektuje odřádkování v textu.',
		},
		{ type: 'string', name: 'subtitle', label: 'Podtitulek', ui: { component: 'textarea' } },
		{
			type: 'string',
			name: 'align',
			label: 'Zarovnání',
			options: [
				{ label: 'Vlevo', value: 'left' },
				{ label: 'Na střed', value: 'center' },
			],
		},
		{ type: 'image', name: 'image', label: 'Obrázek na pozadí' },
		{ type: 'boolean', name: 'overlay', label: 'Ztmavit obrázek' },
		{
			type: 'string',
			name: 'height',
			label: 'Výška',
			options: [
				{ label: 'Nízký', value: 'short' },
				{ label: 'Střední', value: 'medium' },
				{ label: 'Vysoký', value: 'tall' },
			],
		},
		buttonListField(),
		{
			type: 'object',
			name: 'notice',
			label: 'Zvýrazněné oznámení',
			description: 'Samostatný proužek pod tlačítky — např. pozvánka na nejbližší akci.',
			fields: [
				{ type: 'string', name: 'label', label: 'Text' },
				{ type: 'string', name: 'href', label: 'Odkaz' },
				{
					type: 'boolean',
					name: 'useNextEvent',
					label: 'Doplnit nejbližší akci automaticky',
					description:
						'Za text se doplní název a termín nejbližší akce z debata21 a odkaz povede na přihlášku. Když žádná akce neběží, proužek se nezobrazí.',
				},
			],
		},
		anchorField(),
	],
};
