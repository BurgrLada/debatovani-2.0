import type { Template } from 'tinacms';

/** Vložené video uvnitř rich-textu — registruje se v `templates` pole typu rich-text. */
export const youTubeEmbedTemplate: Template = {
	name: 'YouTubeEmbed',
	label: 'Video z YouTube',
	fields: [
		{ type: 'string', name: 'url', label: 'Odkaz na video' },
		{ type: 'string', name: 'title', label: 'Popis videa' },
	],
};
