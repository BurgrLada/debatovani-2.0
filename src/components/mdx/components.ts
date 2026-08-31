/**
 * Komponenty, které smí redakce vložit dovnitř rich-textu, plus přemapování
 * výchozích značek na naše styly. `TinaMarkdown` je dostává jako `components`.
 */
import YouTubeEmbed from './YouTubeEmbed.astro';

export const mdxComponents = {
	YouTubeEmbed,
};
