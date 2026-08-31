# Doporučená architektura

_Vychází z potvrzených omezení: **rekonstrukce 1:1** (ne nový design), **netechnická redakce ADK**, **vše self-hosted, žádný SaaS**, **vizuální editace je nutnost**._

Tato čtyři omezení dohromady vylučují většinu obvyklých řešení. Zbývají v podstatě dvě cesty.

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
- **Decap CMS** — projekt dlouhodobě málo aktivní
- **Headless WordPress** — nesplňuje „pryč od WordPressu“

## 2. Blocker, který je potřeba vyřešit jako první

**Obě self-hosted varianty potřebují Node.js runtime a databázi.** Současný web běží na PHP hostingu (VAS Hosting — mimochodem uvedený mezi partnery ADK, takže pravděpodobně sponzorský). Než se rozhodne o CMS, je nutné vědět:

1. Máte k dispozici server s Node.js (VPS, Docker), nebo jen PHP hosting?
2. Kdo ho bude platit a spravovat?
3. Je sponzoring od VAS Hosting vázaný na konkrétní typ služby?

Pokud Node server k dispozici není a nebude, **vizuální self-hosted editace je nedosažitelná** a bude nutné jedno z omezení uvolnit (buď připustit SaaS, nebo přijmout formulářovou editaci s Keystaticem, který běží bez serveru).

## 3. Návrh architektury (varianta TinaCMS)

```
┌─────────────────────────────────────────────────────────┐
│  Astro 7 + TypeScript                                    │
│  ├─ bloky jako .astro komponenty (~12 typů)              │
│  ├─ content collections se Zod schématem                 │
│  │   articles · pages · clubs · people · projects · docs │
│  └─ build → statické HTML                                │
└───────────────┬─────────────────────────┬────────────────┘
                │                         │
   ┌────────────▼───────────┐   ┌─────────▼──────────────┐
   │ TinaCMS (self-hosted)  │   │ debata21 API           │
   │ · vizuální editace     │   │ api-prod.debata21.cz   │
   │ · média, role, drafty  │   │ fetch při buildu       │
   │ · obsah → git          │   │ + denní rebuild        │
   │ · Postgres pro index   │   └────────────────────────┘
   └────────────┬───────────┘
                │ commit
        ┌───────▼────────┐
        │ git repozitář  │──► CI build ──► statický web za Cloudflare
        └────────────────┘
```

**Proč to takto:** web samotný zůstává statické HTML (rychlý, bezpečný, levný, nezávislý na tom, jestli CMS zrovna běží). Administrace je jediná část, která potřebuje server — a když spadne, web běží dál. To je přesný opak dnešního stavu, kdy pád PHP shodí celý web.

## 4. Nezávislost na editoru

Nezávisle na finální volbě doporučuji držet se jednoho pravidla:

> **Bloky jsou Astro komponenty s typovaným schématem. Editor je jen nadstavba, která do nich sype data.**

Prakticky to znamená definovat pro každý blok schéma (Zod), z něj generovat konfiguraci editoru, a nikdy nepsat logiku bloku uvnitř editoru. Když se po roce ukáže, že Tina nevyhovuje, vymění se administrace, ne web.

## 5. Otevřené otázky, které tato architektura přidává

1. **Je k dispozici Node server + Postgres?** (viz sekce 2 — blocker)
2. **Kam s médii?** 1 377 souborů v gitu je nepraktické → S3-kompatibilní úložiště (MinIO self-hosted, nebo Cloudflare R2 — to je ale opět externí služba).
3. **Kdo bude spouštět buildy?** Tina po uložení commitne, ale build a nasazení musí něco spustit (CI runner, webhook, cron).
4. **Ověřit kompatibilitu `@tinacms/astro` s Astro 7** — dokumentace zmiňuje Astro 6+; Astro 7 je čerstvé. Před rozhodnutím doporučuji postavit malé PoC.
5. **Jak dlouhý bude výpadek?** Doporučuji nový web spustit paralelně na testovací doméně, ověřit s redakcí, a teprve pak přepnout DNS.
