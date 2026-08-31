/**
 * Jediný endpoint, který obsluhuje všechna překreslení editovaných oblastí.
 * Cesta v URL (`/tina-island/page`, `/tina-island/header`, …) vybírá položku
 * z registru v `src/lib/islands.ts`.
 */
import type { APIRoute } from 'astro';
import { experimental_createIslandRoute } from '@tinacms/astro/experimental';
import { islands } from '../../lib/islands';

export const prerender = false;
export const ALL: APIRoute = experimental_createIslandRoute(islands);
