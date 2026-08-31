# debatovani.cz 2.0

Redesign webu Asociace debatních klubů z.s. (https://debatovani.cz).

**Fáze:** analýza. Zatím se neprogramuje.

**Zadání:** nevzniká nový vzhled — jde o **rekonstrukci stávajícího webu v jiné technologii** (odchod z WordPressu k vlastnímu řešení). Obsah bude spravovat netechnická redakce ADK. Potvrzená omezení: **vše self-hosted (žádný SaaS)** a **vizuální editace je nutnost**.

## Podklady

| Dokument | Obsah |
|---|---|
| [docs/01-analyza-stavu.md](docs/01-analyza-stavu.md) | Technický a obsahový audit současného webu |
| [docs/02-obsahovy-model.md](docs/02-obsahovy-model.md) | Inventura obsahu, navrhovaný obsahový model, plán migrace |
| [docs/03-technologie.md](docs/03-technologie.md) | Hodnocení volby Astro + Puck a alternativ |
| [docs/04-otazky.md](docs/04-otazky.md) | Otevřené otázky k zodpovězení před návrhem |
| [docs/05-rekonstrukce-rozsah.md](docs/05-rekonstrukce-rozsah.md) | **Měřený rozsah rekonstrukce** — inventura Elementor widgetů, sada bloků, postup |
| [docs/06-doporucena-architektura.md](docs/06-doporucena-architektura.md) | **Doporučená architektura** — Puck vs. TinaCMS self-hosted, blocker s hostingem |
| [docs/07-editory-elementor-like.md](docs/07-editory-elementor-like.md) | **Editory typu Elementor** — Puck, GrapesJS, Webstudio a co z nich pro Astro dává smysl |
| [docs/08-git-based-cms.md](docs/08-git-based-cms.md) | **Git-based CMS** — Sveltia, Decap, Pages CMS; varianta bez serveru a bez databáze |
| [docs/09-tinacms-prakticky.md](docs/09-tinacms-prakticky.md) | **TinaCMS prakticky** — WYSIWYG, bloky, vícejazyčnost, custom HTML |
| [docs/10-i18n-varianty.md](docs/10-i18n-varianty.md) | **Vícejazyčnost** napříč kandidáty — proč Puck + CMS i18n nevyřeší, kde je Payload silnější |

## Rychlé shrnutí

- Současný web: WordPress 7.0.2 + **Elementor 3.12.1** (aktuální řada 4.2.3 — zaostání ~3 roky), šablona `alone`, 357 článků, 67 stránek.
- Výkon: 166 kB HTML, 28 CSS + 30 JS souborů, ~2,5 MB assetů na homepage.
- Akce a přihlášky běží mimo WordPress na vlastním API `api-prod.debata21.cz` (Lumen/Laravel), dnes tažené klientským JS vlepeným do Elementoru.
- Mapa klubů = Google My Maps embed, dokumenty = Google Drive, přihlášky = Google Forms.
- **94 % obsahu stránek tvoří čtyři widgety** (nadpis, text, obrázek, tlačítko) — rekonstrukce vystačí s ~12 bloky. Těžiště práce je 67 stránek × ~6 sekcí, které se musí překlikat.
- **Astro + TypeScript: doporučeno.** **Puck: použitelný, ale sám o sobě není CMS** — chybí mu autentizace, média, verzování a drafty; pro netechnickou redakci by se to vše muselo dostavět. Viz [docs/03-technologie.md](docs/03-technologie.md) a [docs/05](docs/05-rekonstrukce-rozsah.md).
