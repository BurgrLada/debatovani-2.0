import type { Template } from 'tinacms';
import { alignField, buttonListField, sectionFields } from './_shared';

export const buttonsBlockSchema: Template = {
	name: 'buttons',
	label: 'Tlačítka',
	ui: { defaultItem: { align: 'center', items: [{ label: 'Zjistit více', href: '/', variant: 'sky' }] } },
	fields: [buttonListField('items', 'Tlačítka'), alignField(), ...sectionFields()],
};
