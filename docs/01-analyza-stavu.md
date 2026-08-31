# Analýza současného stavu webu debatovani.cz

_Zpracováno 27. 8. 2026 na základě veřejně dostupných dat (HTML, WP REST API, sitemapy, HTTP hlavičky)._

## 1. Technologický stack

| Vrstva | Co je nasazeno | Poznámka |
|---|---|---|
| CMS | WordPress 7.0.2 | aktuální jádro |
| Page builder | **Elementor 3.12.1 + Elementor Pro** | aktuální řada je 4.2.3 → zaostání o ~3 roky a několik major verzí |
| Šablona | `alone` + `alone-child` (komerční charity téma) | + plugin `bearsthemes-addons` (addony k šabloně) |
| Formuláře | WPForms Lite | kontaktní formulář, newsletter |
| Kalendář | The Events Calendar | **nainstalováno, ale prázdné** (`tribe_events` = 0 záznamů) |
| SEO | Yoast SEO | sitemapy, OG tagy, JSON-LD funguje |
| Analytika | Google Site Kit, GTM `GTM-TV358PC`, GA4 `GT-55JLHDR` | |
| CDN / proxy | Cloudflare | `cf-cache-status: DYNAMIC`, `cache-control: max-age=3` → HTML se prakticky necachuje |
| Externí backend | **`api-prod.debata21.cz` (Lumen 9 / Laravel)** | vlastní systém akcí a přihlášek, viz níže |

### Vlastní systém „debata21“ — nejdůležitější nález

Na homepage i na stránce `/portal/` je do Elementoru vlepený **inline JavaScript**, který si za běhu v prohlížeči stahuje data z `https://api-prod.debata21.cz/api/event` a renderuje z nich blok „Přihlaste se na nejbližší událost“ a seznam akcí na portálu.

- endpoint je veřejný, vrací JSON s poli `name {cs,en}`, `beginning`, `end`, `place`, `soft_deadline`, `hard_deadline`, `note {cs,en}`, `organizer`, `competition`, `membership_required`, …
- data jsou **dvojjazyčná už na úrovni API**
- aktuálně 4 nadcházející akce, filtruje se `organizer === "adk"`
- další endpointy: `/api/debate` (veřejný), `/api/user`, `/api/team` (401 – autorizované)

Znamená to, že **kalendář akcí, přihlašování a evidence debat žijí mimo WordPress** a redesign se jich netýká — musí se na ně ale čistě napojit (v Astru ideálně serverovým fetchem při buildu + pravidelný rebuild, ne klientským JS).

### Subdomény a satelity

| Adresa | Co to je |
|---|---|
| `portal.debatovani.cz` | jen HTML stránka s `<iframe>` na `debatovani.cz/portal` — **fullscreen iframe hack**, špatné pro SEO i sdílení odkazů |
| `elearning.debatovani.cz` | vrací **HTTP 500** (rozbitý WordPress) |
| `pds.debatovani.cz` | Prague Debate Spring 2026, samostatný web |
| `api-prod.debata21.cz` | Lumen API (viz výše) |

## 2. Výkon a technický dluh

Naměřeno na homepage:

- **HTML: 166 kB** (samotný dokument, bez assetů)
- **28 CSS souborů + 30 JS souborů** načítaných v hlavičce
- **~2,5 MB JS + CSS** v nekomprimované podobě (po gzipu odhadem 600–800 kB)
- **10 inline `<style>` bloků** (Elementor generuje per-page CSS: `post-9.css`, `post-2642.css`, `post-11429.css`, …)
- jQuery + jQuery Migrate + jQuery UI, Font Awesome (3 soubory), Swiper, Waypoints, magnific-popup, tooltipster, **CSS pro WooCommerce a Give (dárcovský plugin), které na webu nejsou**
- Google Fonts: Roboto se **všemi 18 řezy** (100–900 + kurzívy)
- největší obrázek na homepage: `mapa_ADK.webp` **295 kB**, fotky 84–98 kB, žádný `srcset` u části obrázků, 8 z 20 `<img>` bez `width`/`height` (layout shift)

TTFB je přitom dobrý (~0,1 s) — problém není server, ale **množství a organizace assetů**. To je přesně ta část, kterou statický generátor odstraní téměř zdarma.

## 3. Přístupnost a UX

- **19 z 20 obrázků na homepage má prázdný `alt=""`** včetně loga a klíčových fotek → čtečky obrazovky nedostanou nic. Pro organizaci, která má v portfoliu inkluzivní projekty (debatování se sebeobhájci, romská debatní liga), je to citlivé místo. Od 28. 6. 2025 navíc platí zákon č. 424/2023 Sb. (evropský akt o přístupnosti) — na neziskový web se sice nevztahuje povinnost jako na veřejnou správu, ale je to argument u grantů.
- Hero text je vysázen **přes fotografii bez ztmavovací vrstvy** → nízký kontrast na světlých místech snímku.
- Hlavní menu má **6 položek jako barevná tlačítka**, na užších desktopech přetéká; navigace je pastelově barevná bez zjevné logiky hierarchie.
- **Žádná cookie lišta** při nasazeném GTM + GA4 → rozpor s § 89 odst. 3 zákona o elektronických komunikacích (nutný souhlas před uložením cookies).
- **404 stránka je anglicky** („Page not found“) na českém webu.
- Chybí vyhledávání na webu (formulář `s=` v šabloně nenalezen, jen JSON-LD `SearchAction`).
- Stránka `/aktuality/` vypisuje jen název, datum, autora a kategorii — **bez perexu a bez náhledového obrázku**, 60 stránek stránkování, žádné filtrování podle kategorie.

## 4. SEO a struktura URL

- Yoast sitemapy fungují: **357 příspěvků, 67 stránek, 18 kategorií, 6 autorů**.
- V rootu leží navíc **zastaralý ručně generovaný `sitemap.xml`** (xml-sitemaps.com, `lastmod` 2023) — konkuruje `wp-sitemap.xml`.
- **Anglická verze je jediná osamocená stránka `/en/`** (kopie homepage), bez `hreflang`, bez propojení, bez anglického obsahu jinde. Přitom kategorie „Debate League“ má 31 anglických článků a API vrací dvojjazyčná data.
- Chybí bezpečnostní hlavičky: **žádné HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy**.
- URL struktura je jinak čistá a hierarchická (`/debata/debatni-liga/`, `/o-nas/lide/`) — **při redesignu ji zachovat**, jinak přijdete o pozice u 357 článků.

## 5. Závislost na Google službách

Provoz webu dnes stojí na ručně vkládaných Google odkazech:

- **mapa debatních klubů = embedovaná Google My Maps** (`google.com/maps/d/embed?mid=…`) — data o klubech nejsou nikde strukturovaná, mapa se needituje z webu
- **přihlášky a formuláře = Google Forms** odkazované z článků
- **dokumenty = Google Drive** (stránka `/dokumenty/` neobsahuje ani jeden odkaz na PDF na vlastním serveru)
- **Padlet, Tabbycat, Discord** jako další externí nástroje odkazované z portálu

To není samo o sobě špatně (levné, provozně jednoduché), ale znamená to, že **web je z velké části rozcestník**, a redesign musí tuto roli respektovat, ne se ji snažit nahradit.

## 6. Redakční provoz

Počty publikovaných článků podle roku (WP REST API):

| 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026* |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 44 | 39 | 36 | 44 | 39 | 41 | 37 | 27 | 44 |

_*do 27. 8. 2026_

Tedy **stabilně 35–45 článků ročně, cca 3 měsíčně, 6 autorů**. Redakce je živá a netechnická — to je nejsilnější vstup do rozhodování o CMS.

Nejsilnější rubriky: Debatní liga (140), Zahraničí (74), Asociace (71), Debatiáda (43), Ředitelství soutěží (34), Debate League (31, anglicky).

**Články jsou v Gutenbergu, čistý sémantický HTML, bez Elementoru** (`wp-block-paragraph`, `<!--more-->`) a **bez náhledových obrázků** (`featured_media: 0` napříč vzorkem). Migrace článků do Markdownu je proto strojově proveditelná.
**Stránky jsou naopak plně v Elementoru** — ty se stejně budou kreslit znovu.

## 7. Shrnutí: co redesign má vyřešit

1. Odstranit 2,5 MB balastu a Elementor jako závislost (výkon, rychlost, Core Web Vitals).
2. Dát článkům perex, obrázek, filtrování podle rubrik a použitelný archiv.
3. Zpřístupnit web (alt texty, kontrast, klávesnice, cookie souhlas).
4. Udělat z **mapy klubů datový obsah** místo Google My Maps embedu.
5. Napojit akce z `debata21` API serverově, ne klientským JS vlepeným do builderu.
6. Vyřešit anglickou verzi jako plnohodnotnou jazykovou mutaci, nebo ji vědomě zrušit.
7. Sjednotit portál (zrušit iframe subdoménu) a opravit/vyřadit rozbitý e-learning.
8. Zachovat URL a nastavit redirecty pro to, co se změní.
