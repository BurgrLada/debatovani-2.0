# Okamžitá publikace: od statického buildu k vykreslování na vyžádání

_Změna architektury z 2. 9. 2026. Ruší podmínku ze [06-doporucena-architektura.md](06-doporucena-architektura.md), sekce 2, a je proto potřeba ji vysvětlit, ne jen zapsat._

## 1. Co bylo špatně

Web se generoval staticky: build vyrobil 453 HTML souborů, nginx je servíroval a Node proces obsluhoval jen administraci. Redakční smyčka vypadala takhle:

```
uložení v adminu → commit do gitu → build → nasazení → web
```

Redaktor viděl svou změnu v administraci hned, **návštěvník až po dalším nasazení**. To trvalo 6 minut a s vypnutým automatickým nasazením se nestalo vůbec — muselo se na deploy kliknout.

Pro web, kde se publikují aktuality, je to špatně. CMS, jehož změny se neobjeví, je z pohledu redakce rozbitý.

## 2. Co se změnilo

Obsahové routy mají `prerender = false` a vykreslují se při požadavku z indexu, který Node proces má vedle sebe. Před nimi stojí **cache vykresleného HTML v paměti procesu** (`src/lib/render-cache.ts`, `src/middleware.ts`), takže druhé a další načtení je stejně rychlé jako dřív statický soubor.

Uložení v administraci cache zahodí. Návštěvník tím vidí změnu při dalším načtení stránky.

| | Dřív | Teď |
|---|---|---|
| Změna viditelná návštěvníkovi | po dalším nasazení (6 min, ručně) | **ihned** |
| Odpověď z cache | statický soubor | 1,7 ms |
| Odpověď mimo cache | — | 55–65 ms článek, ~4 s první výpis po uložení |
| `astro build` | ~50 s (453 stránek) | **4,4 s** (2 stránky) |
| Celý `pnpm build` | 1 m 24 s | **31 s** |

Zrychlení buildu je vedlejší produkt: co se nepředgeneruje, se nemusí generovat.

## 3. Co to stálo

**Pád Node procesu teď shodí i web.** Dřív běžel statický web dál a nedostupná byla jen administrace — a přesně tahle vlastnost byla v [06](06-doporucena-architektura.md) uvedená jako podmínka celého rozhodnutí:

> Web pak zůstává statické HTML servírované z cache a Node proces obsluhuje pouze administraci. Když se tohle neudělá vědomě, je celý web on-demand a pád administrace ho shodí — tedy přesně ten failure mode, kvůli kterému se odchází z WordPressu.

Slovo **vědomě** je tu důležité. Tohle rozhodnutí vědomé je: vyměnili jsme odolnost za okamžitou publikaci, protože zpoždění bylo pro redakci horší než riziko výpadku.

Zbytek ceny:

- **Cache je v paměti**, takže restart ji vyprázdní a první požadavek na každou stránku se vykreslí znovu. U 453 stránek po desítkách milisekund je to zanedbatelné.
- **Sitemapa se musela přepsat.** `@astrojs/sitemap` ji skládal z vygenerovaných souborů, které už nevznikají — nahradil ji `src/pages/sitemap.xml.ts`. Adresa se změnila z `/sitemap-index.xml` na `/sitemap.xml`. Jako bonus je sitemapa vždy aktuální, dřív byla stará jako poslední build.
- **Výpis aktualit a články jsou v jedné routě.** Adresy `/aktuality/2/` a `/aktuality/<slug>/` mají stejný tvar; při statickém generování se routy nikdy nepotkaly, při vykreslování na vyžádání se potkávají pokaždé. Rozhoduje jedno místo (`src/pages/aktuality/[...slug].astro`) — číslo je strana, cokoli jiného slug.

## 4. Jak je to rychlé doopravdy

Naměřeno lokálně, 347 aktualit a 67 stránek:

| | |
|---|---|
| Stránka z cache | **1,7 ms** |
| Článek mimo cache | 55–65 ms |
| Stránka mimo cache | ~60 ms |
| První výpis aktualit po uložení | ~4 s |

Ten poslední řádek je jediné slabé místo: `listArticles()` prochází celou kolekci přes kurzory. Řeší se dvěma způsoby:

1. **Memoizace výpisů** (`src/lib/data.ts`) — kolekce se projde jednou a drží se, dokud se obsah nezmění. Bez toho by tu cenu platil první požadavek na **každou** stránku, protože i routa jednoho dokumentu potřebuje výpis kvůli `hreflang`.
2. **Předehřátí na pozadí** — po uložení se výpisy načtou samy, aniž by na to někdo čekal. Odehraje se to mezi uložením a příchodem návštěvníka, takže ten dostane odpověď v desítkách milisekund.

## 5. Ústupová cesta

Kdyby se ukázalo, že odolnost je důležitější než okamžitá publikace, návrat je levný: z obsahových rout zmizí `prerender = false` a vrátí se `getStaticPaths()`. Cache i memoizace můžou zůstat — bez on-demand rout se jen nikdy nepoužijí.

Druhá, dražší cesta je **rozdělit web a administraci na dvě služby**, jak počítá [06](06-doporucena-architektura.md) sekce 2. Pak může web běžet on-demand a přesto přežít pád administrace, protože to budou dva procesy. Sáhnout po tom má smysl, až bude web dost navštěvovaný na to, aby výpadek bolel.

## 6. Co zbývá zvážit

- **Cache se zahazuje celá**, ne po stránkách. Uložení jednoho článku vyhodí i stránky, kterých se netýká. Je to schválně — vyjmenovat závislosti by šlo, ale na jednu se dřív nebo později zapomene a někde zůstane viset starý obsah. Kdyby přegenerování začalo být drahé, je tohle první místo ke zpřesnění.
- **Cache nezná víc instancí.** Kdyby administrace někdy běžela ve víc kontejnerech, každý by měl vlastní a uložení by zahodilo jen tu svou. Zatím to nehrozí — SQLite index má stejné omezení ([16-migrace-sqlite.md](16-migrace-sqlite.md)).
- **Média mají vlastní cestu.** Nahrání obrázku cache taky zahodí, protože se může projevit na stránce, která už je vykreslená.
