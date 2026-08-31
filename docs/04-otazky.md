# Otevřené otázky před zahájením návrhu

Seřazeno podle toho, jak moc odpověď mění výsledné řešení.

## A. Zadání a rozhodovací pravomoc

1. **Je to zakázka pro ADK, nebo tvůj vlastní projekt?** Jinými slovy: existuje na straně asociace někdo, kdo schvaluje design a obsah, nebo rozhoduješ ty?
2. **Kdo bude web spravovat po spuštění?** Kolik lidí, jak technicky zdatných, a počítá se s tím, že se budou střídat? (Toto rozhoduje mezi Storyblokem, Keystaticem a headless WP víc než cokoli jiného.)
3. **Je stanovený termín?** Např. začátek debatní sezóny (září) nebo termín grantu.
4. **Jsou finance na SaaS?** (Storyblok/Sanity mají free tier, ale růst obsahu ho může přerůst.) Nebo musí být provoz na 0 Kč?

## B. Rozsah

5. **Redesign = jen nový vzhled a technologie, nebo i nová informační architektura?** Audit ukazuje, že web míchá dvě publika (veřejnost vs. interní komunita debatérů) — to je obsahové rozhodnutí, ne designové.
6. **Co se stane s Portálem debatování?** Zůstává jako součást webu, nebo se osamostatní? Dnešní stav (subdoména = fullscreen iframe na stránku hlavního webu) je určitě k nahrazení.
7. **Co s `elearning.debatovani.cz`?** Aktuálně vrací **HTTP 500** — je rozbitý. Opravit, migrovat, nebo zrušit?
8. **Anglická verze:** dnes je to jediná osiřelá stránka `/en/`, ale máte 31 anglických článků v rubrice „Debate League“ a `debata21` API vrací dvojjazyčná data. Má nový web být plnohodnotně dvojjazyčný, mít jen anglickou vstupní stránku, nebo angličtinu vypustit?
9. **Patří do zadání i `pds.debatovani.cz` (Prague Debate Spring)?**

## C. Systém debata21

10. **Kdo vyvíjí a spravuje `api-prod.debata21.cz`?** Je s ním možné mluvit o rozšíření endpointů (např. seznam klubů, statistiky pro homepage)?
11. **Čísla na homepage (628 debat, 400 členů, 44 klubů) — jsou ručně přepsaná, nebo se dají z API dopočítat?** Ideálně by se měla generovat automaticky.
12. **Má portál nějakou přihlašovací část, která by měla být součástí nového webu?** (`/api/user` a `/api/team` vracejí 401, takže autentizace tam existuje.)

## D. Obsah a data

13. **Kde jsou data o 44 debatních klubech?** Dnes existují jen uvnitř Google My Maps. Je někde tabulka (Google Sheets, evidence v debata21), ze které se dají vytáhnout adresy, kontakty a souřadnice?
14. **Dokumenty (zápisy, soutěžní dokumenty, metodika) — zůstávají na Google Drive?** Doporučuji ano, jen je na webu strukturovaně vypisovat.
15. **Přihlášky přes Google Forms — zůstávají?** Nebo se mají nahradit formuláři na webu?
16. **Jaká služba posílá newsletter?** (Z HTML to nejde vyčíst — formulář je WPForms.)
17. **Je k dispozici brand manuál / logo ve vektoru / definované barvy?** Dnešní paleta (oranžová, pastelová zelená, meruňková, modrá) vypadá spíš jako výsledek šablony než jako záměr.
18. **Fotobanka:** je souhlas s užitím fotek nezletilých debatérů ošetřen? (1 377 mediálních souborů, hodně portrétů z turnajů.)

## E. Provoz

19. **Kde web běží dnes a kdo za hosting platí?** VAS Hosting je uvedený mezi partnery — je to sponzorský dar? Pokud ano, přesun na Cloudflare Pages by ten vztah mohl narušit.
20. **Kdo má přístup ke správě domény a DNS?**
21. **Musí zůstat WordPress dostupný i po přechodu** (archiv, něčí zvyk), nebo se vypíná?
22. **Analytika:** má zůstat GA4 (a s ním nutnost cookie lišty), nebo lze přejít na bezcookie řešení (Plausible/Umami)?

## F. Design

23. **Existuje zpětná vazba od uživatelů?** Např. že učitelé nemohou něco najít, že se lidé ztrácejí v přihláškách. Pokud ne, doporučuji 3–5 krátkých rozhovorů (učitel, nový zájemce, zkušený debatér) — pro redesign to má větší hodnotu než jakákoli analýza HTML.
24. **Co je hlavní konverzní cíl homepage?** Dnes tam soupeří pět tlačítek („Zapojte se“, „Debatování pro SŠ“, „Debatování pro ZŠ“, „Aktuální události“, „Přihlaste se na nejbližší událost“) plus formulář. Jedna hlavní akce by výrazně pomohla.
25. **Máš nějaké referenční weby**, které se ti líbí a měly by udávat směr?
