# Rekonstrukce webu 1:1 — měřený rozsah práce

_Upřesněné zadání: nevzniká nový vzhled. Jde o **rekonstrukci stávajícího webu v jiné technologii** — odchod z WordPressu k vlastnímu řešení._

> **Pozor na dataci:** tento dokument vznikl, když se počítalo s netechnickou redakcí. Od 31. 8. 2026 platí, že web bude spravovat **pár technicky zdatných lidí** s velkou volností v editoru. Měřená čísla o rozsahu rekonstrukce platí beze změny; úvahy o volbě CMS v sekci 3 jsou nahrazené [06-doporucena-architektura.md](06-doporucena-architektura.md).

Toto zadání mění těžiště projektu: úspěch se neměří tím, jak web vypadá, ale tím, jestli **redakce zvládne po přechodu dělat všechno, co dělala dřív**, a jestli se stránky podařilo replikovat věrně. Následující čísla jsou naměřená na všech 67 stránkách webu.

## 1. Z čeho jsou stránky doopravdy složené

Prošel jsem všech 67 stránek a spočítal použité Elementor widgety:

| Widget | Výskytů | Na kolika stránkách | Co to je |
|---|---|---|---|
| `heading` | 565 | 66 | nadpis |
| `text-editor` | 284 | 66 | odstavec / rich text |
| `image` | 245 | 66 | obrázek |
| `button` | 147 | 19 | tlačítko |
| `divider` | 24 | 8 | oddělovač |
| `be-icon-box` | 19 | 2 | ikona + nadpis + text |
| `icon-list` | 18 | 8 | seznam s ikonami |
| `be-counter` | 14 | 3 | počítadlo (statistiky) |
| `spacer` | 13 | 10 | mezera |
| `shortcode` | 11 | 10 | vložený formulář |
| `accordion` | 3 | 2 | rozbalovací seznam |
| `tabs` | 2 | 2 | záložky |
| `be-logo-carousel` | 2 | 2 | loga partnerů |
| `hotspot` | 2 | 2 | interaktivní body v obrázku |
| `google_maps` | 1 | 1 | mapa |
| `html` | 67 | 66 | vlastní HTML/JS (mj. napojení na `debata21` API) |

**Klíčové zjištění: 1 241 z 1 313 obsahových widgetů (94 %) jsou čtyři typy — nadpis, text, obrázek, tlačítko.** Zbytek je dlouhý ocas věcí použitých na jedné dvou stránkách.

### Layout

- **400 sekcí celkem, průměrně 6 na stránku**
- šířky sloupců: 100 % (404×), 50 % (342×), 33 % (168×), 25 % (44×), 20 % (5×) — standardní mřížka, žádné exotické rozvržení
- 568 sekcí „boxed“ (omezená šířka) vs. 75 „full width“
- nadpisová struktura je zdravá: **66 z 67 stránek má právě jeden H1**

### Vložený obsah

- iframy jen 3: Google Maps (1), Google My Maps (1), YouTube (1) — plus GTM na každé stránce
- WPForms: **4 formuláře** — `18115` (newsletter, na 8 stránkách) a tři další (zájem o zapojení, kontakt)

## 2. Co z toho plyne pro rozsah

**Dobrá zpráva:** rekonstrukce je výrazně jednodušší, než by 67 stránek napovídalo. Stačí postavit **10–12 bloků**, aby se dal replikovat celý web:

| Blok | Nahrazuje | Priorita |
|---|---|---|
| `Nadpis` | heading | povinný |
| `Text` (rich text) | text-editor | povinný |
| `Obrázek` | image | povinný |
| `Tlačítko` / `SkupinaTlačítek` | button | povinný |
| `Sekce` s 1/2/3/4 sloupci | section + column | povinný (layoutový kontejner) |
| `Oddělovač` / `Mezera` | divider, spacer | povinný, triviální |
| `IkonaSPopisem` | be-icon-box | povinný (sekce „Proč debatovat?“) |
| `SeznamSIkonami` | icon-list | povinný |
| `Statistiky` | be-counter | povinný (homepage) |
| `Formulář` | shortcode WPForms | povinný |
| `Akordeon` | accordion | volitelný (2 stránky) |
| `Záložky` | tabs | volitelný (2 stránky) |
| `LogaPartnerů` | be-logo-carousel | volitelný |
| `MapaKlubů` | google_maps + My Maps | vlastní blok |
| `NejbližšíAkce` | inline JS + `debata21` API | vlastní blok |
| `SeznamAktualit` | – (dnes chybí) | vlastní blok |

`hotspot` (2 výskyty) bych při rekonstrukci nenahrazoval blokem — vyřešit obrázkem nebo obsah přepsat.

**Časové těžiště projektu tedy není v počtu bloků, ale v 67 stránkách × 6 sekcí = ~400 sekcí, které někdo musí ručně překlikat do nového systému.** To je práce na desítky hodin, nezávisle na zvolené technologii. Doporučuji ji rozdělit: vy postavíte bloky a zrekonstruujete 10 klíčových stránek, zbytek zvládne redakce sama (a zároveň se tím naučí nový systém).

## 3. Co znamená „vlastní řešení + netechnická redakce“ pro volbu CMS

> **Upřesněno 31. 8. 2026:** redakci bude tvořit **pár technicky zdatných lidí**, kterým se má dát spíš víc volnosti. Argumenty níže platí dál (klikací editor, média, drafty jsou pořád potřeba), ale tlak na maximální „blbuvzdornost“ editoru je menší, než tato sekce předpokládá. Rozhodnutí padlo na TinaCMS self-hosted — viz [06-doporucena-architektura.md](06-doporucena-architektura.md).

Tahle kombinace je nejtěžší část zadání, protože táhne dvěma směry:

- **netechnická redakce** chce klikací editor s náhledem, knihovnou obrázků, drafty a tlačítkem „publikovat“
- **vlastní řešení místo WordPressu** typicky znamená „nechceme být závislí na cizí platformě“

Reálné možnosti jsou pak tři:

### A) Astro + Puck + vlastní backend
Vizuální drag-and-drop, plně vaše, MIT. **Ale musíte dostavět:** přihlášení a role, úložiště JSON (databáze), knihovnu médií s uploadem a alt texty, drafty a náhledy, historii verzí, deploy po uložení. To je fakticky **stavba malého CMS** — počítejte několik set hodin a trvalou údržbu. Puck je navíc pre-1.0 (`@puckeditor/core` 0.23.0, starý balíček `@measured/puck` je deprecated).

### B) Astro + self-hosted headless CMS (Directus / Payload / Strapi)
Dostanete hotovou administraci: uživatelé, role, média, verzování, i18n, API. Blokový obsah se modeluje jako seznam komponent. Běží na vašem serveru, data jsou vaše, open-source. **Nevýhoda:** editace je formulářová, ne „vidím stránku a klikám do ní“ — a potřebujete server s Node/Docker + databází (ten je k dispozici, viz [06-doporucena-architektura.md](06-doporucena-architektura.md)).

### C) Astro + Keystatic (obsah v gitu)
Nulové provozní náklady, admin běží uvnitř Astra, žádný server navíc. **Nevýhoda:** pro netechnickou redakci je to nejméně přívětivé z trojice a 1 377 médií v gitu je potřeba vyřešit externím úložištěm.

### Poznámka k SaaS
Pokud „vlastní řešení“ znamená hlavně „pryč od WordPressu a jeho údržby“ a ne nutně „všechno na našem serveru“, pak **Storyblok** dává pro netechnickou redakci nejlepší poměr výsledku a práce: má přesně ten vizuální blokový editor, kvůli kterému by se jinak stavěl Puck, plus média, verzování a role hotové. Má program pro neziskovky. Cena je závislost na cizí službě — data jdou ale exportovat.

**Moje doporučení při zadání „netechnická redakce + rekonstrukce 1:1“:** postavit bloky tak, aby byly **nezávislé na editoru** (čisté Astro komponenty + typované schéma obsahu), a teprve nad ně nasadit editor. Pak je volba editoru vratná — když Puck nevyjde, vyměníte ho, aniž byste přepisovali web.

## 4. Doporučený postup

1. **Zamknout zadání** — odpovědi na otázky v `04-otazky.md`, hlavně hosting a osud portálu.
2. **Extrahovat design tokeny ze stávajícího webu** (barvy, typografie, spacing, poloměry) — aby rekonstrukce byla opravdu věrná a ne „podobná“.
3. **Postavit Astro kostru** + 4 povinné bloky + layout, zrekonstruovat homepage jako referenci.
4. **Porovnat 1:1 se současným webem** (vizuální diff, screenshoty) — schválit.
5. **Doplnit zbylé bloky**, napojit `debata21` API, mapu klubů, formuláře.
6. **Migrovat 357 článků** skriptem (opakovatelně — redakce mezitím publikuje).
7. **Nasadit editor**, zaškolit redakci, překlikat zbylé stránky.
8. **Redirecty + spuštění**, pak teprve vypnout WordPress.
