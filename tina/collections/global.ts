import type { Collection } from 'tinacms';

/**
 * Globální nastavení webu — hlavička, navigace, patička, kontakty, SEO.
 *
 * Jeden dokument na jazyk (`src/content/global/cs/global.json`), aby měla
 * redakce navigaci na jednom místě a ne rozsypanou po šablonách.
 */
export const GlobalCollection: Collection = {
	name: 'global',
	label: 'Nastavení webu',
	path: 'src/content/global',
	format: 'json',
	ui: { global: true, allowedActions: { create: false, delete: false } },
	fields: [
		{ type: 'string', name: 'siteName', label: 'Název webu', isTitle: true, required: true },
		{ type: 'image', name: 'logo', label: 'Logo' },
		{ type: 'string', name: 'logoAlt', label: 'Popis loga (alt)' },

		{
			type: 'object',
			name: 'nav',
			label: 'Hlavní navigace',
			list: true,
			ui: {
				defaultItem: { label: 'Nová položka', href: '/' },
				itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Položka' }),
			},
			fields: [
				{ type: 'string', name: 'label', label: 'Popisek' },
				{ type: 'string', name: 'href', label: 'Odkaz' },
				{
					type: 'string',
					name: 'variant',
					label: 'Barva tlačítka',
					options: [
						{ label: 'Meruňková', value: 'apricot' },
						{ label: 'Limetková', value: 'lime' },
						{ label: 'Modrá', value: 'sky' },
					],
				},
				{
					type: 'object',
					name: 'children',
					label: 'Podpoložky',
					list: true,
					ui: { itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Podpoložka' }) },
					fields: [
						{ type: 'string', name: 'label', label: 'Popisek' },
						{ type: 'string', name: 'href', label: 'Odkaz' },
					],
				},
			],
		},

		{
			type: 'object',
			name: 'footer',
			label: 'Patička',
			fields: [
				{ type: 'image', name: 'background', label: 'Fotka na pozadí' },
				{ type: 'string', name: 'intro', label: 'Text nad ikonami', ui: { component: 'textarea' } },
				{ type: 'string', name: 'socialTitle', label: 'Nadpis nad ikonami sítí' },
				{ type: 'string', name: 'newsletterTitle', label: 'Nadpis nad newsletterem' },
				{ type: 'string', name: 'newsletterLabel', label: 'Popisek tlačítka newsletteru' },
				{ type: 'string', name: 'newsletterPlaceholder', label: 'Nápověda v poli pro e-mail' },
				{
					type: 'string',
					name: 'newsletterAction',
					label: 'Kam se přihlášení odesílá',
					description:
						'Adresa zpracování z rozesílací služby. Dokud je prázdná, odeslání jen přenese návštěvníka na stránku newsletteru — e-mail se nikam neposílá.',
				},
				{
					type: 'string',
					name: 'newsletterField',
					label: 'Název pole s e-mailem',
					description: 'Jak se pole jmenuje v rozesílací službě. Např. `email`.',
				},
				{ type: 'string', name: 'newsletterHref', label: 'Odkaz na stránku newsletteru' },
				{ type: 'string', name: 'copyright', label: 'Copyright' },
				{
					type: 'object',
					name: 'links',
					label: 'Odkazy v patičce',
					list: true,
					ui: { itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Odkaz' }) },
					fields: [
						{ type: 'string', name: 'label', label: 'Popisek' },
						{ type: 'string', name: 'href', label: 'Odkaz' },
					],
				},
			],
		},

		{
			type: 'object',
			name: 'social',
			label: 'Sociální sítě',
			list: true,
			ui: { itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Síť' }) },
			fields: [
				{ type: 'string', name: 'label', label: 'Název' },
				{ type: 'string', name: 'href', label: 'Odkaz' },
				{ type: 'string', name: 'icon', label: 'Ikona', description: 'Např. fa6-brands:facebook-f' },
				{
					type: 'string',
					name: 'color',
					label: 'Barva dlaždice',
					description: 'Hex hodnota, např. #3B5998. Prázdné = barva značky webu.',
				},
			],
		},

		{
			type: 'object',
			name: 'contact',
			label: 'Kontakt',
			fields: [
				{ type: 'string', name: 'organization', label: 'Název organizace' },
				{ type: 'string', name: 'address', label: 'Adresa', ui: { component: 'textarea' } },
				{ type: 'string', name: 'email', label: 'E-mail' },
				{ type: 'string', name: 'phone', label: 'Telefon' },
				{ type: 'string', name: 'ico', label: 'IČO' },
				{ type: 'string', name: 'bankAccount', label: 'Číslo účtu' },
			],
		},

		{
			type: 'object',
			name: 'seo',
			label: 'Výchozí SEO',
			fields: [
				{ type: 'string', name: 'title', label: 'Výchozí titulek' },
				{ type: 'string', name: 'description', label: 'Výchozí popis', ui: { component: 'textarea' } },
				{ type: 'image', name: 'image', label: 'Výchozí obrázek pro sdílení' },
			],
		},
	],
};
