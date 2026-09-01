import type { APIContext } from 'astro';
import { articlesFeed } from '../lib/feed';

export const GET = (context: APIContext) => articlesFeed(context, 'cs');
