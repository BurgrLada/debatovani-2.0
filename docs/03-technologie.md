# Hodnocení technologické volby

_Otázka zadání: Astro + TypeScript jako framework, PuckJS jako editor stránek._

> **Upřesnění zadání (27. 8. 2026):** nevzniká nový vzhled — jde o **rekonstrukci stávajícího webu v jiné technologii**, klíčem je přechod od WordPressu k vlastnímu řešení. Obsah bude spravovat **netechnická redakce ADK**. Doporučení v sekci 4 čti spolu s [05-rekonstrukce-rozsah.md](05-rekonstrukce-rozsah.md), kde je tato varianta rozebraná na měřených datech.

## Shrnutí verdiktu

- **Astro + TypeScript: ano, jednoznačně.** Pro tento typ webu je to prakticky ideální volba a nemám k ní výhrady.
- **Puck: opatrně, a pravděpodobně ne jako hlavní CMS.** Puck řeší 20 % problému (skládání bloků na stránce) a nechává na vás 80 % (autentizace, média, verzování, náhledy, role, i18n, workflow, publikace). Pro tříčlennou redakci neziskovky, kde se lidé střídají, je to riziko udržitelnosti.

---

## 1. Astro — hodnocení

Aktuální verze **7.2.9** (MIT, vydáno 27. 8. 2026).

**Proč sedí na tento web:**

| Potřeba z auditu | Jak ji Astro řeší |
|---|---|
| 2,5 MB JS/CSS na homepage | zero-JS by default; JS jen tam, kde ho vážně chcete (mapa, filtry) |
| Články jako Markdown | content collections s typovaným schématem (Zod) — TypeScript hlídá, že článek má perex a obrázek |
| Napojení na `debata21` API | serverový fetch při buildu; žádný klientský JS vlepený do builderu |
| 357 článků, 3 nové měsíčně | statický build je za pár vteřin, hostuje se zdarma |
| Obrázky (295 kB mapa, fotky bez srcset) | `astro:assets` — automatický WebP/AVIF, `srcset`, `width`/`height` |
| Bezpečnostní hlavičky, žádná PHP plocha | statické soubory za CDN, prakticky nulová attack surface |
| Dvojjazyčnost | vestavěné i18n routing (`/en/…`) |

**Rizika Astra:**

- Rychlý vývoj frameworku (v7 dnes; major verze cca 1×ročně) → nutná pravidelná údržba závislostí. U webu, který se dnes 3 roky neaktualizoval, to je reálné riziko: **statický web ale zastaráváním neexploduje** (na rozdíl od Elementoru s neopravenou zranitelností), takže riziko je mnohem měkčí než dnes.
- Vyžaduje build pipeline a někoho, kdo ji umí spustit. Dnešní model „přihlásím se do WP a kliknu“ zaniká — musí ho nahradit CMS s automatickým deployem.

**Alternativy, které jsem zvážil a nedoporučuji:** Next.js (zbytečná složitost, RSC, potřeba Node runtime), Nuxt (totéž ve Vue), 11ty (méně komfortu, žádný typový systém), zůstat na WP s lehčí šablonou (neřeší redakční ani výkonový problém do hloubky).

---

## 2. Puck — hodnocení

**Fakta k dnešku:** balíček `@measured/puck` je **deprecated**, projekt se přestěhoval na **`@puckeditor/core` verze 0.23.0** (MIT, React 18/19). Tedy stále **pre-1.0**, s proběhlou změnou názvu balíčku a probíhajícími breaking changes napříč minor verzemi.

### Co Puck umí dobře

- Skládání stránky z **vašich** komponent → editor nemůže rozbít design (na rozdíl od Elementoru, který dovolí nastavit cokoli)
- Výstup je čistý JSON → verzovatelný, diffovatelný, přenositelný
- MIT licence, žádný vendor lock-in, aktivní vývoj (0.21 přinesla AI generování stránek, rich text)
- Dobré API pro definici polí a plug-iny

### Co Puck neumí (a co byste museli postavit sami)

| Chybí | Co to znamená v praxi |
|---|---|
| Autentizace a role | postavit login, správu uživatelů, oprávnění |
| Perzistence obsahu | vlastní API + databáze nebo commit do gitu; Puck jen předá JSON |
| Správa médií | upload, ořez, alt texty, knihovna 1 377 souborů — celé sami |
| Verzování a rollback | sami |
| Náhled před publikací / draft vs. published | sami |
| Workflow, historie, „kdo co změnil“ | sami |
| Správa článků, klubů, lidí (strukturovaný obsah) | Puck je editor **stránek**, ne redakční systém — potřebujete druhý nástroj |
| i18n | sami |
| Nasazení po uložení | webhook + rebuild pipeline sami |

### Technický třecí bod s Astrem

Puck je **React**. Astro umí React komponenty renderovat, ale znamená to, že **všechny editovatelné bloky musí být `.tsx`, ne `.astro`** — a Astro-only vychytávky (`astro:assets`, `getCollection`) v nich nefungují přímo. Buď:

- **a)** píšete bloky v Reactu a v Astru je jen renderujete serverově (funguje, ale ztrácíte část komfortu Astra a přidáváte React do buildu), nebo
- **b)** udržujete **dvě sady komponent** — React pro editor, Astro pro web — což je duplicita, která se rozejde během půl roku.

K tomu Puck editor sám potřebuje **běžící React aplikaci** (samostatná admin app nebo Astro v SSR módu s Node runtime), takže „čistě statický web zdarma na Cloudflare Pages“ přestává platit pro admin část.

### Udržitelnost pro ADK

Toto považuji za rozhodující argument. Web dnes stojí na WordPressu, který **tři roky nikdo neaktualizoval** — to je typický profil neziskovky, kde se dobrovolní správci střídají. Custom řešení postavené kolem Pucku (vlastní auth + vlastní úložiště + vlastní media manager + vlastní deploy hook) je **kód, který někdo musí udržovat**. Jakmile odejdete, ADK zůstane s věcí, kterou nikdo jiný nezná.

Hotové CMS je v tomto ohledu bezpečnější: má dokumentaci, komunitu a nástupce ho nastuduje za odpoledne.

---

## 3. Alternativy k Pucku

| Řešení | Editor stránek | Strukturovaný obsah | Média | Hosting adminu | Cena | Rizika |
|---|---|---|---|---|---|---|
| **Keystatic** (0.6.9, MIT) | bloky přes `blocks` field, ne drag-and-drop náhled | výborný, typovaný, Astro-first | v gitu / cloud | běží v Astru, žádný server navíc | zdarma | admin UI je forms-based, ne WYSIWYG; obsah v gitu |
| **Storyblok** (`@storyblok/astro` 10.3.1) | **skutečný vizuální editor s bloky** — to, co od Pucku chcete, hotové | výborný | vestavěné, CDN | SaaS | free tier; **program pro neziskovky** | vendor lock-in, závislost na cizí službě |
| **Sanity** (`@sanity/client` 8.3.0) | Presentation mode (vizuální editace) | nejsilnější model | vestavěné | Studio lze hostovat u sebe | štědrý free tier | složitější, GROQ, vyšší learning curve |
| **TinaCMS** (3.12.1, Apache-2.0) | inline editace přímo na stránce | dobrý, git-based | git / cloud | vlastní nebo Tina Cloud | free tier | menší ekosystém |
| **Decap CMS** (3.15.1, MIT) | forms-based | základní | git | statické | zdarma | aktivní (19,3 k ★, vydání 7/2026); moderní nástupce je **Sveltia CMS** — viz [08-git-based-cms.md](08-git-based-cms.md) |
| **Headless WordPress** (nechat WP, nový Astro frontend) | Gutenberg, který redakce **už umí** | ok | WP media, už tam je | stávající hosting | 0 navíc | zůstává PHP údržba a bezpečnostní plocha |
| **Puck (custom)** | drag-and-drop | **žádný** | žádná | vlastní SSR | zdarma + váš čas | vše ostatní stavíte sami |

---

## 4. Doporučení

**Astro 7 + TypeScript** jako základ. **Ano.**

K obsahu doporučuji rozhodnout podle toho, co je pro ADK důležitější:

**Varianta A — nejmenší riziko pro redakci: Astro + Storyblok** (nebo Sanity)
Redakce dostane vizuální editor s bloky, hotovou knihovnu médií, verzování, náhledy a role. Vy definujete bloky, oni skládají. Provoz webu nestojí nic navíc na kódu. Nevýhoda: závislost na SaaS a nutnost ověřit podmínky pro neziskovky.

**Varianta B — plná kontrola, nulové provozní náklady: Astro + Keystatic**
Obsah v gitu, admin běží v samotném Astru na `/keystatic`, přihlášení přes GitHub. Zdarma napořád, žádný cizí server. Nevýhoda: editace je formulářová (vyplním pole → uvidím náhled), ne drag-and-drop na stránce; 1 377 médií v gitu je potřeba ošetřit (přesun na Cloudflare R2 / Cloudinary).

**Varianta C — nejplynulejší přechod: Astro + headless WordPress**
Redakce nezmění vůbec nic (píše dál v Gutenbergu), 357 článků se nemusí migrovat, změní se jen frontend. Řeší výkon, design i přístupnost, neřeší údržbu WordPressu. Dobré jako **mezikrok**, špatné jako cíl.

**Puck** bych zvažoval jen v jednom scénáři: pokud je tvrdý požadavek na drag-and-drop skládání marketingových landing pages a zároveň chcete zůstat 100 % open-source bez SaaS. I pak bych ho použil jen na **stránky**, a články/lidi/kluby/projekty držel v content collections + Keystaticu. Tedy Puck jako **doplněk, ne jako CMS**.

## 5. Zbývající technická rozhodnutí

| Téma | Doporučení |
|---|---|
| **Hosting** | Cloudflare Pages nebo Netlify (statické, zdarma, deploy z gitu). Pozor: současný hosting je od **VAS Hosting, který je uvedený mezi partnery** — pravděpodobně sponzorský. Ověřit, jestli tam jde nasadit statický build (jde, jen FTP upload) a jestli by sponzoring skončil odchodem. |
| **Formuláře** | WPForms zanikne. Náhrada: Formspree / Web3Forms / vlastní Cloudflare Worker + Turnstile proti spamu. |
| **Newsletter** | zjistit, jaká služba se používá (v HTML není vidět) a napojit přímo na její API. |
| **Akce z API** | fetch při buildu + **rebuild webhook** nebo naplánovaný rebuild 1×denně; fallback na klientský fetch pro deadline odpočty. |
| **Mapa klubů** | data jako kolekce `club` + MapLibre/Leaflet s OSM dlaždicemi (bez Google API klíče a bez placení). |
| **Cookie souhlas** | vlastní lehká lišta + GTM consent mode, nebo GA4 vyměnit za **Plausible/Umami** (bez cookies → lišta není potřeba a odpadne GDPR téma). |
| **Redirecty** | `_redirects` / `netlify.toml` s mapou starých URL. |
| **Design systém** | tokeny (barvy, typografie, spacing) v jednom místě, aby bloky nešlo stylovat ad hoc. |
