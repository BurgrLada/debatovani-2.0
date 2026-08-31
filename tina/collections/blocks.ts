/**
 * Jediný seznam bloků, ze kterých se skládají stránky.
 *
 * Sada je záměrně uzavřená — to je to, co brání tomu, aby web za dva roky
 * zase vypadal jako Elementor (docs/02, sekce 2). Editor smí skládat, ne
 * stylovat. `rawHtml` je vědomá výjimka pro obsah, na který blok ještě není.
 */
import type { Template } from 'tinacms';

import { heroBlockSchema } from '../../src/components/blocks/hero.template';
import { richTextBlockSchema } from '../../src/components/blocks/richText.template';
import { textWithImageBlockSchema } from '../../src/components/blocks/textWithImage.template';
import { imageBlockSchema } from '../../src/components/blocks/imageBlock.template';
import { buttonsBlockSchema } from '../../src/components/blocks/buttons.template';
import { iconCardsBlockSchema } from '../../src/components/blocks/iconCards.template';
import { iconListBlockSchema } from '../../src/components/blocks/iconList.template';
import { statsBlockSchema } from '../../src/components/blocks/stats.template';
import { accordionBlockSchema } from '../../src/components/blocks/accordion.template';
import { cardLinksBlockSchema } from '../../src/components/blocks/cardLinks.template';
import { partnerLogosBlockSchema } from '../../src/components/blocks/partnerLogos.template';
import { documentListBlockSchema } from '../../src/components/blocks/documentList.template';
import { peopleListBlockSchema } from '../../src/components/blocks/peopleList.template';
import { articleListBlockSchema } from '../../src/components/blocks/articleList.template';
import { upcomingEventsBlockSchema } from '../../src/components/blocks/upcomingEvents.template';
import { clubMapBlockSchema } from '../../src/components/blocks/clubMap.template';
import { contactFormBlockSchema } from '../../src/components/blocks/contactForm.template';
import { embedBlockSchema } from '../../src/components/blocks/embed.template';
import { quoteBlockSchema } from '../../src/components/blocks/quote.template';
import { dividerBlockSchema } from '../../src/components/blocks/divider.template';
import { rawHtmlBlockSchema } from '../../src/components/blocks/rawHtml.template';

export const pageBlocks: Template[] = [
	heroBlockSchema,
	richTextBlockSchema,
	textWithImageBlockSchema,
	imageBlockSchema,
	buttonsBlockSchema,
	iconCardsBlockSchema,
	iconListBlockSchema,
	statsBlockSchema,
	cardLinksBlockSchema,
	accordionBlockSchema,
	documentListBlockSchema,
	peopleListBlockSchema,
	partnerLogosBlockSchema,
	articleListBlockSchema,
	upcomingEventsBlockSchema,
	clubMapBlockSchema,
	contactFormBlockSchema,
	embedBlockSchema,
	quoteBlockSchema,
	dividerBlockSchema,
	rawHtmlBlockSchema,
];
