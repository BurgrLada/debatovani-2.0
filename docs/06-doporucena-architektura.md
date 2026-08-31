# Doporučená architektura

_Vychází z potvrzených vstupů: **rekonstrukce 1:1** (ne nový design), **redakci tvoří pár technicky zdatných lidí** s poměrně velkou volností v editoru, **žádný SaaS pro CMS a obsah**, **vizuální editace je nutnost**. Node server s databází je k dispozici, git provider je **GitHub**._

Omezení „žádný SaaS“ se týká CMS a obsahu, ne vývojové infrastruktury — GitHub, GitHub Actions a S3-kompatibilní úložiště jsou přípustné.

Tato omezení dohromady vylučují většinu obvyklých řešení. Zbývají v podstatě dvě cesty.

## 1. Kandidáti, kteří projdou všemi omezeními

| | **Puck** (`@puckeditor/core` 0.23.0, MIT) | **TinaCMS self-hosted** (3.12.1, Apache-2.0) |
|---|---|---|
| Typ vizuální editace | **skutečný drag-and-drop na plátně** — nejblíž tomu, co redakce zná z Elementoru | sidebar + živý náhled stránky; klik na prvek skočí na jeho pole, řazení bloků v postranním panelu |
| Vztah k Astru | React-only → **bloky musí být `.tsx`** | **`@tinacms/astro`, vizuální editace bez Reactu** → bloky zůstanou `.astro`; Astro je od 5/2026 default starter Tiny |
| Ukládání obsahu | **musíte postavit sami** (DB nebo commit do gitu) | hotové: obsah v gitu (Markdown/JSON) + DB pro indexaci |
| Autentizace a role | **musíte postavit sami** | hotové (Auth.js, vlastní provider) |
| Knihovna médií | **musíte postavit sami** (upload, alt texty, 1 377 souborů) | hotová (git nebo S3-kompatibilní úložiště) |
| Drafty, verze, historie | **musíte postavit sami** | git historie zdarma + náhledy |
| Správa článků / lidí / klubů | **neřeší** — Puck je editor stránek, ne CMS | hotové (kolekce se schématem) |
| Infrastruktura | Node runtime + DB (obojí si navrhnete) | Node runtime + Postgres/MongoDB + git provider |
| Zralost | pre-1.0, balíček nedávno přejmenován (`@measured/puck` je deprecated) | stabilní 3.x, ale **self-hosting je netriviální** a některé funkce v něm chybí |
| Kolik kódu navíc | **stovky hodin** (fakticky stavíte malé CMS) | desítky hodin (konfigurace, ne stavba) |

**Doporučení: TinaCMS self-hosted jako základ, Puck zvážit až jako doplněk na landing pages.**

Rozhodující je ten druhý řádek tabulky. Kvůli Pucku bychom museli napsat všechny bloky v Reactu, přestože zbytek webu je Astro — a pak stejně dostavět auth, média, verzování a správu 357 článků, protože Puck nic z toho nedělá. Tina naopak umožňuje **napsat bloky jednou jako `.astro` komponenty** a dodá administraci hotovou.

**Kdy naopak volit Puck:** pokud po předvedení obou variant redakce řekne, že bez tažení bloků myší po stránce přechod neustojí. Pak se Puck nasadí **jen na stránky** a články/lidé/kluby/dokumenty zůstanou v jednodušší kolekci — nikdy ne Puck na všechno.

### Co jsem vyřadil a proč

- **Storyblok, Sanity, Tina Cloud, Builder.io** — SaaS, vyloučeno zadáním
- **Keystatic** — self-hosted a zdarma, ale editace je čistě formulářová, bez živého náhledu → nesplňuje „vizuální editace je nutnost“
- **Directus, Payload, Strapi** — hotová administrace a média, ale jejich „live preview“ je náhled v iframu vedle formuláře, ne editace v obsahu; navíc těžší infrastruktura
- **Decap CMS a Sveltia** — nemají editaci v obsahu, jen řazení bloků v panelu; jinak solidní a levné na provoz (dřívější tvrzení „Decap je málo aktivní“ neplatí, viz [08-git-based-cms.md](08-git-based-cms.md))
- **Headless WordPress** — nesplňuje „pryč od WordPressu“

## 2. Provozní model

**Node server s databází je k dispozici.** Self-hosted TinaCMS tím přestává být podmíněná varianta a stává se potvrzeným základem. Zbývá rozhodnout, jak se k sobě administrace a web postaví.

### Jedna aplikace, nebo dvě služby?

| | **Jedna aplikace** (Tina backend uvnitř Astro projektu) | **Dvě služby** (Astro web + samostatný Tina backend) |
|---|---|---|
| Repozitář | jeden balík, jeden `tina/config.ts` | monorepo nebo dva repozitáře, schéma se sdílí |
| Vývoj | jedno `npm run dev` | dva procesy, synchronizace schémat |
| Deploy | jeden | dva |
| Pád administrace | při špatné konfiguraci shodí i web | web běží dál |
| Redeploy po uložení obsahu | restartuje backend, u kterého redaktor právě sedí | administrace běží dál, přebudovává se jen web |
| Závislosti | Tina admin (React) sdílí verze s webem | izolované |
| Přístupové údaje (DB, auth secret, git token) | ve stejném prostředí jako veřejný web | oddělené |
| Zdroje | **levnější** — jeden Node proces místo dvou | o jeden proces navíc |

**Rozhodnutí: jedna aplikace.** Pro projekt této velikosti a pro tým, který ho bude spravovat spíš nárazově, převáží jednoduchost správy. Dvě služby přidávají pohyblivé součástky, které se musí udržovat i ve chvíli, kdy se na webu půl roku nic neděje.

**Podmínka, bez které to rozhodnutí neplatí:** projekt musí běžet v režimu `output: 'static'` s adaptérem a `prerender = false` **jen** na `/admin` a `/api/tina/*`. Web pak zůstává statické HTML servírované z cache a Node proces obsluhuje pouze administraci. Když se tohle neudělá vědomě, je celý web on-demand a pád administrace ho shodí — tedy přesně ten failure mode, kvůli kterému se odchází z WordPressu.

**Rozdělení na dvě služby je varianta do budoucna, ne teď.** Sáhnout po ní má smysl, pokud nastane některá z těchto situací:

- redaktorům začne vadit, že je redeploy po uložení obsahu vyhazuje z rozdělané práce
- přidá se Puck na landing pages a dva React ekosystémy v jednom `package.json` si sáhnou na kolizní verzi
- vznikne požadavek držet přístupové údaje k databázi mimo prostředí veřejného webu

Migrace není drahá: `tina/config.ts` se přesune, backend handler je jeden soubor. Proto se to nemá řešit dopředu.

### Poznámka: adaptér ≠ islands

Astro islands (`client:load`, `client:visible`, `client:idle`) fungují **i ve zcela statickém buildu** — adaptér na ně potřeba není. Adaptér odemyká něco jiného: server islands (`server:defer`), server endpointy za běhu, on-demand routy a runtime middleware.

Pro tento web je z toho reálně užitečná jedna věc: **výpis nadcházejících akcí z `api-prod.debata21.cz` by šel dorenderovat na serveru** místo čekání na noční rebuild. Adaptér tuhle možnost otevírá, ale není důvod ji nasazovat hned — začít se má statickým fetchem při buildu.

## 3. Návrh architektury

```
┌──────────────────────────────────────────────────────────────┐
│  Astro 7 + TypeScript  ·  output: 'static' + adaptér         │
│                                                               │
│  prerendered (statické HTML, servírované z cache)             │
│  ├─ bloky jako .astro komponenty (~12 typů)                   │
│  ├─ content collections se Zod schématem                      │
│  │   articles · pages · clubs · people · projects · docs      │
│  └─ data z debata21 API natažená při buildu                   │
│                                                               │
│  prerender = false (obsluhuje Node proces)                    │
│  ├─ /admin              — Tina admin UI                       │
│  └─ /api/tina/[...]     — Tina backend (datalayer + auth)     │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
      ┌─────────▼──────────┐        ┌──────────▼─────────────┐
      │ Postgres           │        │ debata21 API           │
      │ index obsahu       │        │ api-prod.debata21.cz   │
      └────────────────────┘        │ fetch při buildu       │
                                    │ + denní rebuild        │
      ┌────────────────────┐        └────────────────────────┘
      │ S3-kompatibilní    │
      │ úložiště médií     │
      └────────────────────┘

  uložení v adminu ──► commit do gitu ──► CI build ──► statický web za CDN
```

**Proč to takto:** web samotný je statické HTML — rychlý, bezpečný, levný a nezávislý na tom, jestli CMS zrovna běží. Administrace je jediná část, která potřebuje Node runtime; když spadne, web běží dál. To je přesný opak dnešního stavu, kdy pád PHP shodí celý web.

Administrace přitom **žije ve stejném projektu jako web** (viz sekce 2) — sdílí `tina/config.ts`, schémata bloků i vývojové prostředí. Oddělení do vlastní služby je otevřená cesta, ne výchozí stav.

## 4. Jak projekt inicializovat

**Nejdřív Astro, Tinu do něj přidat.** Ne `create-tina-app`.

```bash
npm create astro@latest debatovani-2.0     # minimal, TypeScript strict
# … základní nastavení, commit …
npx @tinacms/cli@latest init               # aditivní krok do existujícího projektu
```

Důvody:

- **Kontrola nad Astrem.** Nestaví se Tina demo, staví se Astro web, kterému Tina dodává administraci. Pravidlo ze sekce 5 („editor je jen nadstavba“) se špatně drží, když projekt vznikne z Tina starteru a její konvence sedí v základech. Astro-first nechá rozhodnout i18n routing, content collections, `astro:assets`, adaptér a strukturu `src/` dřív, než do toho vstoupí CMS.
- **Čitelný git diff.** `init` spuštěný na čistém stromu přesně ukáže, co Tina do projektu přidala — a jde to revertovat.
- **Starter stejně nesedne.** `create-tina-app` scaffolduje projekt napojený na Tina Cloud. Self-hosted nasazení znamená vyměnit backend za datalayer + auth provider + databázový adaptér, takže se ta „hotová konfigurace“ z velké části zahodí a navíc se odstraňuje demo obsah a styling.

Co se tím ztrácí, je funkční reference. Řeší se levně — vygenerovat starter do zahazovacího adresáře mimo projekt a používat ho jen ke čtení:

```bash
npm create tina-app@latest /tmp/tina-ref
```

### Pořadí kroků

1. `npm create astro@latest` — minimal šablona, TypeScript strict
2. i18n routing, content collections (`articles`, `pages`, `clubs`, `people`, `projects`, `docs`), path aliasy, formátování → **commit**

   **Adresářová konvence pro jazyky od prvního dne**, i když se o rozsahu anglické verze ještě nerozhodlo:

   ```
   content/articles/cs/prihlaska-do-tymu-ippf.md
   content/articles/en/ippf-team-application.md
   ```

   Astro se nastaví s `defaultLocale: 'cs'` a `prefixDefaultLocale: false`, takže české URL zůstanou bez prefixu (`/clanky/…`) a angličtina dostane `/en/…`. Jazyková složka se při generování routy odřízne z `id`. Stojí to pár řádků teď; přejmenovávat cesty s 357 naimportovanými články později je drahé. Tím se rozhodnutí o rozsahu angličtiny odsune, aniž by cokoli blokovalo.
3. 2–3 bloky jako `.astro` komponenty se Zod schématem, ověřit build → **commit**
4. `npx @tinacms/cli@latest init` → **samostatný commit**, ať je diff vidět
5. Přepnout na self-hosted backend (datalayer, auth provider, DB adaptér), nastavit `prerender = false` na `/admin` a `/api/tina/*`
6. Teprve pak `visualSelector`, `previewSrc` náhledy bloků a `overrides` na rich-textu

Krok 3 před krokem 4 je záměrný: schéma bloků má vzniknout z potřeb webu, ne z toho, co je zrovna pohodlné v Tina configu.

## 5. Nezávislost na editoru

Nezávisle na finální volbě doporučuji držet se jednoho pravidla:

> **Bloky jsou Astro komponenty s typovaným schématem. Editor je jen nadstavba, která do nich sype data.**

Prakticky to znamená definovat pro každý blok schéma (Zod), z něj generovat konfiguraci editoru, a nikdy nepsat logiku bloku uvnitř editoru. Když se po roce ukáže, že Tina nevyhovuje, vymění se administrace, ne web.

## 6. Otevřené otázky, které tato architektura přidává

1. ~~**Který git provider?**~~ **Rozhodnuto: GitHub.** Tím se upřesnilo i omezení „žádný SaaS“ — týká se **CMS a obsahu**, ne vývojové infrastruktury. Důsledky: GitHub Actions jako CI runner, GitHub OAuth přes Auth.js jako přihlášení do Tiny, a **Cloudflare R2 pro média je tím taky přípustné**.
2. **Kam s médii?** 1 377 souborů v gitu je nepraktické → S3-kompatibilní úložiště. Volba je mezi **Cloudflare R2** (levné, nulové poplatky za odchozí data, nic se nespravuje) a **MinIO na vlastním serveru** (o jednu službu víc k údržbě). Při GitHubu jako provideru není důvod se R2 vyhýbat.
3. ~~**Kdo bude spouštět buildy?**~~ **GitHub Actions** — Tina po uložení commitne, commit spustí workflow, ten nasadí statický build. Denní rebuild kvůli datům z debata21 API jde ze stejného workflow přes `schedule`.
4. ~~**Jak se redaktoři přihlašují?**~~ **GitHub OAuth.** Redakce je pár technicky zdatných lidí, kteří GitHub účet mají nebo si ho zvládnou založit — odpadá tím správa vlastních hesel. Pokud by se okruh rozšířil na netechnické lidi, přechází se na Auth.js s vlastním providerem a účty zakládanými ručně.
5. **Zálohy Postgresu a obnova.** Databáze drží index obsahu, ne obsah samotný (ten je v gitu), takže ztráta není fatální — ale je potřeba vědět, jak se index znovu postaví.
6. **Ověřit kompatibilitu `@tinacms/astro` s Astro 7** — dokumentace zmiňuje Astro 6+; Astro 7 je čerstvé. Před zahájením doporučuji postavit malé PoC.
7. **Jak dlouhý bude výpadek?** Doporučuji nový web spustit paralelně na testovací doméně, ověřit s redakcí, a teprve pak přepnout DNS.
