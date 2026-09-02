# Co zbývá dodělat

_Seřazeno podle toho, co blokuje spuštění. Stav k 31. 8. 2026._

## A. Blokuje spuštění

### 0. Newsletter nikam neodesílá
Patička má pole pro e-mail a tlačítko jako na dnešním webu. Adresa zpracování
je v nastavení webu prázdná, takže odeslání návštěvníka jen přenese na
`/kontakt/newsletter/` a **e-mail se nikam neposílá** — pole schválně nemá
`name`, aby se nedostal ani do adresy.

Dnešní web používá **Ecomail** (widget posílá pole `ecmw[email]`). Až bude
známý endpoint, stačí vyplnit „Kam se přihlášení odesílá“ a „Název pole
s e-mailem“ v nastavení webu ([04-otazky.md](04-otazky.md), otázka 16).

### 1. Formuláře nikam neodesílají
Blok `Formulář` má pole „Kam se formulář odesílá“. Dokud je prázdné, formulář se
vykreslí, ale odeslání je vypnuté — data by jinak mizela do prázdna. Migrace
nahradila 4 WPForms formuláře výchozími poli (jméno / e-mail / zpráva), takže je
potřeba projít stránky `debata`, `debatiada`, `debatni-liga`, `kurzy`,
`zacnete-debatovat`, `en`, `debatiada-2023-2024`, `debatiada-2024-2025`,
`debatiada-2025-2026` a doplnit skutečná pole i cílový endpoint.

Souvisí s [04-otazky.md](04-otazky.md) otázkou 15 — mají přihlášky zůstat na
Google Forms?

### 2. Self-hosted Tina backend
**Hotovo v kódu, zbývá nasadit.** Administrace se přihlašuje účtem Google
Workspace přes better-auth, obsah commituje GitHub API, index je SQLite
soubor vedle procesu a `/api/tina/*` obsluhuje Node proces. Popis
a zdůvodnění je v [14-autentizace.md](14-autentizace.md).

Před spuštěním zbývá:

- založit OAuth klienta v Google Cloudu (consent screen **Internal**)
  a vyplnit proměnné podle [.env.example](../.env.example),
- ~~postavit MongoDB a rozhodnout o zálohách indexu~~ — **odpadlo**,
  databázový server projekt nemá ([16-migrace-sqlite.md](16-migrace-sqlite.md)).
  Místo toho stačí **persistentní volume pro `DATA_DIR`** a při nasazení
  zkopírovat `index-<větev>.sqlite` z buildu (varianta A v docs/16),
- vytvořit servisní GitHub token pro zápis obsahu,
- projít celý přihlašovací tok se skutečnými údaji — zatím je ověřené jen
  to, co jde ověřit bez nich (viz sekce 5 v [14-autentizace.md](14-autentizace.md)),
- **ověřit `better-sqlite3` v cílovém image** — prebuilt pro Node 24 existuje
  a lokálně se stáhne, ale na Alpine (musl) není a chtěl by toolchain.

### 3. Knihovna médií
**Hotovo v kódu, ověřené lokálně.** Self-hosted TinaCMS knihovnu médií
nedodává — `@tinacms/datalayer` žádný media handler nemá a administrace
hlásila „Repo-based media isn't available when self-hosting“. Bez toho
redakce nemůže nahrát obrázek ani dokument, což je blokující.

**Rozhodnuto: média zůstávají v gitu.** Externí úložiště (Cloudflare R2,
MinIO) se zvažovalo — [06-doporucena-architektura.md](06-doporucena-architektura.md),
otázka 2 — ale git má média replikovaná v každém klonu a nikdo je nemusí
zálohovat zvlášť. Cenou je velikost repozitáře (291 MB v 531 souborech).

Chybějící půlku dodává projekt sám:

- `src/lib/media.ts` — práce se soubory; lokálně v pracovní kopii, jinak
  přes GitHub API stejnou cestou jako obsah,
- `src/pages/api/media/[...path].ts` — `list`, `raw`, `upload`, `delete`
  za přihlášením,
- `tina/media-store.ts` — `MediaStore` napojený přes `media.loadCustomStore`.

Před spuštěním zbývá:

- **projít nahrání a smazání proti skutečnému GitHub tokenu.** Lokální režim
  je ověřený (výpis, náhled, nahrání s diakritikou v názvu, smazání, odmítnutí
  cesty ven z kořene); cesta přes GitHub API zatím ne,
- **rozmyslet commity.** Každý nahraný soubor je vlastní commit, a commit
  spouští build. Deset obrázků za sebou znamená deset buildů. Pokud to bude
  vadit, řešením je dávkovat nahrávání přes Git Trees API — zatím to není
  napsané, protože se neví, jestli to vadí.

### 4. Ověřit přesměrování na produkci
`src/data/redirects.json` má 356 záznamů a `astro.config.mjs` je předává Astru.
Node adaptér je obsluhuje jako 301. Pokud se statické HTML bude servírovat
z cache před Node procesem, musí přesměrování umět i ta vrstva (nginx `map`,
Cloudflare Rules) — jinak staré odkazy skončí na 404.

### 5. Doběhnout migraci těsně před přepnutím
Redakce publikuje dál. Skripty jsou opakovatelné, takže se pustí znovu:

```bash
node scripts/migrate-articles.mjs
node scripts/migrate-pages.mjs      # bez --force, ruční úpravy se nepřepíšou
```

## B. Obsah k doplnění

### 6. Debatní kluby
V `src/content/club/cs/` jsou 4 vzorové záznamy. Reálná data existují jen
v Google My Maps — export KML a doplnit (44 klubů podle homepage). Viz
[04-otazky.md](04-otazky.md), otázka 13.

Mapa už body **vykresluje z dat** (postup v [12-implementace.md](12-implementace.md),
sekce 7), takže jde jen o doplnění záznamů. Klub bez zeměpisných souřadnic se
na mapě neobjeví. Až budou kluby kompletní, dá se na
`/kontakt/mapa-debatnich-klubu/` vypnout vložená Google My Maps a nechat
vlastní mapu.

### 7. Projekty jako kolekce
Kolekce `project` je hotová, ale 12 projektů zatím zůstalo jako běžné stránky
pod `/projekty/`. Převod dá strukturovaná data (donor, období, stav), což je
užitečné pro povinnou publicitu grantů.

### 8. Stránky převedené jako jeden textový blok
27 stránek nebylo v Elementoru — migrace z nich udělala jeden textový blok.
Obsah je celý, ale struktura chybí. Rozdělit do bloků se vyplatí u těch
navštěvovanějších: `historie`, `podporte-nas`, `projekty`, `cile-programu`,
`infoweb-pro-rozhodci`, `rozhodci`.

### 9. Chybějící obrázky
8 obrázků je i na dnešním WordPressu smazaných (HTTP 404) a v migrovaném obsahu
zůstávají odkazy na původní adresy. Buď dohledat originály, nebo odkazy
z článků odstranit:

```
2021/01/DruhyturnajENG2020, 2021/01/Skolenirozhodcich_2021,
2021/01/Tretiturnaj2021-1, 2021/03/finale_2021, 2021/05/OSF_bar-1,
2021/05/webinar_23, 2021/07/kalendar-pridat, 2021/08/nadace-posty@2x
```

### 10. Vlastní HTML k projití
Stránka `mapa-debatnich-klubu` měla vlastní HTML/JS z Elementoru; mapa už je
převedená na blok `Mapa debatních klubů`. U ostatních stránek zkontrolovat, jestli
někde nezůstal blok „Vlastní HTML“ se skriptem, který se dá nahradit blokem.

## C. Otevřená rozhodnutí

### 11. Rozsah anglické verze
Infrastruktura je hotová: routing `/en/`, přepínač vlaječkou v hlavičce,
anglická navigace a patička, přeložené popisky rozhraní (`src/lib/i18n.ts`)
a anglická úvodní stránka. Stejně jako na dnešním webu je ale anglicky jen
úvodní stránka.

Zbývá rozhodnout rozsah ([04-otazky.md](04-otazky.md), otázka 8): které další
stránky přeložit. Přidání je levné — nový soubor v `src/content/page/en/`
a routa ho sama zveřejní. Otevřené je taky, co s 31 anglickými články
v rubrice Debate League: dnes leží v české kolekci a ve výpisu `/aktuality/`
se míchají s českými.

### 12. Přístupnost palety
Zadání bylo rekonstruovat vzhled 1:1, takže web převzal i dnešní kontrastní
problémy — limetka má na bílé kontrast 1,55 : 1, modrá 2,44 : 1, oranžová
2,51 : 1. WCAG AA vyžaduje 4,5 : 1.

[11-design-tokeny.md](11-design-tokeny.md), sekce 2 obsahuje hotové ztmavené
varianty. Přepnutí je změna palety v `src/styles/tokens.css` — komponenty se
nesahají. **Doporučuji to udělat**, je to jedna z mála věcí, kde se dnešní stav
dá zlepšit bez přepisování obsahu.

### 13. Anglické popisky nad rámec rozhraní
`src/lib/i18n.ts` překládá popisky, které nejsou obsahem (tlačítka výpisů,
stránkování, hlášky formuláře). Texty spravované v CMS — názvy stránek,
bloky, aktuality — se překládají obsahem, ne kódem. Až přibudou další anglické
stránky, je potřeba projít i navigaci v `src/content/global/en/global.json`:
teď odkazuje na české stránky, protože anglické zatím neexistují.

### 14. Tailwind play CDN na portálu
`src/pages/portal/index.astro` používá `cdn.tailwindcss.com`, protože byl
přenesený 1:1 a jeho třídy jsou psané proti Tailwindu 3. Play CDN není určené
pro produkci. Až se portál bude upravovat, převést třídy na projektový Tailwind
— pozor na rozdíly v3 → v4, hlavně `rounded` a `shadow`.

### 15. Analytika a cookie lišta
Migrace nepřenesla Google Tag Manager. Písma jsou self-hosted, takže web zatím
neposílá nic ven a cookie lištu nepotřebuje. Pokud má GA4 zůstat, přibude
i lišta ([04-otazky.md](04-otazky.md), otázka 22).

### 16. Osud dalších subdomén
`elearning.debatovani.cz` vrací HTTP 500 a v navigaci na něj vede odkaz.
`pds.debatovani.cz` je v menu taky. Ani jedno není součástí tohoto repozitáře
([04-otazky.md](04-otazky.md), otázky 7 a 9).

## D. Hotovo (pro přehled)

- 21 bloků pokrývajících celý dnešní web
- anglická verze: routing, přepínač vlaječkou, přeložené rozhraní a úvodní stránka
- 356 aktualit včetně médií a přesměrování ze starých URL
- 65 stránek převedených z Elementoru
- kolekce `person` (10 osob), `partner` (8), `club` (4 vzorky)
- homepage zrekonstruovaná ručně jako referenční stránka
- Portál debatování přenesený 1:1 i s vlastním JS
- napojení na `debata21` API (nejbližší akce v hero i samostatný blok)
- design tokeny odvozené z dnešního webu, plošně přebarvitelné
- self-hosted písma místo 54 variant z Google Fonts
- karusel log partnerů bez knihovny (CSS animace, pauza při najetí i při
  zaměření z klávesnice, respektuje `prefers-reduced-motion`)
- nadpisy sekcí nastavitelné z editoru (barva, velikost, zarovnání) — dnešní
  web je má v každé sekci jinak; migrace přenáší vzhled nadpisu z Elementor
  CSS, takže se netrefuje jen podle výchozí hodnoty
- vlastní jednotná sada ikon pro sekci „Proč debatovat?“ místo mixu Font Awesome
  glyfů a exportů ze Serifu
