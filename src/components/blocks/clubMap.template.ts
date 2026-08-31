import type { Template } from 'tinacms';
import { buttonListField, headingFields, sectionFields } from './_shared';

export const clubMapBlockSchema: Template = {
	name: 'clubMap',
	label: 'Mapa debatních klubů',
	ui: {
		defaultItem: {
			title: 'Mapa debatních klubů',
			showMarkers: true,
			showList: false,
			imagePosition: 'right',
			imageWidth: 'two-thirds',
			bounds: { west: 11.96, east: 19.25, south: 48.3, north: 51.3 },
		},
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'rich-text', name: 'body', label: 'Text' },
		buttonListField(),

		{
			type: 'image',
			name: 'image',
			label: 'Podkladová mapa',
			description: 'Obrázek mapy, do kterého se vykreslí body debatních klubů.',
		},
		{
			type: 'boolean',
			name: 'showMarkers',
			label: 'Vykreslit body klubů',
			description:
				'Body se berou z kolekce Debatní kluby — zobrazí se každý aktivní klub, který má vyplněnou zeměpisnou šířku a délku.',
		},
		{
			type: 'object',
			name: 'bounds',
			label: 'Rozsah mapy',
			description:
				'Zeměpisné okraje podkladového obrázku — tedy jeho krajů, ne kresby uvnitř. Podle nich se počítá, kam bod padne. Výchozí hodnoty jsou změřené z dodané mapy ČR.',
			fields: [
				{ type: 'number', name: 'west', label: 'Západní okraj (délka)' },
				{ type: 'number', name: 'east', label: 'Východní okraj (délka)' },
				{ type: 'number', name: 'south', label: 'Jižní okraj (šířka)' },
				{ type: 'number', name: 'north', label: 'Severní okraj (šířka)' },
			],
		},
		{
			type: 'string',
			name: 'imagePosition',
			label: 'Mapa',
			options: [
				{ label: 'Vpravo', value: 'right' },
				{ label: 'Vlevo', value: 'left' },
				{ label: 'Přes celou šířku', value: 'full' },
			],
		},
		{
			type: 'string',
			name: 'imageWidth',
			label: 'Šířka mapy',
			options: [
				{ label: 'Poloviční', value: 'half' },
				{ label: 'Dvě třetiny', value: 'two-thirds' },
			],
		},

		{
			type: 'string',
			name: 'embedUrl',
			label: 'Vložená mapa (URL)',
			description:
				'Adresa vložení Google My Maps. Použije se místo podkladového obrázku, když je vyplněná.',
		},
		{ type: 'boolean', name: 'showList', label: 'Vypsat pod mapou seznam klubů' },
		...sectionFields(),
	],
};
