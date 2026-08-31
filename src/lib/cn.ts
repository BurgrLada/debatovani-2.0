/**
 * Skládání tříd. `twMerge` řeší, aby pozdější třída přebila dřívější ze
 * stejné skupiny (`bg-surface` vs. `bg-surface-alt`).
 *
 * Pozor: `twMerge` zná jen výchozí Tailwind škály. Naše tokeny z
 * `src/styles/tokens.css` mu musíme popsat, jinak si `text-section`
 * (velikost písma) splete s `text-heading` (barva) — obojí začíná na
 * `text-` — a jednu z nich zahodí. Seznamy níže musí odpovídat tokenům.
 */
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Klíče `--text-*` z tokens.css. */
const fontSizes = [
	'hero',
	'eyebrow',
	'section',
	'lead',
	'panel',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'caption',
	'pagetitle',
] as const;

/** Klíče `--color-*` z tokens.css. */
const colors = [
	'lime',
	'blue',
	'orange',
	'ink',
	'lime-muted',
	'blue-muted',
	'orange-muted',
	'apricot',
	'sky',
	'lime-pale',
	'peach',
	'linen',
	'lime-wash',
	'navy',
	'surface',
	'surface-alt',
	'surface-lime',
	'surface-dark',
	'copy',
	'muted',
	'inverse',
	'heading',
	'subheading',
	'link',
	'link-hover',
	'action',
	'action-ink',
	'action-alt',
	'action-alt-ink',
	'action-warm',
	'action-warm-ink',
	'line',
	'titlebar',
	'titlebar-ink',
	'gray-050',
] as const;

const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			'font-size': [{ text: [...fontSizes] }],
			'text-color': [{ text: [...colors] }],
			'bg-color': [{ bg: [...colors] }],
			'border-color': [{ border: [...colors] }],
			'font-family': [{ font: ['display', 'body'] }],
			rounded: [{ rounded: ['button', 'nav', 'card'] }],
		},
	},
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
