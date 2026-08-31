# Vícejazyčnost napříč kandidáty

_Otázka: pokud ne TinaCMS, ale Puck + něco dalšího — co má dobrou podporu i18n?_

## Souhrn

| Nástroj | i18n obsahu | Struktura sdílená mezi jazyky? | Fallback | Přepínač jazyků v editoru |
|---|---|---|---|---|
| **Payload 3** (MIT) | **nativní, field-level** (`localized: true`) | **ano** — jeden dokument, lokalizují se jen označená pole | ano, na výchozí jazyk (lze vypnout) | ano, v horní liště; `filterAvailableLocales` |
| **Directus** (MSCL) | **nativní, translations interface** | **ano** — vyberete, která pole jsou přeložitelná | v dokumentaci neuvedeno | ano, jazykové taby; navíc „Translate with AI" |
| **TinaCMS** | konvence (adresáře nebo vnořená pole) | podle zvolené strategie | řešíte si sám | procházení dokumentů |
| **Sveltia CMS** | prvotřídní i18n | ano | ano | ano |
| **Puck** | **žádná** — viz níže | – | – | – |

## Puck a vícejazyčnost: pozor na záměnu

Puck **má** stránku „Localization" v dokumentaci, ale ta se týká **překladu rozhraní editoru** (prop `dictionary`, napojitelný na `react-i18next` nebo `next-intl`). S vícejazyčným **obsahem** nemá nic společného.

Pro obsah maintainer v [diskuzi #190](https://github.com/puckeditor/puck/discussions/190) (otevřená od října 2023, dodnes bez oficiálního řešení) navrhuje tři cesty:

1. přenechat vícejazyčnost externímu CMS a data tahat přes `external` field
2. vlastní pole, které drží objekt `{ cs: "Ahoj", en: "Hello" }` a přepíná se taby
3. plugin kombinující vlastní pole s přepínačem jazyka

## Proč „Puck + CMS s dobrou i18n" problém nevyřeší samo

Tohle je nejdůležitější věc celého dokumentu. Puck ukládá **jeden JSON strom celé stránky**. Když ho uložíte do Payloadu nebo Directusu jako pole, máte dvě možnosti a obě jsou špatně:

| Co uděláte | Výsledek |
|---|---|
| pole s Puck JSON označíte jako lokalizované | **dva nezávislé JSONy** → struktura se rozejde, tlačítko přidáváte dvakrát — přesně ten problém, kterému jste se chtěl vyhnout |
| pole necháte nelokalizované | jeden JSON pro oba jazyky → texty existují jen v jednom jazyce |

Nativní i18n toho CMS se totiž vztahuje na **jeho vlastní pole**, ne na obsah blobu, který mu Puck podstrčí. Pro CMS je Puck JSON neprůhledný kus dat.

**Závěr: u Pucku se i18n musí vyřešit uvnitř bloků** — každé textové pole jako vlastní field s taby cs/en (cesta 2 od maintainera). Je to jedna znovupoužitelná field komponenta plus konvence, že bloky dostávají aktuální locale. Není to drama, ale je to kód, který u Payloadu dostanete zadarmo.

## Co z toho plyne pro volbu

Když je vícejazyčnost důležitá a drag-and-drop není must-have (což jste potvrdil), **vypadá Payload 3 silněji než Puck i než Tina**:

| | Payload 3 | Puck + Payload | TinaCMS |
|---|---|---|---|
| skládání bloků | nativní `blocks` field, řazení v panelu | drag-and-drop na plátně | `object list` + `visualSelector` |
| náhled | live preview v iframu | plátno = náhled | živý náhled, click-to-edit |
| **i18n** | **nativní, struktura sdílená** | **musíte napsat sám** | konvence |
| média, role, verze | nativní | z Payloadu | git historie |
| bloky psané v | React (admin) + Astro (web) | React | **Astro** |
| úložiště | Postgres / Mongo | Postgres / Mongo | git + DB pro index |
| provoz | Next.js admin app + DB | totéž + Puck | Node + DB |

Payload má i experimentální `localizeStatus: true`, tedy **nezávislé publikování obsahu po jazycích** — český článek může být venku, anglický rozepsaný.

Háček Payloadu: administrace je **Next.js aplikace**, takže vedle Astro webu poběží druhá aplikace. Při vašem hostingu to není překážka, ale je to o jednu pohyblivou součástku víc než u Tiny, a bloky se píší dvakrát (React pro admin preview, Astro pro web) — pokud nechcete web renderovat rovnou z Payloadu.

## Doporučení

1. **Pokud je i18n opravdu důležitá** (chcete plnohodnotnou anglickou verzi, ne jen pár stránek): **Astro + Payload 3**. Nativní field-level lokalizace se sdílenou strukturou je přesně odpověď na otázku „musím tlačítko přidávat dvakrát?" — nemusíte.
2. **Pokud je angličtina okrajová** (dnešní stav: 31 článků Debate League + jedna stránka): **Astro + TinaCMS** zůstává v pořádku, i18n konvencí přes lokalizovaná pole u stránek a adresáře u článků.
3. **Puck** dává smysl jen tehdy, když drag-and-drop nakonec převáží nad vším ostatním. Pak počítejte s tím, že vícejazyčnost si napíšete sám.

Mimochodem `debata21` API má lokalizaci vyřešenou přesně field-level (`name: {cs, en}`, `note: {cs, en}`) — váš vlastní backend tu volbu už udělal a Payload by na něj konvenčně navazoval.
