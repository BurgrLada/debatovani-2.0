# Vizuální editory typu Elementor pro Astro — co reálně existuje

_Požadavek: editor, kde jde volit sloupce, skládat sekce a zasahovat do stylů — tedy zážitek blízký Elementoru. Omezení zůstávají: self-hosted, žádný SaaS._

## 1. Přehled kandidátů (stav k 27. 8. 2026)

| Nástroj | Verze / licence | Sloupce a layout | Stylování | Vztah k Astru | Verdikt |
|---|---|---|---|---|---|
| **Puck** | `@puckeditor/core` 0.23.0, MIT, 13,2k ★, aktivní | **ano** — Slots API, nativní CSS grid a flex, drag-and-drop napříč dimenzemi, `resolveFields` (pole „sloupce/řádky“ se zobrazí jen uvnitř gridu) | pole si definujete sami (mezery, barvy, zarovnání); **není vizuální CSS panel** | React; oficiální recepty jen Next.js a React Router — **žádný oficiální Astro recept** | **nejlepší volba pro layoutovou volnost** |
| **GrapesJS** | 0.23.6, BSD-3-Clause, ~25,8k ★, aktivní | ano, volné | **ano — Style Manager, vizuální editace CSS vlastností** (margin, padding, typografie, barvy) = nejblíž Elementoru | framework-agnostic (vanilla JS), do Astra se dá vložit, ale **výstupem je volný HTML+CSS**, ne komponenty | funkčně nejblíž, architektonicky nejhorší (viz 3.2) |
| **Webstudio** | 0.293.0, AGPL-3.0, self-host přes Docker | ano, plná kontrola | **ano — podporuje všechny CSS vlastnosti**, design tokeny, breakpointy | **nahrazuje Astro** — exportuje Remix/React aplikaci | vážný kandidát, ale znamená opustit Astro |
| **TinaCMS** | 3.12.1, Apache-2.0 | ne — pořadí bloků ano, sloupce jen jako předdefinované varianty | ne | **nejlepší** — `@tinacms/astro`, vizuální editace bez Reactu | výborné CMS, ale ne page builder |
| **Sveltia / Decap CMS** | 0.201.1 / 3.15.1, MIT | ne — jen řazení bloků v panelu | ne | framework-agnostic, funguje | **nejlevnější provoz** (bez serveru), ale bez layoutové volnosti — viz [08-git-based-cms.md](08-git-based-cms.md) |
| Plasmic | `@plasmicapp/loader-react` 2.0.21 MIT | ano | ano | React | **odpadá** — Studio (samotný editor) je proprietární, self-hosting nedokumentovaný |
| Craft.js | 0.2.12, MIT | knihovna pro stavbu builderů | – | React | **odpadá** — poslední vydání únor 2025, stagnuje |
| Silex | 3.0.0-alpha.17, GPL/MPL | ano | ano (staví na GrapesJS) | samostatný builder | **odpadá** — alfa, mimo Astro |
| Astro Visual Editor | MIT, beta | přeskládání sekcí | **ne** — „Elementor/Divi-grade styling“ je na roadmapě | píše přímo do `.astro` souborů | **odpadá** — 2 ★, 23 commitů, výslovně jen pro lokální vývoj |
| GrapesJS Studio SDK | 1.1.1, **komerční licence** | ano | ano | – | odpadá (není open-source) |

## 2. Odpověď na otázku „je něco vyladěného přímo pro Astro?“

Krátce: **ne.** Ekosystém Astra je vyladěný na *obsah*, ne na *layout*. Nejlepší integrace (TinaCMS) je CMS s živým náhledem, ne page builder. Nástroje s Elementor-like volností (Puck, GrapesJS, Webstudio) o Astru nevědí a integrace je vždycky na vás.

Důvod je architektonický, ne náhodný: Elementor umí volné stylování proto, že **generuje CSS za běhu na serveru** (proto těch 28 CSS souborů a `post-9.css`, `post-2642.css` na dnešním webu). Astro generuje statické soubory při buildu — takže volné CSS z editoru musí skončit buď jako inline styly v HTML, nebo jako per-stránkový CSS soubor generovaný při buildu. Obojí jde, ale je to práce navíc a znovu to nahlodává výkon.

## 3. Tři reálné cesty

### 3.1 Puck — layoutová volnost bez ztráty kontroly

Puck od verze 0.18 umí přesně to, co popisujete v layoutové části:

- **Slots API** — komponenty do sebe vnořujete, každý slot je drop zóna
- **nativní CSS grid a flex** — zadáte `display: grid` na kontejner a Puck zvládne drag-and-drop ve dvou rozměrech
- **`resolveFields`** — pole „počet sloupců / řádků“ se editorovi zobrazí jen tehdy, když je blok uvnitř gridu

Co Puck **nedá zadarmo**, je stylovací panel. To ale není nutně ztráta: místo pole „vlož libovolné CSS“ definujete pole jako *„mezera: malá / střední / velká“*, *„pozadí: bílá / krémová / modrá“* — hodnoty jsou navázané na design tokeny webu. Redakce dostane volnost skládat, ale nemůže rozbít vzhled. **Pokud opravdu chcete raw CSS, jde přidat pole `className` nebo `style` a máte i to** — je to jeden field v konfiguraci bloku.

Cena zůstává stejná jako v `06-doporucena-architektura.md`: Puck je editor, ne CMS. Autentizaci, média, drafty a správu 357 článků je potřeba dodat odjinud.

### 3.2 GrapesJS — jediný se skutečným CSS panelem

GrapesJS má Style Manager, tedy přesně ten pravý sloupec z Elementoru s číselníky pro padding, typografii a barvy. Je BSD-3, self-hosted, aktivně vyvíjený, nejzralejší open-source builder na trhu.

Háček: **GrapesJS pracuje s HTML a CSS, ne s vašimi komponentami.** Uloží vám blob HTML + CSS, který do Astro stránky vložíte přes `set:html`. Tím ale ztrácíte prakticky všechno, kvůli čemu jdete do Astra:

- žádná optimalizace obrázků (`astro:assets`), žádné WebP/AVIF a `srcset`
- žádné typované schéma, žádná kontrola, že blok má vyplněný nadpis
- redakce může vygenerovat libovolné CSS → **za dva roky jste zpátky u dnešního stavu, jen bez WordPressu**

Použil bych ho jen tehdy, kdyby volné CSS bylo tvrdý požadavek nadřazený všemu ostatnímu.

### 3.3 Webstudio — Elementor-like zážitek, ale bez Astra

Webstudio je nejblíž tomu, co znáte z Elementoru či Webflow: vizuální plátno, všechny CSS vlastnosti, breakpointy, design tokeny, napojení na headless CMS. Je AGPL-3.0 a **self-hostovatelný přes Docker**.

Zásadní ale je, že **Webstudio Astro nedoplňuje, nýbrž nahrazuje** — projekt exportuje jako Remix/React aplikaci. Volba tedy nezní „Astro + Webstudio“, ale „Astro, nebo Webstudio“.

Pokud je vizuální stavba stránek úplně nejdůležitější kritérium, je poctivé Webstudio zvážit jako alternativu k celému návrhu. Nevýhody: AGPL (kopírovací licence, u neziskovky nevadí), menší ekosystém, a rekonstrukce 400 sekcí by se dělala ručně stejně jako jinde.

## 4. Trade-off, který je potřeba vědomě rozhodnout

Stojí za to pojmenovat napětí v zadání: **odcházíte z Elementoru mimo jiné proto, že produkoval 2,5 MB assetů a nekonzistentní stránky — a zároveň chcete jeho volnost.** Obojí najednou úplně nejde. Škála vypadá takhle:

```
volnost pro redakci ────────────────────────────────► kontrola nad výsledkem
GrapesJS          Webstudio         Puck            Puck s tokeny      TinaCMS
(volné CSS)    (plné CSS, tokeny)  (+ style pole)   (jen varianty)    (jen obsah)
```

**Moje doporučení: mířit na „Puck s tokeny“** — tedy sloupce, mřížka, řazení a výběr z připravených variant (mezery, pozadí, zarovnání), ale ne libovolné CSS. Redakce dostane 90 % pocitu Elementoru a web si udrží konzistenci. Únikový ventil pro výjimky (pole `className`) můžete přidat a dát ho jen správci.

## 5. Jak to mění dřívější doporučení

Doporučení z `06-doporucena-architektura.md` (TinaCMS) platilo pro zadání „vizuální editace = vidím, co píšu“. Pokud je požadavek silnější — **„chci skládat sloupce a sahat na styly“** — pak Tina nestačí a nejlepší self-hosted kombinace je:

> **Astro (web) + Puck (stavba stránek) + Directus (uživatelé, média, články, kluby, lidé)**

Proč zrovna Directus: dodá přesně to, co Pucku chybí, a nic z toho nemusíte psát — administrace, role, knihovna médií, verzování, REST/GraphQL API, i18n. Běží v Dockeru vedle webu. Licence MSCL-1.0-GPL je **pro interní použití vlastní organizace a nekomerční účely zdarma** (po čtyřech letech se každá verze uvolňuje pod GPL-3.0), takže pro ADK je to bez poplatku. Puck JSON se ukládá jako pole v Directus kolekci `pages`.

Rozdělení rolí je pak čisté:

| Vrstva | Nástroj |
|---|---|
| web, výkon, SEO, build | Astro 7 + TypeScript |
| stavba a rozvržení stránek | Puck (bloky jako React komponenty) |
| články, lidé, kluby, projekty, dokumenty | Directus kolekce |
| uživatelé, role, média | Directus |
| akce a přihlášky | `debata21` API (beze změny) |

Stále platí pravidlo z `06`: **schéma bloku je zdroj pravdy, editor je jen nadstavba.** Když Puck nevyjde, vymění se editor, ne web.

## 6. Co ověřit v PoC

1. **Puck + Astro** — neexistuje oficiální recept, takže první věc k ověření: React bloky renderované Astrem staticky (bez hydratace) + Puck editor jako samostatná stránka v SSR režimu.
2. Jak se do Puck bloků dostanou **optimalizované obrázky** (v Astru `astro:assets`, v Reactu ne — pravděpodobně předgenerovat varianty přes Directus).
3. Kolik z 12 bloků z `05-rekonstrukce-rozsah.md` jde postavit jako **jeden konfigurovatelný blok** místo dvanácti.
4. Nechat redakci ADK zkusit obě varianty (Puck vs. Tina) na jedné stránce a rozhodnout podle reakce, ne podle specifikace.
