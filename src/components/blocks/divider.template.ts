import type { Template } from 'tinacms';

export const dividerBlockSchema: Template = {
	name: 'divider',
	label: 'Oddělovač / mezera',
	ui: { defaultItem: { style: 'line', size: 'normal' } },
	fields: [
		{
			type: 'string',
			name: 'style',
			label: 'Podoba',
			options: [
				{ label: 'Čára', value: 'line' },
				{ label: 'Jen mezera', value: 'space' },
			],
		},
		{
			type: 'string',
			name: 'size',
			label: 'Velikost mezery',
			options: [
				{ label: 'Malá', value: 'small' },
				{ label: 'Běžná', value: 'normal' },
				{ label: 'Velká', value: 'large' },
			],
		},
	],
};
