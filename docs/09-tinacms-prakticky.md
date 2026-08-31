# TinaCMS prakticky — co umí a kde jsou háčky

_Odpovědi na konkrétní otázky k volbě TinaCMS. Hosting už není omezení; git provider je GitHub._

## 1. Rich text / WYSIWYG — ano, vlastní

Tina má **vlastní rich-text editor s WYSIWYG rozhraním**. Obsah ukládá jako **Markdown**, a jakmile do textu vložíte komponentu, jako **MDX**.

Umí: tučné, kurzívu, kód, nadpisy, odrážkové i číslované seznamy, bloky kódu, odkazy, obrázky, tabulky, zvýraznění textu s vlastními barvami. Má **režim raw Markdown** pro přepnutí.

Dvě věci, které stojí za pozornost:

- **Vlastní komponenty přímo v textu** — přes `templates` na rich-text poli lze do článku vkládat vlastní prvky (MDX embed): tlačítko, upozornění, citace, vložené video. Redakce je přidá z editoru jako blok uvnitř odstavců.
- **`overrides`** — dá se omezit, co je v panelu nástrojů vidět. Když nechcete, aby redakce sázela H1 nebo měnila barvy, prostě to schováte. To je přesně ta páka, která u Elementoru chyběla. **Pro tento projekt zůstanou `overrides` široké** — redakci tvoří pár zdatných lidí a bylo potvrzeno, že mají dostat volnost. Skrývat se bude jen to, co prokazatelně rozbíjí konzistenci (H1, vlastní barvy textu).

Omezení: **tabulky zvládají jen jednořádkové buňky** (žádný odstavec uvnitř buňky). A MDX obsah je do jisté míry vázaný na Tinu — při případném odchodu se komponenty musí namapovat jinam. Čistý Markdown tímhle netrpí.

Pro migraci je to dobrá zpráva: 357 článků je v čistém Gutenbergu, převod do Markdownu sedí na Tina rich-text bez ztráty.

## 2. Bloky — bez sloupců, ale s vizuálním výběrem

Bloky se definují jako `templates` v poli typu `object` s `list: true`. Editor je v panelu přidává, řadí a maže.

Navíc existuje **experimentální `visualSelector: true`**: každý blok dostane `previewSrc` (náhledový obrázek) a volitelně `category`, a redakce pak **vybírá bloky z obrázků, ne ze seznamu názvů**. Pro netechnické editory je to velký rozdíl v použitelnosti — stojí za to to zapnout hned.

Co tam není: sloupce a mřížka. Řeší se tak, že se do bloku dá pole „rozvržení: 1 / 2 / 3 / 4 sloupce", a blok si šířky ošetří sám. Z inventury v `05-rekonstrukce-rozsah.md` vyplývá, že web používá jen 100 / 50 / 33 / 25 / 20 % — na to čtyři varianty bohatě stačí.

## 3. Vícejazyčnost — funguje, ale není to zadarmo

**Tohle je nejslabší bod Tiny a je dobré do toho jít s realistickým očekáváním.** i18n **není nativní funkce, je to konvence.** Dvě doporučené strategie:

**a) Adresáře podle jazyka**
```
content/articles/cs/prihlaska-do-tymu-ippf.md
content/articles/en/ippf-team-application.md
```
Editor prochází jazyky přes seznam dokumentů. Nový překlad vznikne přes „duplicate document" a ruční přejmenování cesty.

**b) Lokalizovaná pole**
```json
{ "title": { "cs": "Debatní liga", "en": "Debate League" } }
```
Jazykové varianty se zobrazí jako podpole. Pro Markdown obsah se ale doporučuje varianta (a).

**Co Tina neumí:** automatické propojení překladů mezi sebou a indikátor stavu překladu. Redakce nikde neuvidí „tenhle článek nemá anglickou verzi". Spravuje se to ručně. V repozitáři jsou k tomu otevřené diskuze o nativní i18n podpoře — projekt o tom ví, hotové to není.

**Pro ADK to nejspíš stačí**, protože nepotřebujete zrcadlový dvojjazyčný web: dnes existuje 31 anglických článků (rubrika Debate League) a jedna anglická stránka. Routing `/en/…` řeší samo Astro. Ale „vyřeší to snadno" bych netvrdil — je to konvence, kterou musíte navrhnout a redakci vysvětlit.

## 4. Custom HTML blok jako únikový ventil

Technicky triviální: pole typu `string` s textarea, v Astru vyrenderované přes `set:html`. Funguje.

Ale stojí za to to udělat cíleně, protože raw HTML má tři reálné náklady:

1. **Bezpečnost** — kdokoli s přístupem do CMS může vložit `<script>`, cizí iframe nebo tracker. Při potvrzené redakci (pár technicky zdatných lidí) je to menší riziko než u širokého okruhu netechnických editorů, ale platí to o to víc, kdyby se okruh později rozšířil. Mitigace: sanitizovat HTML při buildu, nebo blok zpřístupnit jen roli správce.
2. **Ztráta optimalizací** — obrázky v raw HTML neprojdou `astro:assets`, takže žádné WebP ani `srcset`. To je přesně ta věc, kvůli které z Elementoru odcházíte.
3. **Rozbití layoutu a responzivity** — nikdo to nezkontroluje.

**Doporučení: mít specifické bloky pro známé embedy a raw HTML nechat jako poslední instanci.** Na dnešním webu jsou přesně čtyři opakující se případy:

| Embed | Vlastní blok dá navíc |
|---|---|
| YouTube | lazy loading, správný poměr stran, náhled bez načítání YT skriptů |
| Google Forms (přihlášky) | konzistentní rám, výška, odkaz „otevřít ve vlastním okně" |
| Google My Maps (mapa klubů) | nahradí se datovým blokem `MapaKlubů` |
| Padlet | jednotný styl |

Když tyhle čtyři pokryjete bloky, raw HTML bude potřeba výjimečně — a přesně o to jde.

## 5. Shrnutí pro rozhodnutí

| Vaše otázka | Odpověď |
|---|---|
| Vyřeší Tina vícejazyčnost snadno? | Vyřeší, ale konvencí — bez propojení překladů a bez stavu překladu. Pro váš rozsah dostačující. |
| Vadí, že nemá drag&drop a sloupce? | Ne, když je nepotřebujete. Rozvržení jako pole bloku pokryje všechna dnes používaná. |
| Zachrání to custom HTML blok? | Jako ventil ano, jako výchozí řešení ne. Nejdřív bloky pro čtyři známé embedy. |
| Má vlastní WYSIWYG? | Ano, s Markdown/MDX výstupem, komponentami v textu a omezitelným panelem nástrojů. |

Zbývá ověřit v PoC: **kompatibilitu `@tinacms/astro` s Astro 7** (dokumentace mluví o Astro 6+) a chování `visualSelector` na reálných blocích.
