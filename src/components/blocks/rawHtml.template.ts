import type { Template } from 'tinacms';
import { sectionFields } from './_shared';

export const rawHtmlBlockSchema: Template = {
	name: 'rawHtml',
	label: 'Vlastní HTML',
	ui: { itemProps: (item: { note?: string }) => ({ label: item?.note || 'Vlastní HTML' }) },
	fields: [
		{
			type: 'string',
			name: 'note',
			label: 'K čemu to je',
			description: 'Jen popisek pro editor, na stránce se nezobrazí.',
		},
		{
			type: 'string',
			name: 'html',
			label: 'HTML',
			ui: { component: 'textarea' },
			description:
				'Vloží se na stránku beze změny. Skripty odsud běží s plnými právy stránky — vkládejte jen kód, kterému rozumíte.',
		},
		...sectionFields(),
	],
};
