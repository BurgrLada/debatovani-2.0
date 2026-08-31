# Inventura obsahu a navrhovaný obsahový model

## 1. Inventura (co dnes na webu je)

**Rozsah:** 67 stránek, 357 článků, 1 377 mediálních souborů, 18 rubrik, 6 autorů.

### Sekce a jejich charakter

| Sekce | Rozsah | Charakter obsahu | Kdo je publikum |
|---|---|---|---|
| Homepage | 1 | marketingová landing page, 10 sekcí | veřejnost, noví zájemci |
| `/debata/` – Debatní liga, Debatiáda, Kurzy, Začněte debatovat, Školení učitelů, Minulé ročníky, Infoweb pro rozhodčí | ~20 stránek | evergreen popis programů + sezónně aktualizované detaily | školy, učitelé, žáci |
| `/aktuality/` + rubriky | 357 článků | novinky, výzvy, výsledky, tiskové zprávy, výnosy | debatérstvo, členové |
| `/dokumenty/` | ~8 stránek | rozcestník na Google Drive (zápisy, soutěžní dokumenty, metodika, přihláška) | členové, funkcionáři |
| `/o-nas/` – Lidé, Historie, Cíle programu, Podpořte nás | 6 stránek | statické, mění se 1–2× ročně | dárci, novináři, partneři |
| `/projekty/` + dokončené projekty | 12 stránek | popis grantových projektů, povinná publicita | donoři, hodnotitelé grantů |
| `/kontakt/` + Mapa klubů + Newsletter | 3 stránky | kontakt, Google My Maps embed | zájemci |
| `/portal/` | 1 stránka | rozcestník pro aktivní debatéry a kouče, dynamický (JS) | interní komunita |
| `/fotogalerie/`, `/ucebnice/`, `/faq/`, `/rozhodci/`, `/padlet/` | 5 stránek | samostatné utility | různé |
| `/en/` | 1 stránka | osamocená anglická homepage | zahraniční partneři |
| `/testovaci-stranka/` | 1 | **smetí k odstranění** | – |

### Dvě odlišná publika, jeden web

Z inventury vychází zásadní zjištění pro informační architekturu:

- **Vnější web** (získat nové školy, žáky, dárce, novináře) — homepage, programy, kurzy, o nás, podpořte nás
- **Vnitřní provozní portál** (obsloužit stávající komunitu) — portál, dokumenty, rozhodčí, infoweb, výsledky, přihlášky

Dnes se tyto dvě věci mísí v jedné navigaci (`Portál debatování` je první tlačítko v hlavním menu, hned vedle marketingových sekcí). **Redesign je příležitost je zřetelně oddělit** — nový návštěvník ze školy nepotřebuje „Infoweb pro rozhodčí“ a debatér nepotřebuje „Proč debatovat?“.

## 2. Navrhovaný obsahový model

Místo dnešního „všechno je WP stránka nakreslená v Elementoru“ navrhuji tyto typy obsahu (v Astru = content collections nebo kolekce v CMS):

| Typ | Pole | Odkud dnes | Poznámka |
|---|---|---|---|
| **article** (aktualita) | title, slug, date, perex, cover, body, kategorie[], autor, jazyk | WP posty | 357 ks, migrace skriptem |
| **page** (obsahová stránka) | title, slug, body/bloky, SEO | WP stránky | ~50 po pročištění, kreslí se znovu |
| **club** (debatní klub) | název, škola, město, kraj, GPS, kontakt, web, typ (SŠ/ZŠ/online), aktivní | **nikde – dnes jen v Google My Maps** | vytvořit; 44 klubů dle homepage |
| **person** (člověk) | jméno, role, orgán, foto, bio, e-mail, období | WP stránka Lidé (ručně) | ~30 osob, 5 skupin |
| **project** (projekt) | název, období, donor, logo, popis, výstupy, stav | WP stránky | 12 ks, důležité pro publicitu grantů |
| **document** (dokument) | název, kategorie, platnost od, soubor/odkaz, jazyk | Google Drive odkazy | zachovat Drive jako úložiště, jen indexovat |
| **event** (akce) | **nevytvářet – čte se z `debata21` API** | `api-prod.debata21.cz/api/event` | jen mapování na typ + cache |
| **partner** | název, logo, url, typ (donor/partner) | homepage ručně | 8 ks |

### Bloky pro stránky

Aby byly stránky editovatelné bez programátora, potřebujeme uzavřenou sadu bloků (~12–15), ne volný builder:

`Hero`, `TextBlok`, `TextSObrázkem`, `SeznamVýhod` (ikona+nadpis+text), `Statistiky`, `CTAPás`, `Akordeon/FAQ`, `KrokyProcesu`, `KartyOdkazů`, `Citace/Reference`, `LogaPartnerů`, `Formulář`, `MapaKlubů`, `SeznamAktualit`, `SeznamAkcí`, `Tabulka/Termíny`.

Tohle je klíčový návrhový krok: **omezená sada bloků je to, co brání tomu, aby web za dva roky zase vypadal jako Elementor.** Editor smí skládat, ne stylovat.

## 3. Migrace

| Co | Jak | Náročnost |
|---|---|---|
| 357 článků | skript: WP REST API → HTML → Markdown (`turndown`/`rehype-remark`), zachovat slug, datum, rubriky, autora | **nízká**, obsah je čistý Gutenberg |
| Média (1 377 souborů) | stáhnout `wp-json/wp/v2/media`, přegenerovat na WebP/AVIF, pročistit nepoužité | střední; reálně použitých bude výrazně méně |
| Stránky (67) | **ruční překreslení do nových bloků**, obsah přenést copy-paste | vysoká – hlavní časová položka projektu |
| Kluby | ručně vytáhnout z Google My Maps (export KML) → JSON/CMS | nízká, jednorázově |
| Lidé, projekty, partneři | ručně, jednorázově | nízká |
| Akce | integrace API, žádná migrace dat | nízká |
| URL | mapovací tabulka starých → nových URL + 301 redirecty | **nutné**, jinak ztráta SEO |

Doporučuji migraci článků udělat jako **opakovatelný skript** (ne jednorázový ruční export) — během vývoje totiž redakce publikuje dál a před spuštěním se bude potřebovat doběhnout.

## 4. Co při redesignu vyřadit

- `/testovaci-stranka/`
- ručně generovaný `sitemap.xml` v rootu
- The Events Calendar (prázdný, akce jdou z API)
- WooCommerce/Give CSS (pluginy nejsou nasazeny)
- fullscreen iframe na `portal.debatovani.cz` → nahradit skutečnou stránkou nebo redirectem
- rozhodnout osud `elearning.debatovani.cz` (dnes HTTP 500)
