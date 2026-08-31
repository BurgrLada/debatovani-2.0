# debatovani.cz 2.0

Redesign webu Asociace debatních klubů z.s. (https://debatovani.cz).

**Fáze:** implementace běží. Web stojí na Astru + TinaCMS, obsah je zmigrovaný z WordPressu. Co zbývá dodělat, je v [docs/13-todo.md](docs/13-todo.md); jak to funguje, popisuje [docs/12-implementace.md](docs/12-implementace.md).

## Rychlý start

```bash
pnpm install
pnpm dev      # web na http://localhost:4321, administrace na /admin
```

`pnpm dev` potřebuje terminál s TTY — bez něj se `astro dev` odpojí na pozadí
a Tina server skončí s ním. V takovém případě spusťte `pnpm exec tinacms dev`
a `pnpm exec astro dev --background` zvlášť.

```bash
pnpm build    # produkční build
pnpm check    # kontrola typů
```

Migrace z WordPressu (opakovatelná, pouští se znovu před spuštěním):

```bash
node scripts/migrate-articles.mjs
node scripts/migrate-pages.mjs
```

**Zadání:** nevzniká nový vzhled — jde o **rekonstrukci stávajícího webu v jiné technologii** (odchod z WordPressu k vlastnímu řešení). Obsah bude spravovat **pár technicky zdatných lidí**, kterým se má dát v editoru spíš víc volnosti. Potvrzená omezení: **žádný SaaS pro CMS a obsah** a **vizuální editace je nutnost**. **Node server s databází je k dispozici** — hosting není omezení. **Git provider je GitHub** — omezení „žádný SaaS“ se netýká vývojové infrastruktury.

## Podklady

| Dokument | Obsah |
|---|---|
| [docs/01-analyza-stavu.md](docs/01-analyza-stavu.md) | Technický a obsahový audit současného webu |
| [docs/02-obsahovy-model.md](docs/02-obsahovy-model.md) | Inventura obsahu, navrhovaný obsahový model, plán migrace |
| [docs/03-technologie.md](docs/03-technologie.md) | Hodnocení volby Astro + Puck a alternativ |
| [docs/04-otazky.md](docs/04-otazky.md) | Otevřené otázky k zodpovězení před návrhem |
| [docs/05-rekonstrukce-rozsah.md](docs/05-rekonstrukce-rozsah.md) | **Měřený rozsah rekonstrukce** — inventura Elementor widgetů, sada bloků, postup |
| [docs/06-doporucena-architektura.md](docs/06-doporucena-architektura.md) | **Doporučená architektura** — Puck vs. TinaCMS, provozní model, pořadí inicializace |
| [docs/07-editory-elementor-like.md](docs/07-editory-elementor-like.md) | **Editory typu Elementor** — Puck, GrapesJS, Webstudio a co z nich pro Astro dává smysl |
| [docs/08-git-based-cms.md](docs/08-git-based-cms.md) | **Git-based CMS** — Sveltia, Decap, Pages CMS; záložní varianta bez serveru a bez databáze |
| [docs/09-tinacms-prakticky.md](docs/09-tinacms-prakticky.md) | **TinaCMS prakticky** — WYSIWYG, bloky, vícejazyčnost, custom HTML |
| [docs/10-i18n-varianty.md](docs/10-i18n-varianty.md) | **Vícejazyčnost** napříč kandidáty — proč Puck + CMS i18n nevyřeší, kde je Payload silnější |
| [docs/11-design-tokeny.md](docs/11-design-tokeny.md) | **Design tokeny** — paleta a typografie změřená z loga a stávajícího webu, oddělení značky od šablony |
| [docs/12-implementace.md](docs/12-implementace.md) | **Implementace** — co je hotové, struktura projektu, jak přidat blok, na co si dát pozor |
| [docs/13-todo.md](docs/13-todo.md) | **Co zbývá** — seřazené podle toho, co blokuje spuštění |

## Rozhodnutá architektura

**Astro 7 + TypeScript + TinaCMS self-hosted, všechno v jednom projektu.**

- Web je **statické HTML** (`output: 'static'` + adaptér), servírované z cache.
- Administrace běží jako **`prerender = false` routy uvnitř téhož projektu** — `/admin` a `/api/tina/*` obsluhuje Node proces. Když spadne, web běží dál.
- Obsah je v **gitu** (Markdown/MDX + JSON), Postgres drží jen index. Média v S3-kompatibilním úložišti.
- Bloky jsou **`.astro` komponenty se Zod schématem** — editor je jen nadstavba, která do nich sype data.
- **Rozdělení administrace do samostatné služby je varianta do budoucna**, ne výchozí stav. Sáhne se po ní, až začne vadit redeploy uprostřed editace, kolize React verzí (Puck) nebo sdílené prostředí s přístupovými údaji. Migrace je levná, proto se neřeší dopředu.
- **Inicializace: nejdřív Astro, pak `@tinacms/cli init`** — ne `create-tina-app`. Detaily a pořadí kroků v [docs/06](docs/06-doporucena-architektura.md), sekce 4.
- **GitHub Actions** spouští buildy, **GitHub OAuth** přihlašuje do administrace, média na **Cloudflare R2**.
- **Adresářová konvence pro jazyky od začátku** (`content/<kolekce>/<jazyk>/…`), i když se o rozsahu anglické verze rozhodne později.
- **Portál debatování je rozšíření** — obsahový model ani routing hlavního webu se od něj neodvozují.
- **Design tokeny jsou hotové** — [docs/11](docs/11-design-tokeny.md). Značku tvoří limetka `#C8DA2B`, modrá `#00B2EF`, oranžová `#F6862F` a uhel `#15191C`. Písma: Poppins (nadpisy) + Roboto (text), self-hosted, Roboto Slab se vypustil.
- **Paleta zůstala 1:1 včetně pastelové linie**, protože zadáním je věrná rekonstrukce. Tokeny jsou ale dvouvrstvé — přebarvení webu je změna jednoho souboru. Přechod na kontrastní varianty podle [docs/11](docs/11-design-tokeny.md) sekce 2 je otevřený úkol ([docs/13](docs/13-todo.md), bod 11).
- **Portál debatování je přenesený 1:1** včetně vlastního JS — stojí mimo blokový systém, protože i na starém webu stál mimo šablonu.
- **Web je dvojjazyčný**: čeština na kořeni, angličtina pod `/en/`, přepínač vlaječkou v hlavičce. Anglicky je zatím úvodní stránka a celé rozhraní — stejný rozsah jako dnes, jen připravený na rozšíření.

## Rychlé shrnutí analýzy

- Současný web: WordPress 7.0.2 + **Elementor 3.12.1** (aktuální řada 4.2.3 — zaostání ~3 roky), šablona `alone`, 357 článků, 67 stránek.
- Výkon: 166 kB HTML, 28 CSS + 30 JS souborů, ~2,5 MB assetů na homepage.
- Akce a přihlášky běží mimo WordPress na vlastním API `api-prod.debata21.cz` (Lumen/Laravel), dnes tažené klientským JS vlepeným do Elementoru.
- Mapa klubů = Google My Maps embed, dokumenty = Google Drive, přihlášky = Google Forms.
- **94 % obsahu stránek tvoří čtyři widgety** (nadpis, text, obrázek, tlačítko) — rekonstrukce vystačí s ~12 bloky. Těžiště práce je 67 stránek × ~6 sekcí, které se musí překlikat.
- **Astro + TypeScript: doporučeno.** **Puck: použitelný, ale sám o sobě není CMS** — chybí mu autentizace, média, verzování a drafty; to vše by se muselo dostavět. Viz [docs/03-technologie.md](docs/03-technologie.md) a [docs/05](docs/05-rekonstrukce-rozsah.md).
