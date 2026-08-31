/**
 * Sdílené fragmenty Tina schématu.
 *
 * Bloky mají společné pozadí, šířku a odsazení — kdyby si to každý blok
 * definoval sám, rozejde se to při prvním rozšíření. Funkce vracejí nová
 * pole při každém volání, protože Tina si do objektů schématu zapisuje.
 */
import type { TinaField } from 'tinacms';

export const backgroundField = (): TinaField => ({
	type: 'string',
	name: 'background',
	label: 'Pozadí sekce',
	options: [
		{ label: 'Bílé', value: 'none' },
		{ label: 'Béžové', value: 'alt' },
		{ label: 'Světle limetkové', value: 'lime' },
		{ label: 'Tmavě modré', value: 'dark' },
		{ label: 'Obrázek', value: 'image' },
	],
});

export const backgroundImageFields = (): TinaField[] => [
	{
		type: 'image',
		name: 'backgroundImage',
		label: 'Obrázek na pozadí',
		description: 'Použije se, jen když je pozadí nastavené na „Obrázek“.',
	},
	{
		type: 'boolean',
		name: 'overlay',
		label: 'Ztmavit obrázek',
		description: 'Přidá přes obrázek překryv, aby byl bílý text čitelný.',
	},
	{
		type: 'string',
		name: 'overlayTone',
		label: 'Barva překryvu',
		options: [
			{ label: 'Jemné ztmavení', value: 'dim' },
			{ label: 'Tmavě modrá', value: 'navy' },
		],
	},
];

export const panelField = (): TinaField => ({
	type: 'boolean',
	name: 'panel',
	label: 'Pozadí jen kolem obsahu',
	description:
		'Barva nebo obrázek se nakreslí do rámečku uvnitř sekce místo přes celou šířku obrazovky.',
});

export const textToneField = (): TinaField => ({
	type: 'string',
	name: 'textTone',
	label: 'Barva textu v sekci',
	description: 'Prázdné = odvodí se od pozadí sekce.',
	options: [
		{ label: 'Výchozí', value: 'default' },
		{ label: 'Černá', value: 'black' },
		{ label: 'Bílá', value: 'inverse' },
	],
});

export const overlapField = (): TinaField => ({
	type: 'boolean',
	name: 'overlap',
	label: 'Zasadit do sousedních sekcí',
	description:
		'Sekce se o 100 px zanoří do sekce nad sebou i pod sebou. Sousedé pak potřebují odpovídající odsazení, aby se obsah nepřekryl.',
});

export const parallaxField = (): TinaField => ({
	type: 'boolean',
	name: 'parallax',
	label: 'Pohyb obrázku při scrollování',
	description:
		'Obrázek na pozadí se při projíždění sekce pomalu přibližuje. Uplatní se jen u pozadí typu „Obrázek“.',
});

const PADDING_OPTIONS = [
	{ label: 'Žádné', value: 'none' },
	{ label: 'Běžné', value: 'normal' },
	{ label: 'Velké', value: 'large' },
	{ label: 'Extra velké', value: 'xl' },
];

export const paddingFields = (): TinaField[] => [
	{
		type: 'string',
		name: 'padding',
		label: 'Svislé odsazení',
		options: PADDING_OPTIONS,
	},
	{
		type: 'string',
		name: 'paddingTop',
		label: 'Odsazení shora',
		description: 'Přebije obecné svislé odsazení. Prázdné = použije se obecné.',
		options: PADDING_OPTIONS,
	},
	{
		type: 'string',
		name: 'paddingBottom',
		label: 'Odsazení zdola',
		description: 'Přebije obecné svislé odsazení. Prázdné = použije se obecné.',
		options: PADDING_OPTIONS,
	},
];

export const anchorField = (): TinaField => ({
	type: 'string',
	name: 'anchor',
	label: 'Kotva (ID)',
	description: 'Nepovinné. Umožní na sekci odkázat pomocí #kotva.',
});

/** Pozadí + odsazení + kotva pohromadě — většina bloků chce všechny tři. */
export const sectionFields = (): TinaField[] => [
	backgroundField(),
	...backgroundImageFields(),
	parallaxField(),
	textToneField(),
	panelField(),
	overlapField(),
	...paddingFields(),
	anchorField(),
];

/**
 * Vzhled nadpisu sekce. Dnešní web nemá jednu podobu nadpisu — liší se barvou,
 * velikostí i zarovnáním podle sekce, tak to musí jít nastavit z editoru.
 */
export const headingFields = (): TinaField[] => [
	{
		type: 'string',
		name: 'titleTone',
		label: 'Barva nadpisu',
		options: [
			{ label: 'Oranžová', value: 'heading' },
			{ label: 'Modrá', value: 'sub' },
			{ label: 'Limetková', value: 'lime' },
			{ label: 'Tmavá', value: 'text' },
			{ label: 'Bílá', value: 'inverse' },
		],
	},
	{
		type: 'string',
		name: 'titleSize',
		label: 'Velikost nadpisu',
		options: [
			{ label: 'Velká (45 px)', value: 'section' },
			{ label: 'Střední (40 px)', value: 'lead' },
			{ label: 'Malá (28 px)', value: 'panel' },
		],
	},
	{
		type: 'string',
		name: 'titleAlign',
		label: 'Zarovnání nadpisu',
		options: [
			{ label: 'Vlevo', value: 'left' },
			{ label: 'Na střed', value: 'center' },
			{ label: 'Vpravo', value: 'right' },
		],
	},
];

export const alignField = (name = 'align', label = 'Zarovnání'): TinaField => ({
	type: 'string',
	name,
	label,
	options: [
		{ label: 'Vlevo', value: 'left' },
		{ label: 'Na střed', value: 'center' },
		{ label: 'Vpravo', value: 'right' },
	],
});

/** Jedno tlačítko — sdílí ho hero, CTA pás i samostatná skupina tlačítek. */
export const buttonFields = (): TinaField[] => [
	{ type: 'string', name: 'label', label: 'Popisek' },
	{ type: 'string', name: 'href', label: 'Odkaz' },
	{
		type: 'string',
		name: 'variant',
		label: 'Barva',
		options: [
			{ label: 'Modrá', value: 'sky' },
			{ label: 'Limetková', value: 'lime' },
			{ label: 'Meruňková', value: 'apricot' },
			{ label: 'Obrysová', value: 'outline' },
		],
	},
];

export const buttonListField = (name = 'buttons', label = 'Tlačítka'): TinaField => ({
	type: 'object',
	name,
	label,
	list: true,
	ui: {
		defaultItem: { label: 'Zjistit více', href: '/', variant: 'sky' },
		itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Tlačítko' }),
	},
	fields: buttonFields(),
});
