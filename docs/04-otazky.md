# Otevřené otázky před zahájením návrhu

Seřazeno podle toho, jak moc odpověď mění výsledné řešení.

## Stav odpovědí (31. 8. 2026)

**Zodpovězeno — start implementace tím není blokovaný:**

| Téma | Odpověď | Důsledek |
|---|---|---|
| **Git provider** | **GitHub** | omezení „žádný SaaS“ se týká CMS a obsahu, ne vývojové infrastruktury → GitHub Actions jako CI, GitHub OAuth pro přihlášení do Tiny, a **Cloudflare R2 pro média je tím taky přípustné** |
| **13 — data o klubech** | zatím pár vzorových záznamů, zbytek se doplní | kolekce `clubs` se navrhne podle schématu, ne podle dat; mapa a výpis se staví na 3–5 fixtures |
| **6 — Portál debatování** | řeší se jako **rozšíření**, architektura se od něj neodvozuje | portál nesmí ovlivnit obsahový model ani routing hlavního webu; napojení na debata21 API se navrhne jako oddělitelná vrstva |
| **2 — správa webu** | pár technicky zdatných lidí, **volnosti spíš víc** | `overrides` na rich-textu zůstanou široké, raw HTML blok je přípustný, `visualSelector` je komfort, ne nutnost |
| **17 — brand** | brand manuál není, **paleta a typografie se odvodí ze stávajícího webu a loga** | **hotovo** — [11-design-tokeny.md](11-design-tokeny.md); zbývají 4 otázky na ADK (SVG loga, odchod pastelové linie, role barev, tmavý režim) |

**Zbývá vyjasnit:**

| # | Otázka | Proč na tom záleží |
|---|---|---|
| 8 | **Rozsah anglické verze** — plnohodnotně dvojjazyčný web, jen anglická sekce, nebo angličtinu vypustit? | rozhoduje o tom, kolik práce navíc je při rekonstrukci každé stránky |

Odpověď na 8 ale **nemusí blokovat start**: pokud se od začátku použije adresářová konvence `content/<kolekce>/<jazyk>/…` (viz `06`, sekce 4), zůstanou obě cesty otevřené a rozhodnutí se dá odložit. Přejmenovávat cesty později, s 357 naimportovanými články, je drahé — zavést konvenci hned je skoro zadarmo.

## A. Zadání a rozhodovací pravomoc

1. **Je to zakázka pro ADK, nebo tvůj vlastní projekt?** Jinými slovy: existuje na straně asociace někdo, kdo schvaluje design a obsah, nebo rozhoduješ ty?
2. ~~**Kdo bude web spravovat po spuštění?**~~ **Zodpovězeno:** pár technicky zdatných lidí, s poměrně velkou volností v editoru.
3. **Je stanovený termín?** Např. začátek debatní sezóny (září) nebo termín grantu.
4. **Jsou finance na SaaS?** (Storyblok/Sanity mají free tier, ale růst obsahu ho může přerůst.) Nebo musí být provoz na 0 Kč?

## B. Rozsah

5. **Redesign = jen nový vzhled a technologie, nebo i nová informační architektura?** Audit ukazuje, že web míchá dvě publika (veřejnost vs. interní komunita debatérů) — to je obsahové rozhodnutí, ne designové.
6. ~~**Co se stane s Portálem debatování?**~~ **Zodpovězeno:** řeší se jako rozšíření, architektura hlavního webu se od něj neodvozuje. Dnešní stav (subdoména = fullscreen iframe) je k nahrazení tak jako tak.
7. **Co s `elearning.debatovani.cz`?** Aktuálně vrací **HTTP 500** — je rozbitý. Opravit, migrovat, nebo zrušit?
8. **Anglická verze:** dnes je to jediná osiřelá stránka `/en/`, ale máte 31 anglických článků v rubrice „Debate League“ a `debata21` API vrací dvojjazyčná data. Má nový web být plnohodnotně dvojjazyčný, mít jen anglickou vstupní stránku, nebo angličtinu vypustit?
9. **Patří do zadání i `pds.debatovani.cz` (Prague Debate Spring)?**

## C. Systém debata21

10. **Kdo vyvíjí a spravuje `api-prod.debata21.cz`?** Je s ním možné mluvit o rozšíření endpointů (např. seznam klubů, statistiky pro homepage)?
11. **Čísla na homepage (628 debat, 400 členů, 44 klubů) — jsou ručně přepsaná, nebo se dají z API dopočítat?** Ideálně by se měla generovat automaticky.
12. **Má portál nějakou přihlašovací část, která by měla být součástí nového webu?** (`/api/user` a `/api/team` vracejí 401, takže autentizace tam existuje.)

## D. Obsah a data

13. ~~**Kde jsou data o 44 debatních klubech?**~~ **Zodpovězeno:** zatím se použije pár vzorových záznamů, zbytek se doplní později. Zdroj (Google Sheets / evidence v debata21) je ale pořád potřeba dohledat před spuštěním.
14. **Dokumenty (zápisy, soutěžní dokumenty, metodika) — zůstávají na Google Drive?** Doporučuji ano, jen je na webu strukturovaně vypisovat.
15. **Přihlášky přes Google Forms — zůstávají?** Nebo se mají nahradit formuláři na webu?
16. **Jaká služba posílá newsletter?** (Z HTML to nejde vyčíst — formulář je WPForms.)
17. ~~**Je k dispozici brand manuál / logo ve vektoru / definované barvy?**~~ **Zodpovězeno:** manuál není, paleta a typografie se odvodí ze stávajícího webu a loga. Pozor: dnešní paleta (oranžová, pastelová zelená, meruňková, modrá) vypadá spíš jako výsledek šablony než jako záměr — při extrakci je potřeba oddělit, co je značka (logo) a co je náhodné dědictví šablony.
18. **Fotobanka:** je souhlas s užitím fotek nezletilých debatérů ošetřen? (1 377 mediálních souborů, hodně portrétů z turnajů.)

## E. Provoz

_Otázky provozu nového řešení (git provider, média, buildy, přihlašování, zálohy) jsou v [06-doporucena-architektura.md](06-doporucena-architektura.md), sekce 6._

19. **Co s VAS Hostingem?** Node server pro nový web je k dispozici, takže hosting není blocker. VAS Hosting je ale uvedený mezi partnery — je to sponzorský dar? Pokud ano, co odchodem toho vztahu skončí?
20. **Kdo má přístup ke správě domény a DNS?**
21. **Musí zůstat WordPress dostupný i po přechodu** (archiv, něčí zvyk), nebo se vypíná?
22. **Analytika:** má zůstat GA4 (a s ním nutnost cookie lišty), nebo lze přejít na bezcookie řešení (Plausible/Umami)?

## F. Design

23. **Existuje zpětná vazba od uživatelů?** Např. že učitelé nemohou něco najít, že se lidé ztrácejí v přihláškách. Pokud ne, doporučuji 3–5 krátkých rozhovorů (učitel, nový zájemce, zkušený debatér) — pro redesign to má větší hodnotu než jakákoli analýza HTML.
24. **Co je hlavní konverzní cíl homepage?** Dnes tam soupeří pět tlačítek („Zapojte se“, „Debatování pro SŠ“, „Debatování pro ZŠ“, „Aktuální události“, „Přihlaste se na nejbližší událost“) plus formulář. Jedna hlavní akce by výrazně pomohla.
25. **Máš nějaké referenční weby**, které se ti líbí a měly by udávat směr?
