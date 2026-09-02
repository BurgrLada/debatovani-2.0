# TinaCMS vs. Decap: stálo by to za výměnu?

_Zpětné ověření rozhodnutí z [06-doporucena-architektura.md](06-doporucena-architektura.md) a [08-git-based-cms.md](08-git-based-cms.md), tentokrát proti **hotové implementaci**, ne proti návrhu. Stav k 1. 9. 2026._

**Odpověď předem: ne, neměnit.** Decap by ušetřil MongoDB, Node proces a better-auth — reálná úspora, ale menší, než vypadá. Zaplatilo by se za ni ztrátou vizuální editace (potvrzený požadavek zadání), přepsáním datové vrstvy webu a tím, že každý redaktor by musel mít účet na GitHubu s právem zápisu do repozitáře. Odhad práce: **3–5 vývojářských dnů** na projektu, kterému do spuštění zbývá nasadit konfiguraci.

Tenhle závěr stojí na tom, že **vizuální editace je požadavek**. Kdyby jím být přestala, mění se váhy — rozebráno v sekci 5 včetně pole alternativ (Sveltia, Keystatic, Pages CMS) a revidovaného verdiktu.

> **Doplněk k 2. 9. 2026: MongoDB odchází nezávisle na téhle úvaze.** Rozbor v sekci 9 vedl k rozhodnutí vyměnit databázový server za dva SQLite soubory — index Tiny přes `sqlite-level`, účty a relace better-authu přes `better-sqlite3`. Obojí je ověřené a **cílový provoz je jediný Node proces bez jakékoli další služby**. Dělá se to **před spuštěním**, protože produkční MongoDB ještě neexistuje a nic se tedy nemigruje. Postup je v [16-migrace-sqlite.md](16-migrace-sqlite.md).
>
> Pro celý zbytek reportu to znamená jednu věc, kterou je potřeba číst do každé tabulky: **z dvojice úspor, kterou by odchod od Tiny přinesl (MongoDB + Node proces), zbývá po téhle změně jen Node proces.** Číslům níž je ponechána podoba, v jaké platila proti dnešnímu stavu; kde se závěr posouvá, je to označené.

## 1. Proč tu vůbec je MongoDB, když obsah leží na GitHubu

Není to duplicita a nejsou to dva zdroje pravdy. Databáze dělá dvě věci a ani jedna z nich není „držet obsah“:

1. **Index pro administraci.** Tina odpovídá na dotazy editoru (výpisy, filtry, stránkování, reference mezi kolekcemi) nad indexem, ne nad repozitářem — jinak by každé otevření seznamu aktualit znamenalo stáhnout 347 souborů přes GitHub API. Ztráta indexu není ztráta dat, přeindexuje se z gitu (`tina/database.ts`).
2. **Účty a relace better-auth.** Přihlášení účtem Google Workspace potřebuje kam ukládat uživatele a relace (`src/lib/mongo.ts`, `@better-auth/mongo-adapter`).

Z toho plyne věc, která se při úvaze „zrušme Mongo“ přehlíží: **úložiště nejde odstranit samostatně.** Odejde s ním i přihlašování přes Google Workspace, protože to je jeho druhý zákazník. Buď zůstane obojí, nebo odejde obojí — a „obojí odejde“ znamená, že redakce se přihlašuje GitHubem (sekce 3, bod 3).

Rozlišit se ale musí dvě různé věci, které se pod slovem „databáze“ slévají:

- **úložiště jako taková** — index a účty někam uložit se musí, tomu se neuteče v žádné variantě kromě té, kde odejde celá administrace;
- **databázový server** — samostatná služba, kterou je potřeba nasadit, hlídat a zálohovat.

**Odstranit jde ta druhá věc, a to bez dotyku na CMS.** Oba zákazníci umí místo serveru soubor na disku: index Tiny přes `sqlite-level` (`AbstractLevel` nad `better-sqlite3`, vydává ho tým TinaCMS), účty better-authu přes `better-sqlite3` napřímo. Výměna Mongo za Redis nebo Postgres by opravdu jen změnila jméno kontejneru — výměna za dva soubory kontejner ruší. Rozebráno v sekci 9, provedení v [16-migrace-sqlite.md](16-migrace-sqlite.md).

## 2. Co by Decap opravdu ušetřil

Poctivě vyčísleno proti dnešnímu stavu:

| Odpadá | Dnes |
|---|---|
| Node proces v produkci | jediné routy s `prerender = false` jsou `/api/tina/*`, `/api/auth/*` a `/tina-island` |
| ~~MongoDB~~ | index obsahu + účty a relace — **odchází i bez Decapu**, viz sekce 9 |
| Servisní GitHub token | `GITHUB_PERSONAL_ACCESS_TOKEN` s právem zápisu, žije v prostředí veřejného webu |
| better-auth + Google OAuth klient | `src/lib/auth.ts` (100 ř.) + `src/lib/access.ts` (77 ř.) + consent screen v Google Cloudu |
| Krok `tinacms build` před `astro build` | build je dnes dvoufázový |
| ~12 balíčků | `tinacms`, `@tinacms/*` (3), `tinacms-gitprovider-github`, `mongodb`, `mongodb-level`, `better-auth` (2), `react` + `react-dom` + typy (React je v projektu jen kvůli administraci Tiny) |
| Proměnné prostředí | 12 → zhruba 2 (`SITE_URL` a adresa OAuth proxy) |
| Vlastní lepidlo mezi Tinou a Astrem | viz sekce 6 |

> **Poznámka: Astro samo o sobě žádný server nepotřebuje.** Web běží v režimu `output: 'static'` — build vyrobí **453 statických HTML souborů** a ty umí servírovat nginx nebo CDN. Astro je build nástroj, který doběhne v CI a skončí. Node adaptér je v projektu **výhradně kvůli administraci**: jediné tři routy s `prerender = false` jsou `src/pages/tina-island/[name].ts`, `src/pages/api/tina/[...routes].ts` a `src/pages/api/auth/[...all].ts`. Samotné `/admin` je statický soubor. Bez Tiny by v projektu nezbyla ani jedna routa na vyžádání a adaptér by se dal odstranit.
>
> Platí to i obráceně: **když provoz Node procesu nevadí, mizí hlavní (a v podstatě jediný) důvod k migraci** — celá tahle sekce se scvrkne na jednu položku, MongoDB.
>
> **Build po každé změně ale zůstává tak jako tak.** Statický web znamená, že uložení v administraci → commit → CI build → nasazení, a to platí pro Tinu i pro Sveltiu úplně stejně (1 m 43 s samotný build, plus v CI checkout a instalace závislostí — a checkout je dnes drahý, `.git` má 276 MB kvůli médiím). Volba CMS tohle neovlivní. Liší se jen to, co redaktor vidí **do** doběhnutí buildu: Tina čte živě z indexu, takže v editoru je změna hned; git-based CMS ukáže formulář a náhled. Zkrátit publikační smyčku jde jinými pákami — média na R2 (rychlejší checkout), cache v CI, nebo nechat vybrané routy (typicky aktuality) běžet on-demand nad indexem, což adaptér umožňuje a co se u dat z `debata21` API zvažuje už v [06](06-doporucena-architektura.md).

Přibývá jedna věc: **OAuth proxy** pro přihlášení (Cloudflare Worker nebo pár řádků serverless, existují hotové šablony). Není to Node server, který se musí hlídat, ale je to další nasazená součástka.

Deployment by se změnil z „statický web za CDN **+** Node proces **+** MongoDB“ na „statický web za CDN **+** worker“. To je skutečné zjednodušení provozu a je to jediný argument, který v této úvaze opravdu tlačí k Decapu.

**Po přechodu na SQLite je ale porovnání jiné:** „statický web za CDN **+** Node proces“ proti „statický web za CDN **+** worker“. Zůstává rozdíl mezi procesem, který běží pořád, a funkcí, která se probouzí na požádání — ale je to rozdíl jedné součástky, ne dvou, a ta zbylá obsluhuje jen administraci.

## 3. Co by se ztratilo

### 1. Vizuální editace — a to je to hlavní

Zadání ji označilo za nutnost a implementace ji má hotovou: **83 volání `tinaField()` ve 25 souborech**, registr editovatelných oblastí (`src/lib/islands.ts`), `visualSelector` na blocích stránek, `ui.router` v každé kolekci (klik na dokument otevře jeho skutečnou stránku), překreslení oblasti po úpravě bez reloadu.

Decap tohle **nemá a mít nebude** — není to chybějící funkce, je to jiný druh nástroje. Editace je formulářová, vedle formuláře může být `preview pane`. Ten se ale nekreslí z vašeho webu: je to **React komponenta, kterou si musíte napsat pro každý blok zvlášť** (`registerPreviewTemplate`). Pro 21 bloků to znamená buď:

- **žádný náhled** — redakce edituje YAML pole naslepo a výsledek vidí až po buildu, nebo
- **každý blok napsaný dvakrát** — jednou jako `.astro` pro web, podruhé jako `.tsx` pro náhled, s povinností držet obě verze v souladu navždy.

Druhá varianta je přesný opak pravidla ze sekce 5 dokumentu [06](06-doporucena-architektura.md) („bloky jsou Astro komponenty, editor je jen nadstavba“) a je dražší než celá zbývající migrace.

Připomínka z [08](08-git-based-cms.md) platí beze změny: _„git-based CMS nedají to, co jste chtěl. Editace je formulářová.“_ Tehdy to byl argument proti Decapu ještě před psaním kódu. Dnes je k němu navíc 83 míst v kódu, která by se smazala.

### 2. Datová vrstva webu

Web dnes **nečte soubory** — čte Tina GraphQL nad indexem (`src/lib/data.ts`, importovaný v 38 souborech), typy jsou generované ze schématu. Bez Tiny by se přešlo na Astro content collections + ručně psané Zod schéma.

Zajímavé je, že tenhle konkrétní přechod by byl *zlepšení*: čtení souborů z disku při buildu je jednodušší a rychlejší než dotazy do Mongo, zmizela by ruční paginace přes kurzory (`listAll()` v `data.ts`) i obcházení HTTP klienta `databaseClientem`. Ale je to práce a je to riziko regrese na 452 obsahových souborech.

Cena navíc, která zůstane trvale: **schéma bloků by existovalo dvakrát** — jednou jako `config.yml` pro Decap, podruhé jako Zod pro web. Dnes je jedno (`src/components/blocks/*.template.ts`) a typy z něj padají samy.

### 3. Přihlášení redakce

Decap se přihlašuje **identitou git providera**. S GitHub backendem to znamená, že každý redaktor potřebuje **účet na GitHubu s právem zápisu do repozitáře**. Alternativa Git Gateway je vázaná na Netlify Identity, tedy SaaS, a rozporuje zadání.

Rozhodnutí z [14-autentizace.md](14-autentizace.md) šlo vědomě opačným směrem: organizace má pracovní účty u Googlu, odchod z organizace přístup odebere sám a redakce nemusí zakládat účty jinde.

**Tady ale Decap jednu věc naopak vyhrává.** Dnešní cenou za Google login je to, že obsah commituje servisní účet a **v historii repozitáře nejsou vidět jednotliví redaktoři** (dokumentováno v `tina/database.ts`). S Decapem commituje každý sám za sebe — autorství je zpátky. Kdo za změnou stojí, se dnes dohledá jen v logu přihlášení.

### 4. Vnořené stránky a jazyky současně

Stránky mají cestu jako URL, včetně několika úrovní: `src/content/page/cs/projekty/dokoncene-projekty/debatovani-napric-osnovami.mdx`. Jazyk jako první úroveň složky Decapu vyhovuje, podsložky pod ním ale vyžadují **nested collections**, které jsou stále v betě. Rozebráno v sekci 4.

### 5. Drobnosti, které se sečtou

Formulářové UX Tiny je bohatší: `itemProps` (položka seznamu se v panelu jmenuje podle svého obsahu, ne „Item 1“), `defaultItem`, náhledové obrázky bloků, vlastní React komponenty polí, `slugify` napojený na titulek. Decap má vlastní widgety taky, ale míň hotových vychytávek a bez podmíněných polí.

Naopak: Decap má **editorial workflow** — drafty jako pull requesty se schvalováním. Tina tohle nemá vůbec, dnes to zastupuje boolean `draft`. Pro redakci „pár technicky zdatných lidí“ to není zásadní, ale je to plus na straně Decapu.

## 4. Vícejazyčnost prakticky

Nejdřív to, co je na volbě CMS nezávislé: **routing, `hreflang`, přepínač vlaječkou i popisky rozhraní jsou v Astru** (`src/lib/i18n.ts`, `src/pages/en/…`, `sitemap({ i18n })`) a při jakékoli výměně administrace zůstanou beze změny. CMS rozhoduje jen o tom, jak se překlady editují.

### Jak to funguje dnes

**Tina i18n nemá.** Jazyk je konvence adresáře, kterou si projekt zavedl sám a která se nese třemi místy:

- obsah leží v `src/content/<kolekce>/<jazyk>/…`,
- `tina/collections/routing.ts` z jazykové složky skládá adresu náhledu, aby editor u anglického dokumentu neotevřel českou stránku,
- `listPages('en')` filtruje kolekci podle prefixu cesty.

**Překladový pár je stejná cesta v druhé jazykové složce.** `src/pages/[...path].astro` porovná množinu českých a anglických cest a z toho vypadne `hreflang` i cíl vlaječky; když protějšek není, přepínač míří na úvodní stránku druhého jazyka. Web s částečným překladem počítá.

Editor o téhle vazbě ale **neví vůbec nic** — vidí jen dvě složky. Důsledky:

| | |
|---|---|
| **Pro** | žádná omezení: různé slugy, obsah existující jen v jednom jazyce, přidání jazyka = nová složka |
| **Proti** | žádné souběžné editování, žádný přehled „co ještě není přeložené“, snadné rozejití obou verzí |

Ten druhý sloupec není teoretický. Otevřený bod v [13-todo.md](13-todo.md) (13) — anglická navigace v `global/en/global.json` pořád odkazuje na české stránky — je přesně chyba, na kterou by skutečná i18n funkce upozornila.

### Jak by to fungovalo v Decapu

Decap i18n **má**, a je to jedna z mála oblastí, kde je proti Tině silnější. Jazyky se nastaví globálně, zapnou se per kolekci a redaktor pak edituje jazykové verze **vedle sebe nebo v záložkách na jedné obrazovce**, s volbou pro každé pole: `i18n: true` (překládá se), `duplicate` (kopíruje se z výchozího jazyka) nebo `none`.

Podstatné je, že struktura `multiple_folders` ukládá do `<folder>/<locale>/<slug>.<ext>` — tedy **přesně dnešní rozložení souborů** — a pár určuje shodným slugem, tedy **přesně dnešní konvencí**. Základ by seděl bez jediné změny v obsahu.

Kde to drhne, je v detailu jednotlivých kolekcí:

| Kolekce | Dnes | V Decapu |
|---|---|---|
| **Stránky** (67 cs / 1 en) | vnořené složky, cesta = URL | i18n sedí, ale podsložky vyžadují nested collections (beta) a **kombinace nested + i18n není v dokumentaci popsaná** → nutné ověřit dřív, než se cokoli přepíše |
| **Aktuality** (347 cs / 9 en) | dvě nezávislé sady, anglické slugy jsou anglické | **i18n nezapínat.** Těch 9 anglických článků nejsou překlady, ale originály z Debate League. Pod i18n by z nich byly položky s prázdnou českou záložkou, navíc nucené sdílet slug s češtinou. Řešení: dvě samostatné kolekce (Aktuality / News) — tedy stejný model jako dnes |
| **Partneři** (8 cs / 8 en, shodné slugy) | pár podle názvu souboru | sedne ideálně: `duplicate` na logo a odkaz, překládá se jen popis |
| **Nastavení webu** (2 JSONy) | jeden dokument na jazyk | file kolekce podporují **jen strukturu `single_file`** → buď sloučit do jednoho JSONu s klíči podle jazyka (zásah do obsahu i do webu), nebo nechat dva samostatné záznamy bez i18n |
| **Lidé, kluby** (jen cs) | jen čeština | bez i18n, beze změny |
| **Bloky stránek** | libovolně | list widget podporuje jen `i18n: true` a nastavení na vnořených polích se ignoruje → uvnitř bloku **nejde říct „obrázek sdílený, text překládaný“**, jede se všechno nebo nic |

Shrnuto: Decap by dal lepší editaci tam, kde překlady opravdu existují (stránky, partneři, nastavení), za cenu tří kompromisů — beta funkce pod nejpoužívanější kolekcí, přestavba nebo rozdělení globálního nastavení a hrubší i18n uvnitř bloků. U aktualit by se stejně skončilo u dnešního modelu dvou nezávislých kolekcí.

### Co by se tím reálně zlepšilo

Jedna konkrétní věc, a stojí za zmínku: **bylo by vidět, co chybí.** Prázdná anglická záložka je viditelná; chybějící soubor v `en/` není. Při rozšiřování anglické verze (otevřená otázka v [13-todo.md](13-todo.md), bod 11) je to rozdíl mezi „projdu seznam“ a „ručně porovnám dva adresáře“.

Sveltia je v tomhle ještě dál — kromě jazykových záložek nabízí i strojový překlad polí (DeepL), takže založení anglické verze stránky je klik a pak korektura. Pokud by se anglická verze měla opravdu rozrůst, je tohle silnější argument než cokoli jiného v téhle úvaze.

### Verdikt

**Vícejazyčnost sama o sobě není důvod k migraci** — dnešní model funguje a jeho slabina (nikdo nehlídá úplnost) se týká hrstky dokumentů, ne 347 článků.

Důležitější je vedlejší zjištění: dnešní konvence — **jazyk jako první úroveň složky a překladový pár jako shodný slug** — je přesně ta, kterou Decap i Sveltia očekávají. Kdyby se někdy migrovalo, i18n není překážka a obsah se kvůli ní přesouvat nebude.

## 5. Když vizuální editace není podmínka

Sekce 3 stojí na tom, že vizuální editace je potvrzený požadavek. Kdyby jím být přestala — „preview možná stačí“ — mění se váhy natolik, že to zaslouží vlastní rozbor.

### „Náhled“ znamená tři různé věci

1. **Dnešní Tina.** Skutečná stránka, živě, bez psaní čehokoli navíc — bloky jsou `.astro` a renderuje je routa `/tina-island`. Zpětná vazba je okamžitá.
2. **Preview pane v Decapu nebo Sveltii.** React komponenta, kterou si pro každý blok **napíšete sami** (`registerPreviewTemplate`; Sveltia to podporuje taky). Bez ní zbude náhled Markdownu — u aktualit to bohatě stačí (tělo článku je prostý Markdown), u stránek neukáže skoro nic, protože stránka je složená z bloků, ne z textu.
3. **Deploy preview.** Editorial workflow založí pull request, CI postaví skutečný web. Nejvěrnější ze všech tří. **Změřeno na tomhle projektu: celý build trvá 1 m 43 s** (samotné `astro build` 1 m 12 s), takže náhled je otázka zhruba dvou minut na PR plus čas CI na instalaci závislostí.

Pointa: **„preview stačí“ je pravda, pokud se tím myslí varianta 3.** Ta je levná, věrná a jako bonus přinese schvalovací kolečko. Ale je to jiná smyčka — dnes okamžitá, tam dvouminutová a přes pull request. Varianta 2 zadarmo není: buď se napíše 21 React komponent, nebo se u stránek fakticky needituje s náhledem.

### Co by se ztratilo kromě vizuální editace

Nejdřív, co ztráta **není** — prověřeno proti skutečným schématům v `src/components/blocks/*.template.ts`:

| Použito dnes | Protějšek v Decapu / Sveltii |
|---|---|
| `itemProps` (14×) — položka seznamu pojmenovaná podle obsahu | `summary` na list widgetu |
| `defaultItem` (29×) | `default` na poli |
| `slugify` bez diakritiky | `slug` + `clean_accents: true` |
| `ui.component: 'textarea'` (16×), `options` (23 selectů) | přímé protějšky |
| reference mezi kolekcemi | **nepoužívají se** (0 výskytů), takže nechybí |

Formulářová schémata se tedy přenesou beze zbytku. Skutečné zbytky jsou jinde:

1. **Jeden zdroj schématu.** Dnes `*.template.ts` živí editor i typy webu. Po migraci by existoval `config.yml` pro CMS **a** Zod pro web — 21 bloků, přes 200 polí, ručně držených v souladu. Po odečtení vizuální editace je tohle největší položka na seznamu ztrát. Zmírňuje ji, že **sada bloků je záměrně uzavřená** (`tina/collections/blocks.ts`), takže by to byla hlavně jednorázová cena, ne trvalá daň.
2. **Index nad 347 aktualitami.** Git-based CMS čte kolekci přes API git providera. Sveltia to má silně optimalizované, ale sama uvádí, že se tyhle nástroje hodí pro malé až střední projekty; Tina má na to index — po migraci ze sekce 9 soubor `index.sqlite`, ne databázový server.
3. **Přihlášení.** Všichni kandidáti berou identitu z gitu — účet na GitHubu s právem zápisu pro každého redaktora. Výměnou je autorství commitů.
4. **Vložené komponenty v rich-textu.** Tina umí do textu vložit komponentu jako MDX (`YouTubeEmbed`); Decap i Sveltia to řeší shortcodem přes `registerEditorComponent`. Dnes se to nepoužívá, ale je to strop, na který se dřív nebo později narazí.
5. **Vnořené stránky současně s i18n** — beta funkce, viz sekce 4.
6. **Hotová práce.** 3–5 dnů a regresní riziko na 452 obsahových souborech.

Naopak by odpadlo vlastní lepidlo (sekce 6 — dnes pět kusů, po přechodu na SQLite čtyři) a závislost na `@tinacms/astro`, který je pořád na **0.6.1 z 16. 7. 2026**. Za zmínku to stojí proto, že **vizuální editace, kterou tím chráníme, stojí přesně na tomhle nejmíň zralém článku řetězu.**

### Pole alternativ

Stav k 2. 9. 2026, data z npm registry:

| | Verze / poslední vydání | Vlastní server | Přihlášení | Náhled | Poznámka |
|---|---|---|---|---|---|
| **Sveltia CMS** | 0.205.0 · **2. 9. 2026** (651 vydání) | ne, jen OAuth proxy | GitHub, GitLab, Gitea/Forgejo | vlastní preview šablony | nejbližší náhrada; prvotřídní i18n s jednoklikovým AI překladem, média nativně na R2/S3/B2 |
| **Decap CMS** | 3.16.0 · 31. 8. 2026 | ne, jen OAuth proxy | + Bitbucket, Azure, Git Gateway | `registerPreviewTemplate` | zralejší a známější, ale i18n a média slabší — externí úložiště jen přes Cloudinary/Uploadcare, tedy SaaS |
| **Keystatic** | `@keystatic/core` 0.6.9 · 26. 8. 2026; `@keystatic/astro` 6.0.0 · 18. 8. 2026 | **ano — API routy v Node** | GitHub App, každý redaktor potřebuje `write` | ne | **schéma v TypeScriptu, tedy jeden zdroj pravdy** (řeší bod 1 výše) a žádná databáze; Node proces ale nezmizí a projekt se sám označuje za experimentální |
| **Pages CMS** | aktivní | **ano — Postgres + GitHub App + better-auth** | GitHub | ne | pro cíl „co nejjednodušší provoz“ je to krok zpět, ne vpřed |
| **Front Matter CMS** | aktivní, rozšíření do VS Code | ne | git klient | dev server | nulová infrastruktura, ale redakce edituje ve VS Code a je to jeden uživatel na instanci; spíš kuriozita než kandidát |

Vyřazeno bez rozboru: **Netlify CMS** (přejmenovaný na Decap), **Static CMS** (fork, archivovaný), **CloudCannon, Contentful, Storyblok, Tina Cloud** (SaaS, mimo zadání).

Zajímavá je z toho jediná dvojice: **Sveltia** (nejmenší možný provoz) proti **Keystatic** (jeden zdroj schématu, ale Node zůstává). Keystatic je paradoxně nejblíž tomu, co je dnes — Tina bez databáze a bez vizuální editace — takže by ušetřil MongoDB a lepidlo, ne Node proces.

**Po migraci ze sekce 9 se ale Keystatic vyprazdňuje:** jeho jediný infrastrukturní argument byl „žádná databáze“, a ten už bude splněný i s Tinou. Zbývá mu jeden zdroj schématu, což je proti ztrátě vizuální editace málo. Ze seznamu kandidátů tím fakticky vypadává a zůstává jediná otázka — Tina, nebo Sveltia.

### Jak drahý by byl skutečný náhled

To, co je na screenshotech, je **výchozí stav, ne strop**. Sveltia i Decap nabízejí tři úrovně:

| Úroveň | Co to je | Co to dá u nás |
|---|---|---|
| `registerPreviewStyle` | vpíchne náš CSS do náhledového iframu | u **aktualit skoro reálný náhled za pár hodin** — tělo článku je Markdown, stačí typografie |
| `registerPreviewTemplate(name, component)` | vlastní komponenta; dostane `entry`, `widgetFor`, `getAsset` a `document`/`window` toho iframu | libovolné HTML — ale markup bloků si musíme napsat sami, tedy 21 bloků podruhé |
| iframe na skutečný render | preview šablona, která jen zobrazí HTML odjinud | věrný náhled, ale někdo ho musí vyrobit — viz níž |

**Rozhodující technický fakt: `.astro` komponenty neumí běžet v prohlížeči.** Neexistuje způsob, jak naše bloky vykreslit uvnitř CMS na klientu. Každý věrný náhled je proto render na serveru — buď při buildu (deploy preview), nebo na vyžádání.

Varianta „render endpoint + iframe“, tedy přesně to, co dnes dělá Tina:

1. **Routa `POST /api/preview` s `prerender = false`**, která vezme JSON rozdělané stránky a vrátí HTML. Astro 7 na to má Container API (`astro/container`), a v repozitáři už jedna taková routa běží — `/tina-island` renderuje `PageBody` a `ArticleBody` na vyžádání. Řádově 50–100 řádků.
2. **Jedna preview šablona v CMS**, která data posílá na endpoint a výsledek strká do iframu, s debouncem. Dalších ~50 řádků.
3. Dva háčky, které to prodlouží: `build.inlineStylesheets: 'always'` znamená, že v `dist` **není samostatný CSS soubor** webu (jediný, co tam je, patří administraci), takže se stylů musí endpoint zmocnit jinak; a endpoint renderuje cizí vstup, takže patří za autentizaci — kterou bychom migrací zrušili a museli ji tam vrátit (ověřením redaktorova GitHub tokenu).

**Odhad: 1–2 dny** pro blokové stránky, výrazně méně pro aktuality.

**Jenže tím se vrací serverový render.** Ne celý dnešní stack — žádná MongoDB, žádný better-auth — ale běžící routa, která umí vykreslit naše komponenty. Může to být klidně funkce na Cloudflare místo VM, pořád je to ale ta část, kvůli které se od Tiny odchází. A Tina tohle má hotové, navíc s klikáním do obsahu.

Z toho plyne rozcestí bez třetí cesty:

- **Chceme věrný náhled přímo v CMS** → zůstat u Tiny je levnější, protože je hotový.
- **Nechceme žádný server** → náhled buď formulářový se stylem (aktuality), nebo přes deploy preview na PR (stránky, ~2 minuty).

Prakticky nejrozumnější hybrid, kdyby se do Sveltie šlo: **aktuality přes `registerPreviewStyle`** (pár hodin, pokrývá objemově největší část redakční práce — 347 článků) a **stránky přes deploy preview** (67 stránek, které se po migraci mění zřídka).

### Co ukázala zkouška Sveltie nad naším obsahem (2. 9. 2026)

Sveltia nemá veřejné demo (udržovatel to drží záměrně „low profile“, aby si nepřidělal podporu), takže se to muselo postavit lokálně: statická stránka s `config.yml` pro naše kolekce, `backend: test-repo` pro rychlé nahlédnutí a `backend: github` pro režim lokálního repozitáře. Zjištění:

- **Vizuální editaci Sveltia nemá.** Je ve stejné třídě jako Decap: formulář vlevo, panel vpravo. Výchozí náhled je **výpis polí, ne vykreslený blok** — u Hero se ukáže „Popisek nad nadpisem / Hlavní nadpis / Podtitulek…“, ne hero. Vlastní preview šablony podporuje, ale platí pro ně totéž co u Decapu: 21 bloků by se muselo napsat podruhé.
- **Jazykové záložky fungují přesně tak, jak sekce 4 předpokládá:** „Čeština | Angličtina“ nad formulářem, druhý panel umí zobrazit buď druhý jazyk, nebo náhled, a je tam tlačítko „Přeložit z jazyka…“.
- **`typeKey: _template` bere**, takže blokové stránky by se nemusely přepisovat — nabídka „Přidat sekci“ vypsala naše bloky pod našimi popisky.
- **Rozhraní je česky** samo od sebe, včetně hlášek.
- **Editorial workflow už Sveltia má** (GitHub/GitLab). Starší diskuse na GitHubu tvrdí opak — dokumentace je novější, tohle přibylo nedávno.
- **Režim lokálního repozitáře vyžaduje File System Access API**, které je v Brave vypnuté (`brave://flags/#file-system-access-api`). V Chrome funguje rovnou.

Zbývá tím ověřit jediné, a to nad skutečnými soubory: **vnořené stránky současně s i18n** a chování při 347 aktualitách. To je ten půldenní spike z konce téhle sekce — konfigurace pro něj je hotová.

### Jak to rozhodnout, aniž by se do toho investoval týden

1. **Spike na půl dne:** postavit `config.yml` jen pro aktualitu a pro jednu vnořenou dvojjazyčnou stránku, spustit Sveltiu proti kopii repozitáře a zjistit, jestli nested + i18n drží. To je jediná technická neznámá celé migrace.
2. **Ukázat redakci obojí vedle sebe** na téže stránce — dnešní Tinu a Sveltiu — a zeptat se, jestli jim formulář s deploy preview stačí. Odpověď na tuhle otázku je dražší než všechny tabulky výš.
3. **Až po spuštění.** Před ním má přednost seznam v [13-todo.md](13-todo.md).

### Revidovaný verdikt

Doporučení „zůstat“ z toho nepadá, ale mění se jeho zdůvodnění i platnost:

- **Před spuštěním nemigrovat**, a to nezávisle na vizuální editaci: stack je hotový, chybí mu jen nasazená konfigurace, a 3–5 dnů přepisu by odsunulo spuštění a znovu otevřelo 452 obsahových souborů.
- **Po spuštění je to vyrovnané, ale míň, než to vypadalo.** Trvalá cena Tiny byla „MongoDB + Node proces + pět kusů lepidla + 0.x integrace“; po přechodu na SQLite je to **Node proces + čtyři kusy lepidla + 0.x integrace** a databázová položka ze seznamu mizí. Proti tomu stojí trvalá cena Sveltie: dvojí schéma + GitHub účty pro redakci + strop na velikosti kolekcí. Pokud se ukáže, že redakce vizuální editaci nepoužívá, **naklání se to ke Sveltii** — a uzavřená sada bloků z toho dvojího schématu dělá jednorázovou, ne opakovanou položku. Migrace na SQLite tenhle jazýček posouvá zpátky k Tině, protože ubírá z její strany váhy, ne z její strany přínosů.

## 6. Co mluví proti Tině

Aby to bylo férové — self-hosted Tina není bezbolestná. V kódu je po ní **pět kusů vlastního lepidla**, které tam nejsou pro parádu:

| Místo | Co se muselo obejít |
|---|---|
| `tina/database.ts` | `mongodb-level` je UMD balík, pojmenovaný import z něj selže → import přes default export a přetypování — **odpadá s přechodem na `sqlite-level`, který je čisté ESM** (sekce 9) |
| `src/pages/api/tina/[...routes].ts` | Tina dodává handler pro Node `IncomingMessage`/`ServerResponse`, Astro má `Request`/`Response` → ~40 řádků vlastního překladu |
| `src/lib/data.ts` | vygenerovaný HTTP klient míří na relativní `/api/tina/gql`, což v Node při buildu není platná URL → čte se `databaseClient` a typy se berou odjinud |
| `tina/auth-provider.ts` | `getToken()` vrací prázdný objekt, aby Tina pochopila „přihlášeno“, když relace je v httpOnly cookie |
| `astro.config.mjs` | `ssr.noExternal` na `@tinacms/astro`, jinak Vite překompilovává balíček na každý studený request |

To je pět míst, která se můžou rozbít při aktualizaci Tiny nebo Astra a která nikdo jiný neopravuje. K tomu `MONGODB_TRANSACTIONS=false`, protože samostatně běžící MongoDB neumí transakce.

**Dvě z těch šesti položek řeší migrace na SQLite** (sekce 9): UMD workaround odpadá, protože `sqlite-level` je čisté ESM, a vypnuté transakce taky, protože better-auth nad `better-sqlite3` je zapíná sám. Zbývají čtyři a ty s volbou úložiště nesouvisejí.

Je to daň za to, že self-hosted Tina na Astru je málo prošlapaná cesta. **Ale je zaplacená** — ten kód je napsaný, okomentovaný a funguje. Znovu ji platit nebudeme; platí se jen údržba.

## 7. Kdyby se přece jen odcházelo, tak ne k Decapu

Obsahové soubory jsou na CMS skoro nezávislé, což tuhle úvahu drží levnou:

- bloky jsou obyčejné YAML pole ve frontmatteru s klíčem `_template`, a Decap umí tenhle klíč nastavit (`typeKey`) — **soubory by se nemusely přepisovat**;
- rich-textová pole Tina serializuje jako **prostý Markdown** (`body: |`), ne jako AST;
- v 452 obsahových souborech **není jediná JSX komponenta** — MDX se používá jen jako formát, ne jako kód.

Kdyby tedy někdy důvod k odchodu vznikl, kandidátem není Decap, ale **Sveltia** — moderní přepis kompatibilní s Decap konfigurací, s lepší i18n a knihovnou médií (viz [08](08-git-based-cms.md)). Decap je zralejší (3.16.0, aktivní vývoj), Sveltia příjemnější; pojistkou je, že se mezi nimi přechází výměnou jednoho `config.yml`.

Poznámka k médiím: dnes leží **291 MB v `public/media`** a repozitář má 276 MB. To je problém sám o sobě a s volbou CMS nesouvisí (obě řešení ukládají do gitu). Tina má ale připravenou cestu na S3-kompatibilní úložiště včetně R2 ([06](06-doporucena-architektura.md), otázka 2); Decap externí úložiště řeší přes Cloudinary nebo Uploadcare, což jsou SaaS. Kdyby se média měla přesunout na R2, je to bod pro Tinu.

## 8. Rozhodnutí

**Zůstat u TinaCMS — a před spuštěním to ani neotevírat.** Dokud platí, že vizuální editace je požadavek, je poměr nepříznivý ve všech třech osách (pro případ, že by přestala platit, je revidovaný verdikt v sekci 5):

- **Cena:** 3–5 vývojářských dnů (config.yml pro 21 bloků a 6 kolekcí ≈ 1 den, Zod schémata a přepis 38 souborů datové vrstvy 1–2 dny, náhrada `TinaMarkdown` v 6 typech bloků ≈ 0,5–1 den, odstranění vizuální editace ≈ 0,5 dne, OAuth proxy a nasazení ≈ 0,5 dne) — a to bez React náhledů bloků, které by přidaly 2–4 dny a trvalou dvojkolejnost.
- **Ztráta:** vizuální editace (potvrzený požadavek), jednotné schéma bloků, přihlašování Google Workspace.
- **Zisk:** jeden proces a jedna databáze míň v provozu, autorství commitů, editorial workflow. **Po migraci na SQLite (sekce 9) z toho zbývá jeden proces** — databázi si projekt odebere sám a levněji.

**Když je Node proces přijatelný sám o sobě, je rozhodnutí ještě jednoznačnější** — zbývající úsporou byla jediná MongoDB, která navíc sloužila dvěma účelům (sekce 1). A protože ta odchází tak jako tak (sekce 9), **nezbývá po odchodu od Tiny žádná úspora infrastruktury kromě samotného Node procesu** — a ten obsluhuje jen administraci: když spadne, statický web běží dál. To je provozní riziko, na které je architektura navržená.

**Co udělat místo migrace:**

1. **Nechat obsah přenositelný.** Nekódovat do souborů nic, co umí jen Tina — žádné AST v rich-textu, žádné odkazy na interní ID. Dnes to tak je; je to ta nejlevnější pojistka, jakou máme.
2. **Vyřešit autorství commitů**, protože to je jediná Decapem odhalená slabina, která bolí i bez migrace. Levná varianta: commit message obohatit o e-mail přihlášeného redaktora (Tina předává `session.user` do GraphQL vrstvy, viz `src/pages/api/tina/[...routes].ts`), případně nastavit `author` v GitHub API volání.
3. **Vyměnit MongoDB za dva SQLite soubory, a to ještě před spuštěním.** Odebere to z provozu celý databázový server, aniž by se sáhlo na CMS, na obsah nebo na přihlašování — rozbor v sekci 9, postup v [16-migrace-sqlite.md](16-migrace-sqlite.md). Ze všech položek na tomhle seznamu má nejlepší poměr přínosu k riziku: index je odvozený z gitu a dá se kdykoli postavit znovu, a **produkční MongoDB zatím neexistuje**, takže se nic nemigruje. Odkládat to na po spuštění by znamenalo databázi nejdřív postavit a pak zrušit.
4. **Zálohovat index nemusíme, ale musíme umět přeindexovat.** Postup si zapsat a jednou vyzkoušet — je to rozdíl mezi „hodina práce“ a „panika“ ([13-todo.md](13-todo.md), bod 2). Po přechodu na SQLite je záloha navíc `cp` dvou souborů.
5. **Média na R2.** 291 MB v repozitáři zpomaluje každý CI build; s Tinou je to konfigurace, ne přepis.
6. **Rozhodnutí přehodnotit až po půl roce provozu**, a jen na základě jedné otázky: **používá redakce vizuální editaci?** Když se ukáže, že všichni stejně editují ve formuláři v postranním panelu, spadne hlavní argument pro Tinu a úvaha se otevírá znovu — tehdy ale se Sveltií, ne s Decapem, a s postupem ze sekce 5.

## 9. Kde je databáze skutečně na odstřel

Sekce vznikla z otázky „nešlo by vysekat git a nechat jen databázi?“. Odpověď je ne — a rozbor níž ukazuje proč, protože ta otázka míří na tu půlku stacku, která je hodnotná, místo na tu vyměnitelnou. **Obrácená varianta ale vychází dobře a je z ní rozhodnutá architektura:** git zůstává, databázový server odchází a nahradí ho dva SQLite soubory vedle Node procesu. Postup je v [16-migrace-sqlite.md](16-migrace-sqlite.md).

### Co říkají typy Tiny

```ts
export interface GitProvider {
  onPut: (key: string, value: string) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}
export type CreateDatabase = … & { databaseAdapter: Level; gitProvider: GitProvider }
```

`gitProvider` je povinný, ale je to **rozhraní o dvou metodách** — prázdná implementace jsou čtyři řádky a typy to spolknou.

Důležitější je ale to druhé: v self-hosted režimu **není `bridge`**, takže se obsah nečte ze souborů, ale z level store. **MongoDB tedy obsah už dnes drží.** Git v téhle architektuře funguje jako *write-through* zápis, ne jako zdroj čtení — a `src/lib/data.ts` to potvrzuje, protože i build čte přes `databaseClient`.

Z toho plyne velikost úspory: **vysekáním gitu za běhu nezmizí nic.** Pořád běží tentýž Node proces a tatáž MongoDB. Ušetří se **jeden token v prostředí a jedno volání GitHub API při uložení**. To je celé.

### Co by to naopak vzalo

- **Historii, rollback a diff.** Dnes zdarma, v databázi nic takového není.
- **Zahoditelnost databáze.** Dnes je Mongo odvozená — ztratí se, přeindexuje se. Bez gitu je to jediná kopie obsahu, navíc na instanci bez replica setu (`MONGODB_TRANSACTIONS=false`), takže zálohy přestanou být volitelné a musí se i zkoušet obnovovat.
- **Přenositelnost obsahu.** 452 souborů MDX/JSON versus interní kódování level store. Tím zmizí úniková cesta, na které stojí celý tenhle report i doporučení č. 1 v sekci 8.
- **Lokální vývoj a migrační skripty.** `pnpm dev` čte a píše soubory, `migrate-*.mjs` taky, obsah jde grepovat. Bez gitu by vývojové prostředí nemělo obsah odkud vzít.
- **Spouštěč buildu.** Dnes uložení → commit → CI → build. Bez commitu nemá build co spustit: musel by se volat webhook z uložení, nebo by web musel přejít na SSR.
- **Past navíc:** s prázdným git providerem by jakékoli přeindexování z gitu (`tinacms audit`, reindex po výpadku) obsah vymazalo, protože v repozitáři by nic nebylo.

### Lepší cíl: zbavit se databázového serveru, ne gitu

`Level` je v Tině typovaný jako `AbstractLevel`, takže adaptér může být libovolná implementace z ekosystému Level. A nemusí se vymýšlet: **Tina jednu takovou sama vydává.**

**`sqlite-level`** — npm 2.1.1 z **31. 5. 2026**, repozitář `tinacms/sqlite-level`, v hlavičce zdrojáků copyright Forestry.io Holdings, tedy firma za TinaCMS. Je to `AbstractLevel` nad SQLite přes `better-sqlite3`. Že se opravdu používá, dokládá jeho changelog: verze 2.1.0 zvedla `better-sqlite3` kvůli prebuiltům pro Node 24 s odkazem na issue `tinacms/tinacms#6686`, verze 2.1.1 opravila migraci starých souborů. To není mrtvý kód.

Ověřené detaily, které rozhodují o pracnosti:

| | |
|---|---|
| Rozhraní | `new SqliteLevel({ filename, readOnly? })`, třída `SqliteLevel` |
| `abstract-level` | `^1.0.4` — **přesně to, co čeká `@tinacms/graphql`** (dnes `mongodb-level` sedí na `^1.0.3`) |
| Balíček | čisté ESM (`"type": "module"`, jen `import`) → **odpadá UMD workaround**, který je dnes kvůli `mongodb-level` v `database.ts` |
| Runtime | `better-sqlite3` ^12.10, prebuilty pro Node 24 — projekt běží na v24.11 |

Naproti tomu `classic-level`, který jsem navrhoval minule, je sice udržovanější balíček obecně, ale **žádný příklad jeho použití s Tinou jsem nenašel**. `sqlite-level` je od stejných lidí jako Tina a je na tuhle roli psaný.

**A není to ani nová závislost.** V `pnpm-lock.yaml` už `sqlite-level@2.1.1` je — táhne si ho `@tinacms/search`, které přichází s `@tinacms/cli`. Stejně tak `better-sqlite3@12.11.1`: ten je v lockfilu proto, že ho **better-auth 1.7.2 uvádí jako volitelnou peer závislost**. Obě poloviny téhle migrace tedy stojí na kódu, který v projektu leží už dnes; mění se jen to, že se začne používat.

#### Přihlášení: better-auth má SQLite jako první třídu

Formulace „better-auth přes `kysely`“ z dřívějška je nepřesná v tom, že navádí na ruční skládání dialektu. Ve skutečnosti stačí předat instanci:

```ts
database: new Database('/var/lib/debatovani/auth.sqlite')
```

better-auth objekt rozpozná, sám ho zabalí do `SqliteDialect` a — na rozdíl od dnešní samostatné MongoDB — **zapne transakce**. `MONGODB_TRANSACTIONS=false` tím z projektu mizí, a to je zlepšení, ne jen výměna.

Schéma tabulek si better-auth vytvoří sám: `getMigrations()` z `better-auth/db/migration` se dá zavolat programově, je idempotentní a introspektuje, co chybí. Odpadá tím samostatný krok s `@better-auth/cli` i riziko, že se schéma ve vývoji a v produkci rozejde.

#### Co je na tom ověřené a co ne

Ověřeno na Node 24.11.1 (2. 9. 2026):

- `better-sqlite3@12.11.1` se nainstaluje z prebuiltu, nekompiluje se, a `SqliteLevel` nad ním čte a zapisuje;
- `sqlite-level` sedí na `abstract-level@1.0.4`, což je přesně to, co si žádá `@tinacms/graphql@2.4.10`;
- better-auth detekuje `better-sqlite3` instanci a nastaví jí `transaction: true`.

Neověřeno a k ověření v migraci: chování indexu nad skutečnými 452 dokumenty, doba přeindexování, běh v Docker image a přenos existujících účtů.

**Jedna past, která to nejspolehlivěji rozbije:** `pnpm-workspace.yaml` má `allowBuilds` jen pro `esbuild` a `sharp`. Bez přidání `better-sqlite3` pnpm install skript nespustí, nativní binding nevznikne a modul spadne až za běhu — v prostředí, kde se to nejhůř hledá.

### Jak by pak architektura vypadala

```
        GitHub — obsah (452 souborů MDX/JSON), historie, rollback
             ▲                                   │
   commit přes API                       clone při buildu
             │                                   ▼
┌────────────┴───────────────────┐   ┌───────────────────────────┐
│  jeden Node proces             │   │  GitHub Actions           │
│                                │   │  build 1 m 43 s → deploy  │
│  /admin          statický      │   └─────────────┬─────────────┘
│  /api/tina/*     datalayer ─┐  │                 │
│  /api/auth/*     better-auth┤  │                 ▼
│  /tina-island    vizuální   │  │   ┌───────────────────────────┐
│                  editace    │  │   │  nginx / CDN              │
│                             ▼  │   │  453 statických HTML      │
│      /var/lib/debatovani/      │   │  + 356 přesměrování       │
│        ├── index.sqlite        │   └───────────────────────────┘
│        └── auth.sqlite         │
└────────────────────────────────┘   médiím: Cloudflare R2
```

Proti dnešku se mění **jediná vrstva**: místo databázového serveru dva soubory v jednom adresáři. Všechno ostatní — obsah v gitu, vizuální editace, přihlašování účtem Google Workspace, statický web před Node procesem — zůstává, jak je.

| | Dnes | Po změně |
|---|---|---|
| Index obsahu | MongoDB (`mongodb-level` 0.0.4 + UMD workaround) | `index.sqlite` (`sqlite-level` 2.1.1) |
| Účty a relace | MongoDB (`@better-auth/mongo-adapter`), bez transakcí | `auth.sqlite` (`better-sqlite3` předaný better-authu napřímo), **s transakcemi** |
| Obsah | git | **git, beze změny** |
| Zálohy | zálohovat databázi, nebo umět přeindexovat | zkopírovat dva soubory; index je pořád odvozený z gitu |
| Služby k provozu | Node + MongoDB | **jen Node** |

Co se tím prakticky mění v kódu: `tina/database.ts` (výměna adaptéru, zmizí přetypování kvůli UMD), `src/lib/auth.ts` a `src/lib/mongo.ts` (jiné úložiště better-authu), `.env.example` (`MONGODB_*` → cesta k datovému adresáři), `pnpm-workspace.yaml` (`allowBuilds` pro `better-sqlite3`) a nasazení potřebuje **persistentní volume**.

Rizika, kvůli kterým to chce ověřit, ne rovnou nasadit:

1. **Nativní modul.** `better-sqlite3` se kompiluje, nebo stahuje prebuild. Lokálně na Node 24.11.1 prebuilt existuje a ověřil jsem ho, ale v Docker image se to musí ověřit znovu — jinak `node-gyp` a toolchain. K tomu `allowBuilds` v `pnpm-workspace.yaml`, viz past výš.
2. **Jeden zapisovatel.** SQLite i LevelDB počítají s jedním procesem. U jedné administrace to není omezení, ale vylučuje to škálování do víc instancí.
3. **Persistentní adresář.** Na ephemerálním kontejneru by se index po startu stavěl znovu — u 452 dokumentů levné, ale je potřeba to změřit.
4. **Migrace přihlašování.** Účty a relace se přesouvají mezi úložišti a je to jediná bezpečnostně citlivá část projektu. **Přesouvat se ale nemá co: produkční MongoDB zatím neexistuje** — [13-todo.md](13-todo.md) ji v bodě 2 teprve plánuje postavit. Jediné účty, které dnes někde leží, jsou z testování přihlašovacího toku na `localhost`. Migrace je tedy prázdná operace a `getMigrations()` si tabulky vytvoří na čistém souboru.

**Načasování se tím obrací.** Dřívější „až po spuštění, ne před ním“ platilo pro zásah do běžícího systému. Žádný neběží, takže je to naopak: udělat to **teď** znamená ušetřit si nasazení MongoDB, které by se stejně za pár měsíců rušilo, a odškrtnout položku „postavit MongoDB a rozhodnout o zálohách indexu“ z předstartovního seznamu. Odložit to znamená tu položku splnit, a pak ji zrušit.

### A co Redis?

Redis je varianta, kterou Tina v dokumentaci **sama uvádí** — a přesně v tom je háček. Když se člověk podívá na balíčky, které tu cestu obsluhují, vyjde tohle (stav k 2. 9. 2026, data z npm):

| Balíček | Verze | Poslední vydání | Poznámka |
|---|---|---|---|
| `upstash-redis-level` | 1.1.1 | **16. 11. 2023** | to, na co odkazuje dokumentace Tiny; mluví s Upstash přes REST, tedy **SaaS** |
| `redis-level` | 0.0.5 | 4. 7. 2024 | komunitní adaptér pro vlastní Redis, tři vydání celkem |
| `mongodb-level` | 0.0.4 | — | co používáme dnes |
| `classic-level` | **3.0.0** | **20. 4. 2025** | LevelDB na disku, přímo od organizace Level |
| `sqlite-level` | **2.1.1** | **31. 5. 2026** | SQLite na disku, **od týmu TinaCMS**; už je v `pnpm-lock.yaml` přes `@tinacms/search` |
| `abstract-level` | 3.1.1 | 29. 9. 2025 | společné rozhraní, na kterém to všechno stojí |

Z toho plynou tři věci:

1. **Redis je pořád server.** Proti MongoDB se lehčeji provozuje (jeden proces, triviální konfigurace, žádné otázky kolem replica setu), ale ubyde tím údržba, ne komponenta. Oproti SQLite na disku, kde databázový server zmizí úplně, je to poloviční krok.
2. **Adaptéry jsou nejslabší článek celé téhle úvahy.** Zdokumentovaná cesta stojí na balíčku, který nevyšel skoro tři roky a je vázaný na Upstash; svobodnější `redis-level` je ve verzi 0.0.5. Je to obrácený svět: **doporučená varianta má za sebou nejméně udržovaný kód.** Nejčerstvější položka v celé tabulce je přitom `sqlite-level` — a je od těch, kdo píšou Tinu.
3. **Upstash by navíc znamenal SaaS.** Index není „jen index“ v tom smyslu, že by neobsahoval obsah — obsah v něm je (proto z něj čte i build). Poslat ho k Upstash je tedy rozhodnutí o obsahu, ne jen o infrastruktuře, a naráží na omezení ze zadání.

**Přihlášení to navíc neřeší v žádné variantě.** better-auth má v tomhle projektu k dispozici adaptéry `drizzle`, `kysely`, `memory`, `mongodb` a `prisma` — Redis mezi nimi není. Skončilo by se tedy u „Redis + SQLite“, nebo u „Redis + MongoDB“, což je horší než dnešek.

**Pořadí pro cíl „co nejjednodušší provoz“:** `sqlite-level` + `better-sqlite3` na disku (žádný databázový server, jeden nativní modul obsluhuje index i účty, obojí od lidí, kteří píšou Tinu a better-auth) → `classic-level` + SQLite (taky bez serveru, ale index a účty by stály na dvou různých formátech a s Tinou to nikdo nepoužívá) → Redis + SQLite (jeden lehký server, zdokumentovaná cesta) → dnešní MongoDB (jeden těžší server, ale slouží obojímu a běží). Jediný scénář, kde Redis vyhrává nad diskem, je administrace běžící ve více instancích — což tady nehrozí a co ostatně vylučuje i jediný zapisovatel do SQLite.

**Vybráno je proto první pořadí.** Proti `classic-level`, který jsem navrhoval minule, mluví tři věci: `sqlite-level` je v projektu už dnes, je psaný pro Tinu a sdílí `better-sqlite3` s better-authem, takže se nativní modul instaluje jednou místo dvakrát.

Nezávisle na volbě platí jedna věc: **ztráta indexu znamená spustit indexaci znovu** (dnes součást buildu). Ten postup má být napsaný a jednou vyzkoušený tak jako tak — je to bod 3 v sekci 8.
