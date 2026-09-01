# Implementace — co je hotové a jak to funguje

_Stav k 31. 8. 2026. Navazuje na [06-doporucena-architektura.md](06-doporucena-architektura.md); tady je popsané, co z návrhu reálně stojí v repozitáři._

## 1. Co běží

| Vrstva | Řešení |
|---|---|
| Framework | Astro 7, `output: 'static'` + Node adaptér (standalone) |
| CMS | TinaCMS 3, **lokální režim** — obsah v gitu, žádný cloud ani databáze |
| Styly | Tailwind 4 nad vlastními tokeny (`src/styles/tokens.css`) |
| Písma | self-hosted Poppins + Roboto (`@fontsource`) |
| Ikony | `astro-icon` + Font Awesome 6 sady přes Iconify |
| Jazyky | čeština na kořeni, angličtina pod `/en/`; přepínač vlaječkou v hlavičce |
| Obsah | 63 stránek, 356 aktualit, 10 osob, 8 partnerů, 4 vzorové kluby |

Spuštění:

```bash
pnpm dev      # tinacms dev + astro dev; admin na /admin, web na :4321
pnpm build    # tinacms build --local + astro build
pnpm check    # astro check (typy)
```

`pnpm dev` musí běžet v terminálu s TTY. Bez něj se `astro dev` sám odpojí na
pozadí a `tinacms dev` skončí — pak je potřeba spustit `tinacms dev`
a `astro dev --background` zvlášť.

## 2. Struktura

```
tina/collections/     schéma CMS — page, article, project, person, club, partner, global
  blocks.ts           jediný seznam bloků, ze kterých se skládají stránky
src/
  components/
    blocks/           21 bloků: <Blok>.astro + <blok>.template.ts vedle sebe
    ui/               Container, Section, Button, Heading, ArticleCard…
    layout/           Header, Footer, PageTitle, BaseHead
    islands/          obsah editovatelných oblastí pro vizuální editaci
  content/<kolekce>/cs/   obsah; adresář `cs` drží cestu otevřenou pro angličtinu
  lib/data.ts         načítání z Tiny + odvozené typy
  lib/i18n.ts         jazyky, prefixy v URL a popisky rozhraní
  lib/events.ts       napojení na debata21 API
  lib/islands.ts      registr editovatelných oblastí
  pages/              routy; `[...path].astro` mapuje cestu souboru na URL
  pages/portal/       Portál debatování — přenesený 1:1, mimo blokový systém
  styles/tokens.css   **jediné místo s hex hodnotami barev**
  styles/motion.css   pohyb a efekty (objevování bloků, hovery)
scripts/              migrace z WordPressu (opakovatelná)
```

### Blok = komponenta + schéma

Každý blok má dva soubory vedle sebe: `.astro` s vykreslením a `.template.ts`
se schématem pro editor. Přidání bloku znamená tři kroky:

1. `src/components/blocks/NovyBlok.astro` + `novyBlok.template.ts`
2. řádek v `tina/collections/blocks.ts`
3. větev v `src/components/blocks/Blocks.astro`

**Pozor na názvy polí.** Tina slučuje pole napříč všemi bloky podle jména,
takže stejný název musí mít všude stejný typ. `text` je proto v jednom bloku
rich-text a jinde se pole jmenuje `label`/`description`. Když se to poruší,
`tinacms build` skončí chybou „Fields … conflict“.

## 3. Design tokeny

`src/styles/tokens.css` je dvouvrstvý: paleta (jediné místo s hex hodnotami)
a role (`--color-heading`, `--color-action`, …), které používají komponenty.
Tokeny žijí v Tailwind `@theme`, takže z nich vznikají utility
(`bg-surface-alt`, `text-heading`, `font-display`, `rounded-button`).

Přebarvit celý web = přepsat paletu. Komponenty se nesahají.

Když se přidá nový barevný nebo velikostní token, **musí se dopsat i do
`src/lib/cn.ts`**. `tailwind-merge` zná jen výchozí Tailwind škály a bez toho
si `text-section` (velikost) splete s `text-heading` (barva) a jednu z nich
zahodí.

## 4. Migrace z WordPressu

Skripty jsou **opakovatelné** — redakce publikuje dál, dokud se web nepřepne,
takže se před spuštěním pustí znovu.

```bash
node scripts/migrate-articles.mjs          # 356 aktualit + média + redirecty
node scripts/migrate-pages.mjs --force     # 65 stránek z Elementoru do bloků
node scripts/extract-people.mjs            # jednorázově: lidé do kolekce person
```

`migrate-pages.mjs` bez `--force` existující soubory přeskočí, aby nepřepsal
ruční úpravy. Na konci vypíše přehled toho, co si zaslouží kontrolu.

Co skripty řeší, protože to jinak tiše rozbije obsah:

- **staré URL článků** (`/2026/08/21/slug/`) → `/aktuality/slug/`; odkazy
  v obsahu se přepisují rovnou, přesměrování se generují do
  `src/data/redirects.json` a načítá je `astro.config.mjs`
- **obfuskované e-maily** — Cloudflare je schovává za
  `/cdn-cgi/l/email-protection#…` a rozbaluje vlastním skriptem, který na
  novém webu neběží; dekódují se zpátky na `mailto:`
- **Unicode v názvech souborů** — WP REST vrací názvy v rozloženém tvaru (NFD),
  server je servíruje ve složeném (NFC); bez normalizace vrací stahování 404
- **úvodní pás podstránky** — Elementor ho skládá z fotky na pozadí a dvou
  nadpisů. Bez rozpoznání by z něj vyšel textový blok na obrázku, tedy tenký
  proužek s useknutou fotkou; migrace z něj dělá hero blok.
- **`_fields=content` u `wp/v2/pages`** vrací nevalidní JSON (plugin do
  odpovědi vypisuje HTML), takže se obsah klasických stránek bere z vykreslené
  stránky, ne z API

## 5. Vizuální editace

`/admin` běží z lokálního Tina serveru. Stránka se v editoru překresluje po
částech přes registr v `src/lib/islands.ts` a `/tina-island/[name]`. Přidání
editovatelné oblasti = jeden záznam v registru.

`/tina-island/*` je jediná routa, která potřebuje Node proces
(`prerender = false`). Zbytek webu je statické HTML — když Node spadne, web
běží dál.

Editovatelné jsou tři oblasti: **stránka**, **hlavička** a **patička**.
Hlavička a patička musí být v `Base.astro` obalené v `<TinaIsland>` — bez toho
na ně editor neumí navázat formulář a klik na položku menu nebo na patičku
neudělá nic.

Jejich obal má `display: contents`. Kdyby to byl běžný `div`, rozbil by
rozvržení: hlavička je `position: sticky` a lepila by se jen uvnitř obalu,
patička má `mt-auto`, které platí pro přímého potomka flexového `body`.

## 6. Věrnost produkci

Části, kde bylo potřeba trefit konkrétní rozměry, jsou změřené na živém webu,
ne odhadnuté:

- tlačítka v navigaci mají pevných 120 × 57 px, odsazení 5 px a mezeru 15 px
- tlačítka v obsahu mají odsazení 10 px / 40 px a poloměr 3 px
- hero: popisek, pod ním 30px mezera, nadpis, 116px mezera, řada tlačítek
  s rozestupem 30 px
- překryvy přes fotky: černá 25 % (hero) a tmavě modrá 70 % (sekce s formulářem);
  patička má tmavě modrou 50 %
- patička je jeden pás s fotkou na pozadí a dvěma sloupci (2 : 1) — vlevo
  text a ikony sítí 48 × 48 px v barvách jednotlivých služeb, vpravo
  newsletter, pod nimi vycentrovaný copyright
- nadpisy sekcí se liší: „Co je debata?“ je oranžový 45 px na střed, „Mapa
  debatních klubů“ limetkový 28 px vlevo, „Můžeme přijet i k vám!“ modrý
  40 px vlevo. Proto jsou barva, velikost i zarovnání nadpisu pole bloku,
  ne pevná vlastnost komponenty
- sekce s mapou má béžové pozadí jen kolem obsahu (`panel`) a je zanořená do
  sekcí nad a pod sebou (`overlap`, `z-index: 9`); hloubka zanoření je token
  `--space-overlap` a sousedé si ten prostor kompenzují odsazením
- sekce s formulářem má „motion effect“: obrázek na pozadí se během průchodu
  obrazovkou zmenšuje ze 118 % na 100 %
- čísla mají dvě rozvržení: vedle sebe s textem pod nimi, nebo pod sebou
  vpravo zarovnaná s textem ve vedlejším sloupci; oddělovač mezi nimi je
  krátká čára 100 px zarovnaná vpravo, ne linka přes celou šířku
- formulář nemá bílou kartu — pole leží přímo na pozadí sekce a popisky dědí
  jeho barvu textu
- sekce s formulářem má na pozadí pohyb (Elementor „motion effect“, který
  obrázek při průchodu zvětšuje) — u nás animace navázaná na scroll, bez JS
- sekce s mapou je zasazená o 100 px do sousedních bloků (`overlap`), proto
  mají sousedé odsazení 100 px na přiléhající straně
- oddělovače mezi čísly jsou krátké (100 px) a zarovnané vpravo, ne přes
  celou šířku
- barva textu v sekci jde přebít (`textTone`): sekce s čísly má fotku na
  pozadí, a přesto černý text, protože je ta fotka světlá
- barvu textu celé sekce lze přebít (`textTone`); pás s čísly je na fotce, ale
  má text čistě černý, ne bílý. Kvůli tomu `.prose-adk` barvu **dědí** místo
  aby si ji nastavoval sám

Loga partnerů **nejsou v patičce** — na dnešním webu jsou sekcí úvodní stránky
a v novém webu je vykresluje blok „Loga partnerů“ tamtéž.

### Pohyb a efekty

Dnešní web má na sekcích Elementor animaci `fadeIn`. U nás to dělá
IntersectionObserver (`src/scripts/reveal.ts`) plus CSS přechod; bloky
označuje `Blocks.astro` atributem `data-reveal` a úvodní pás se vynechává.

**Proč ne `animation-timeline: view()`.** Zkoušel jsem to jako první, protože
by to bylo bez skriptu. Nakonec ne:

- mimo Chromium to zatím nikdo neumí,
- ani v Chromiu se na to nedá spolehnout — view timeline umí zůstat neaktivní
  (`timeline.currentTime === null`) a animace se pak nespustí vůbec,
- zkratka `animation` resetuje `animation-duration` na `0s`, takže animace
  řízená scrollem rovnou skočí na konec; potřebuje `auto`,
- `overflow: hidden` na sekci by z ní udělalo scroll kontejner a timeline by
  přestal být aktivní.

Dohromady moc pastí na efekt, u kterého platí, že když selže, **obsah zůstane
neviditelný**. Proto pravidla, která je potřeba dodržet:

- **skrytý stav zapíná až skript** třídou `js-reveal` na `<html>`. Bez JS nebo
  při chybě skriptu je obsah normálně vidět.
- **pojistka v skriptu**: 1,5 s po načtení se odhalí všechno, co je zrovna
  vidět, i kdyby observer nedoběhl.
- **ve vizuálním editoru se neanimuje.** Tina vykresluje stránku v iframu
  a po každé úpravě překreslí editovanou oblast — nové elementy by původní
  observer nesledoval a zůstaly by skryté, takže by editor ukazoval prázdnou
  stránku. Skript proto uvnitř iframu nic neskrývá.
- **při tisku se odhalí všechno** bez ohledu na to, kam se doscrollovalo.
- při `prefers-reduced-motion` se nehýbe nic.

Parallax u sekce s formulářem je `background-attachment: fixed`. Není to na
chlup produkční zoom, ale funguje ve všech prohlížečích a nepotřebuje skript;
na dotykových zařízeních je vypnutý, tam bývá skokový.

### Na co si dát pozor u písem

Fontsource dělí každý řez na **podmnožiny znaků**. Import jen
`latin-ext-400.css` přinese pouze znaky s diakritikou — běžná písmena se
vykreslí náhradním systémovým fontem a text je poskládaný ze dvou různých
písem. Proto se importují souhrnné soubory (`@fontsource/poppins/400.css`).

Rodina z `@fontsource-variable/roboto` se jmenuje **`Roboto Variable`**, ne
`Roboto`; token `--font-body` musí uvádět obojí.

## 7. Mapa debatních klubů

Dnešní web má na úvodní stránce obrázek s body **namalovanými napevno**
(Elementor widget `hotspot`) — přidat klub znamenalo překreslit obrázek.

V novém webu jsou body data. Blok „Mapa debatních klubů“ vezme každý aktivní
záznam z kolekce `club`, který má vyplněnou zeměpisnou šířku a délku, a spočítá
jeho pozici vůči zeměpisným okrajům podkladového obrázku (pole „Rozsah mapy“).

Přidat klub na mapu znamená v administraci:

1. **Debatní kluby → nový záznam**
2. vyplnit název, město, kraj a hlavně **zeměpisnou šířku a délku**
3. nechat zapnuté „Aktivní“

Nic dalšího; bod se objeví na každé mapě s vykreslováním bodů. Barva bodu se
řídí typem klubu (SŠ oranžová, ZŠ modrá, online limetková). Klub bez souřadnic
se na mapě neobjeví, ale zůstane ve výpisu pod ní.

Výchozí okraje jsou změřené z dodané mapy `/media/home/mapa.webp`: kresba v ní
zabírá 1,8–94,7 % šířky a 8,1–91,8 % výšky, takže okraje celého obrázku vyšly
na 11,96–19,25 ° délky a 48,3–51,3 ° šířky. Při výměně obrázku je potřeba
přeměřit.

Stránka `/kontakt/mapa-debatnich-klubu/` zatím používá vloženou Google My Maps
— ta má ve stejném bloku přednost před obrázkem a zůstává jako záložní cesta,
dokud nebudou kluby vyplněné.

## 8. Portál debatování

`src/pages/portal/index.astro` je **přenesený 1:1 ze starého webu** a záměrně
stojí mimo blokový systém: vlastní `<head>`, vlastní Tailwind (play CDN),
Font Awesome a vlastní JS v `src/scripts/portal.js`. Na WordPressu běžel jako
`cleanpage` bez hlavičky a patičky a subdoména `portal.debatovani.cz` ho
zobrazovala ve fullscreen iframu.

Nutné odchylky: obrázky a PDF ukazují na lokální kopie, odkazy na vlastní web
jsou relativní, zmizely `_gl` parametry Google Analytics a aktuality se načítají
z `/portal/news.json` (stejný tvar dat jako `wp-json`), aby portál přežil
vypnutí WordPressu.
