# Nasazení na Coolify

_Postup pro nasazení aktuálního stavu projektu. Stav k 2. 9. 2026. Navazuje na [16-migrace-sqlite.md](16-migrace-sqlite.md), která z provozu odstranila databázový server._

**Co se nasazuje: jeden kontejner.** Žádná databáze, žádný cache server, žádná druhá služba. Uvnitř běží jeden Node proces, který obsluhuje statický web, administraci i API. Jediné, co musí přežít restart, je jeden adresář na disku.

Všechno níž je ověřené — image se postavil, kontejner naběhl a prošly zkoušky ze sekce 6.

## 1. Co si připravit předem

| | Kde to vzít |
|---|---|
| **OAuth klient Google** | Google Cloud Console, consent screen **Internal** ([14-autentizace.md](14-autentizace.md), sekce 3) |
| **Servisní GitHub token** | fine-grained, jen repozitář `BurgrLada/debatovani-2.0`, oprávnění **Contents: Read and write** |
| **`BETTER_AUTH_SECRET`** | `openssl rand -base64 32` — **jiný než vývojový** |
| **DNS** | `debatovani.cz` na IP serveru Coolify (dnes `178.104.123.245`) |

Vzor všech proměnných je v [.env.example](../.env.example).

## 2. Co je v repozitáři nachystané

- **`Dockerfile`** — dvoufázový build. První fáze nainstaluje závislosti, naindexuje obsah a vygeneruje statický web; druhá si z ní vezme jen výsledek.
- **`docker-entrypoint.sh`** — připraví `DATA_DIR` a spustí proces.
- **`.dockerignore`** — do image nejde `node_modules`, `dist`, `.data` ani `.env`.

Základ je `node:24-bookworm-slim`, ne Alpine: `better-sqlite3` má hotové prebuilty pro glibc, kdežto na muslu by se musel kompilovat a v image by skončil celý toolchain.

## 3. Vytvoření aplikace v Coolify

1. **New Resource → Application → Private Repository (with GitHub App)**, stejně jako u ostatních projektů na téhle instanci.
2. Repozitář **`BurgrLada/debatovani-2.0`**, větev **`main`**.
3. **Build Pack: `Dockerfile`.** Ne Nixpacks — ten by nativní modul a `allowBuilds` musel uhodnout.
4. **Ports Exposes: `4321`.**
5. **Domains:** `https://debatovani.cz`. Certifikát vyřídí Coolify sám.

## 4. Proměnné prostředí

Coolify u každé proměnné nabízí přepínač **Build Variable?**. Rozlišení není kosmetické — proměnná bez něj se do fáze buildu vůbec nedostane.

**S přepínačem „Build Variable" (potřebné při buildu i za běhu):**

| Proměnná | Hodnota | Proč při buildu |
|---|---|---|
| `SITE_URL` | `https://debatovani.cz` | zapéká se do kanonických odkazů, sitemapy a RSS ve statickém HTML |
| `GITHUB_BRANCH` | `main` | určuje název souboru s indexem (`index-main.sqlite`) |

**Jen za běhu:**

| Proměnná | Hodnota |
|---|---|
| `DATA_DIR` | `/data` |
| `TINA_PUBLIC_IS_LOCAL` | `false` |
| `BETTER_AUTH_URL` | `https://debatovani.cz` |
| `BETTER_AUTH_SECRET` | vygenerovaný klíč |
| `GOOGLE_CLIENT_ID` | z Google Cloudu |
| `GOOGLE_CLIENT_SECRET` | z Google Cloudu |
| `AUTH_ALLOWED_DOMAIN` | `debatovani.cz` |
| `AUTH_ALLOWED_EMAILS` | adresy redakce oddělené čárkou |
| `GITHUB_OWNER` | `BurgrLada` |
| `GITHUB_REPO` | `debatovani-2.0` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | servisní token |

> **`AUTH_ALLOWED_EMAILS` nesmí zůstat prázdné.** Prázdný seznam nepouští **nikoho** — je to schválně, aby z překlepu v konfiguraci nevznikly otevřené dveře ([`src/lib/access.ts`](../src/lib/access.ts)). Přidání člověka je změna proměnné a restart.

> **Servisní token při buildu nepotřebujete a nemá tam být.** `Dockerfile` si pro fázi buildu dosadí zástupné hodnoty: indexace obsahu do gitu nezapisuje, takže token je potřeba teprve v běžícím kontejneru.

## 5. Persistentní úložiště — bez tohohle to nemá smysl

**Storages → Add → Volume Mount**, cesta v kontejneru **`/data`**.

**Na volume patří jediný soubor: `auth.sqlite`** — účty a relace. Je to jediná věc v celém nasazení, která není odvozená z něčeho jiného. Bez volume by po každém restartu odešlo přihlášení celé redakce.

Index (`index-<větev>.sqlite`) je naopak **uvnitř kontejneru**, v `/app/index`, protože je to artefakt buildu: vzniká z gitu při `tinacms build` a jeho ztráta znamená přeindexování, ne ztrátu dat. Restart ho tím vrací do stavu posledního nasazení — úpravy, které redakce mezitím uložila, jsou v gitu a vrátí se příštím buildem.

Že index **není** na volume, je zároveň hlavní pojistka proti rolling update — viz sekce 6.

## 6. Rolling update

Coolify umí při nasazení spustit nový kontejner vedle starého a starý zastavit, teprve až je nový zdravý. Dělá to za čtyř podmínek: nastavený a procházející health check, výchozí pojmenování kontejnerů, ne Docker Compose, žádné mapování portu na hostitele.

**Podstatný je ten překryv:** krátce běží dva procesy a oba mají připojený týž volume. Kdyby na něm ležel index, nový kontejner by staršímu přepsal soubor pod rukama i s jeho žurnálem. To už není `SQLITE_BUSY`, to je poškození.

**Řeší to umístění indexu, ne vypnutý přepínač.** Když má každý kontejner index u sebe (`INDEX_DIR=/app/index`), překryv nikoho nezajímá: sdílený zůstane jen `auth.sqlite`, a souběžný přístup dvou procesů k jednomu SQLite souboru na lokálním disku je přesně to, na co je SQLite v režimu WAL stavěná.

Spoléhat místo toho na vypnutý health check by bylo křehké — `HEALTHCHECK` je součástí Dockerfilu a Coolify si ho najde sám (`custom_healthcheck_found`), takže by se rolling update mohl zapnout, aniž by kdokoli cokoli přepnul.

Zbývá jediná výhrada: na úplně prázdném volume by dva souběžně startující kontejnery mohly kolidovat při zakládání tabulek better-authu. Je to jednorázový stav při vůbec prvním nasazení a stačí ho projít jedním kontejnerem.

## 7. Nasazení a první přihlášení

1. **Deploy.** První build trvá déle (instalace závislostí, indexace 452 dokumentů, generování 453 stránek).
2. V logu musí být `[start] Index: /app/index/index-main.sqlite (…)`. Když místo toho svítí varování o chybějícím indexu, nesedí `GITHUB_BRANCH` s větví, ze které se stavělo.
3. **Do Google Cloudu doplnit návratovou adresu** `https://debatovani.cz/api/auth/callback/google`. Bez ní Google přihlášení odmítne.
4. Otevřít `/admin` a přihlásit se. V logu proletí `[auth] Doplňuji schéma: 4 tabulek…` — to je jednorázové vytvoření tabulek v `auth.sqlite`.
5. Zkusit uložení stránky. V repozitáři má vzniknout commit se zprávou `obsah: úprava …` a podpisem `Upravil: …`.

## 8. Co ověřit po nasazení

Ověřeno lokálně proti stejnému image; na produkci by mělo vyjít totéž:

| Zkouška | Očekávané |
|---|---|
| `GET /` | 200 |
| `GET /aktuality/` | 200 |
| `GET /admin/` | 200 (statický soubor, veřejný) |
| `GET /media/brand/logo.png` | 200 |
| `POST /api/tina/gql` bez relace | **401** |
| `GET /api/media/list` bez relace | **401** |
| `GET /2026/08/21/nabor-do-ntc-pro-sezonu-2026-27/` | **301** na `/aktuality/…` |
| restart kontejneru | `auth.sqlite` zůstane, index se obnoví, web běží |

Poslední řádek stojí za skutečné vyzkoušení, ne jen odškrtnutí — je to jediná zkouška, která ověří, že volume je opravdu připojený.

## 9. Co tahle podoba nasazení obětuje

Musí to zaznít, protože to jde proti [06-doporucena-architektura.md](06-doporucena-architektura.md), sekci 2.

Návrh počítá s tím, že **statický web běží dál, i když administrace spadne** — statické HTML má servírovat nginx nebo CDN a Node proces má obsluhovat jen `/admin` a `/api/*`. V téhle podobě servíruje **všechno tentýž proces**, takže jeho pád shodí i web.

Je to vědomá volba pro start: jedna služba, jedna konfigurace, žádná duplicita statických souborů. Kdyby to začalo vadit, rozdělení je přímočaré — přidat druhý zdroj (nginx nebo Coolify static site) nad `dist/client` a na Node proces poslat jen `/admin`, `/api/*` a `/tina-island`. Obsah `dist/client` je k tomu připravený; není potřeba měnit kód.

**Kdy po tom sáhnout:** až bude web dost navštěvovaný na to, aby výpadek administrace znamenal výpadek webu, nebo až se před web postaví CDN.

## 10. Automatické nasazení po uložení obsahu

Coolify umí nasazovat při každém pushi. **Rozmyslete si, jestli to chcete zapnout hned.**

Redakční smyčka je: uložení → commit → build → nasazení. S automatickým nasazením to znamená, že **každé uložení stránky spustí kompletní rebuild image** — instalace závislostí, indexace, generování 453 stránek. A u médií je to horší: každý nahraný soubor je vlastní commit, takže deset obrázků za sebou je deset nasazení.

Tři možnosti, seřazené podle toho, jak brzy stojí za zvážení:

1. **Nechat automatické nasazení vypnuté** a nasazovat ručně nebo naplánovaně (Coolify umí scheduled task). Redakce vidí své změny v administraci hned, veřejný web se aktualizuje v dávkách.
2. **Zapnout ho a chvíli sledovat**, jestli objem editace vůbec dělá problém. U redakce „pár technicky zdatných lidí" to nemusí vadit.
3. **Dávkovat nahrávání médií** přes Git Trees API, aby víc souborů byl jeden commit. Není napsané, protože zatím není jasné, že to je potřeba — je to otevřený bod v [13-todo.md](13-todo.md), sekce 3.

## 11. Velikost image

**1,13 GB.** Většinu z toho tvoří médiá: 291 MB v `public/media` a jejich kopie ve vygenerovaném `dist/client`. Je to přímý důsledek rozhodnutí nechat média v gitu ([06](06-doporucena-architektura.md), otázka 2) — u externího úložiště by image spadl řádově na desetinu.

Není to problém k řešení teď, ale je to číslo, které poroste s každým nahraným souborem, a je to nejsilnější praktický argument, který by jednou mohl vést k R2.

## 12. Zálohy

Zálohovat je potřeba **jediný soubor: `auth.sqlite`**. Všechno ostatní je odvozené:

- obsah a média jsou v gitu na GitHubu,
- index se postaví z gitu při každém buildu,
- statický web se vygeneruje z obsahu.

A i ten jeden soubor je vlastně jen pohodlí — když se ztratí, redakce se prostě přihlásí znovu a účty vzniknou nanovo z Google účtů. Doslova nenahraditelného v tomhle nasazení není nic.

To je vedlejší produkt rozhodnutí z [16](16-migrace-sqlite.md) a stojí za to si toho všimnout: projekt nemá zálohovací povinnost, protože nemá stav, který by šel ztratit.
