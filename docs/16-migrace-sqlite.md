# Migrace z MongoDB na SQLite

_Architektonická změna rozhodnutá v sekci 9 dokumentu [15-tinacms-vs-decap.md](15-tinacms-vs-decap.md). Stav k 2. 9. 2026. **Zapracováno** ve worktree `sqlite-migrace` (větev `worktree-sqlite-migrace`); co je ověřené, je v sekci 6._

**Cíl: k provozu webu stačí jediný Node proces.** Žádný databázový server, žádná druhá služba, kterou je potřeba nasadit, zálohovat a hlídat. Index TinaCMS i účty better-authu se přesunou do dvou souborů v jednom adresáři.

**Proč teď a ne po spuštění:** produkční MongoDB **nikdy nebyla nasazená** — [13-todo.md](13-todo.md) ji v bodě 2 teprve plánuje postavit. Nic se tedy nemigruje, žádná relace se neodhlásí a žádná data nejsou v sázce. Odložením by se databáze nejdřív postavila a pak zrušila.

## 1. Co se nemění

Tohle je výměna jedné vrstvy, ne přestavba. Beze změny zůstává:

- **obsah v gitu** — 452 souborů MDX/JSON, historie, rollback, přenositelnost;
- **TinaCMS včetně vizuální editace** — 83 volání `tinaField()`, `/tina-island`, `visualSelector`, schémata bloků;
- **přihlašování účtem Google Workspace** — better-auth, `hd` claim, allowlist v `src/lib/access.ts`, celý přístupový model z [14-autentizace.md](14-autentizace.md);
- **zápis obsahu přes GitHub API** — servisní token, `tinacms-gitprovider-github`;
- **statický web** — `output: 'static'`, 453 HTML souborů před Node procesem;
- **datová vrstva webu** — `src/lib/data.ts` čte dál přes `databaseClient`, jen se pod ním vymění adaptér.

Do žádného obsahového souboru se nesahá. Do žádné komponenty se nesahá.

## 2. Cílová architektura

```
        GitHub — obsah (452 souborů MDX/JSON), historie, rollback
             ▲                                   │
   commit přes API                       checkout při buildu
             │                                   ▼
┌────────────┴───────────────────┐   ┌───────────────────────────┐
│  jeden Node proces             │   │  CI (GitHub Actions)      │
│                                │   │  tinacms build → index    │
│  /admin          statický      │   │  astro build   → dist/    │
│  /api/tina/*     datalayer ─┐  │   └─────────────┬─────────────┘
│  /api/auth/*     better-auth┤  │                 │
│  /tina-island    vizuální   │  │                 ▼
│                  editace    │  │   ┌───────────────────────────┐
│                             ▼  │   │  nginx / CDN              │
│      $DATA_DIR/                │   │  453 statických HTML      │
│        ├── index.sqlite        │   │  + 356 přesměrování       │
│        └── auth.sqlite         │   └───────────────────────────┘
└────────────────────────────────┘   médiím: Cloudflare R2
```

| | Dnes | Po změně |
|---|---|---|
| Index obsahu | MongoDB (`mongodb-level` 0.0.4 + UMD workaround) | `index.sqlite` (`sqlite-level` 2.1.1) |
| Účty a relace | MongoDB (`@better-auth/mongo-adapter`), bez transakcí | `auth.sqlite` (`better-sqlite3` napřímo), **s transakcemi** |
| Obsah | git | git, beze změny |
| Služby k provozu | Node + MongoDB | **jen Node** |
| Zálohy | zálohovat databázi, nebo umět přeindexovat | `cp` dvou souborů; index je pořád odvozený z gitu |
| Proměnné prostředí | `MONGODB_URI`, `MONGODB_DB`, `MONGODB_TRANSACTIONS` | `DATA_DIR` |
| Build | potřebuje síťový přístup k databázi | **soběstačný** — index si postaví vedle sebe |

Poslední řádek stojí za zdůraznění: dnes musí CI runner dosáhnout na produkční MongoDB, aby build proběhl. Po změně je build uzavřený — checkout dovnitř, `dist/` a `index.sqlite` ven.

## 3. Co je ověřené

Ověřeno 2. 9. 2026 proti skutečným balíčkům, na Node 24.11.1:

| Tvrzení | Jak ověřeno |
|---|---|
| `sqlite-level@2.1.1` už je v `pnpm-lock.yaml` | táhne si ho `@tinacms/search`, které přichází s `@tinacms/cli` |
| `better-sqlite3@12.11.1` už je v `pnpm-lock.yaml` | better-auth 1.7.2 ho uvádí jako **volitelnou peer závislost** |
| `better-sqlite3` se nekompiluje | čistá instalace stáhla prebuilt, `build/Release/better_sqlite3.node` vzniklo za ~4 s |
| `SqliteLevel` čte a zapisuje | `new SqliteLevel({ filename: ':memory:' })`, `put`/`get` prošlo |
| Verze `abstract-level` sedí | `sqlite-level` → `abstract-level@1.0.4`; `@tinacms/graphql@2.4.10` chce `^1.0.4` |
| better-auth pozná instanci better-sqlite3 | `@better-auth/kysely-adapter`: větev `"aggregate" in db && !("createSession" in db)` → `SqliteDialect` a `transaction: true` |
| Schéma se vytvoří samo | `getMigrations()` je veřejný export `better-auth/db/migration`, idempotentní, introspektuje chybějící tabulky |
| API `SqliteLevel` | `new SqliteLevel({ filename, readOnly? })`, vystavuje `.db` (instance better-sqlite3) |

Neověřené položky z plánovací fáze (doba přeindexování, velikost souboru, shoda výstupu) jsou od zapracování změřené — **výsledky jsou v sekci 6**. Otevřený zůstává běh v Docker image a chování při souběžném čtení buildu a zápisu administrace.

## 4. Jediné skutečné rozhodnutí: odkud se bere produkční index

Dnes to řeší sdílená databáze — CI build zapíše index do téže MongoDB, ze které čte produkční Node proces. **Se souborem to takhle nejde**, protože CI runner na disk produkčního serveru nedosáhne. Rozdělení odpovědnosti je proto potřeba popsat výslovně.

Vlastnosti, se kterými se počítá: index je **odvozený z gitu** (ztráta = přeindexování, ne ztráta dat), zapisuje do něj **administrace při uložení** a zároveň **`tinacms build` při každém buildu**.

| Varianta | Jak | Pro | Proti |
|---|---|---|---|
| **A. Index jako deployový artefakt** (doporučeno) | CI ho postaví jako vedlejší produkt `tinacms build`, deploy ho zkopíruje na volume vedle `auth.sqlite` a restartuje proces | přesně reprodukuje dnešní sémantiku, nulové nové nástroje, `auth.sqlite` zůstává jediný skutečně perzistentní stav | soubor se přenáší při každém deployi (odhad jednotky MB, změřit) |
| **B. Index zapečený v image** | index vznikne při stavbě kontejneru, volume je jen pro `auth.sqlite` | index je poctivě build output, volume drží jen to, co se opravdu nesmí ztratit | restart bez redeploye vrátí index do stavu posledního buildu — administrace pak do dalšího buildu ukazuje starší obsah |
| **C. Přeindexování na serveru** | Node proces si stáhne checkout a přeindexuje na požádání | nezávislé na CI | server dnes checkout nemá, což je vědomé rozhodnutí; přibývá routa, oprávnění a další pohyblivá část |

**Rozhodnuto: A.** Závod, kdy redaktor uloží změnu během běžícího buildu a CI pak přepíše index verzí bez ní, existuje ve variantě A i dnes s MongoDB — je tedy stejný, ne nový, a sám se vyléčí dalším buildem (obsah je v gitu, ztrácí se jen jeho odraz v indexu na jednotky minut).

> **Past, na kterou se přišlo až při implementaci: samotný `.sqlite` soubor je po buildu neúplný.** `sqlite-level` jede v režimu WAL, takže vedle `index-<větev>.sqlite` zůstávají `-wal` a `-shm` a poslední zápisy leží jen ve WAL. Změřeno: hlavní soubor sám nesl **4 903 z 5 513 záznamů**. Zkopírovat ho a nasadit by znamenalo tiše neúplný index.
>
> Řeší to `scripts/index-checkpoint.mjs` — `PRAGMA wal_checkpoint(TRUNCATE)` složí WAL do hlavního souboru a vyprázdní ho. Skript se pouští **automaticky na konci `pnpm build`**, takže artefakt je vždy jeden úplný soubor (ověřeno: 5 513 záznamů i v holé kopii). Když se checkpoint nepovede, skript skončí nenulovým kódem a build spadne — mlčky nasadit půlku indexu nejde.

Varianta C je jediná, která ten závod řeší doopravdy, a je taky jediná, která přidává pohyblivé části. Pokud se ukáže, že vadí, je to samostatný krok — ne součást téhle migrace.

> Rozhodnutí ovlivňuje jen dokumentaci nasazení a případně jeden skript. **Kód je ve všech třech variantách stejný**, protože cesta k souboru přichází z prostředí. Migraci to tedy neblokuje.

## 5. Postup

### Krok 1 — závislosti

`package.json`:

| Odebrat | Přidat |
|---|---|
| `mongodb` | `better-sqlite3` (^12.11.1 — verze, na které se shodnou `sqlite-level` i better-auth) |
| `mongodb-level` | `sqlite-level` (^2.1.1) |
| `@better-auth/mongo-adapter` | `@types/better-sqlite3` (devDependency) |

`@types/better-sqlite3` je nutný: `sqlite-level` má v `.d.ts` `import Database from 'better-sqlite3'` a bez typů neprojde `pnpm check`. Balíček je na 9.6.0 proti runtime 12.11.1 — API, které používáme, se mezi nimi nezměnilo, ale je to místo, které si zaslouží komentář v kódu.

`pnpm-workspace.yaml` — **tohle je past, která migraci nejspolehlivěji rozbije:**

```yaml
allowBuilds:
  esbuild: true
  sharp: true
  better-sqlite3: true   # bez tohohle nevznikne nativní binding
```

Bez tohoto řádku pnpm instalační skript nespustí, `better_sqlite3.node` nevznikne a modul spadne až za běhu — v prostředí, kde se to nejhůř hledá.

_Ověřeno po zapracování: `pnpm install` doběhne za 8 s a binding vznikne v `node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/`._

### Krok 2 — `src/lib/db.ts` (nahradí `src/lib/mongo.ts`)

Jedno místo, které ví, kde data leží:

- `dataDir()` — z `DATA_DIR`, výchozí `.data` pro vývoj; adresář se vytvoří (`mkdirSync({ recursive: true })`), protože better-sqlite3 sám nadřazenou složku nezakládá;
- `indexPath()` — `<DATA_DIR>/index-<branch>.sqlite`; větev je v názvu souboru, protože `SqliteLevel` nemá obdobu `collectionName` z `MongodbLevel` a míchat větve v jednom souboru nechceme;
- `getAuthDb()` — líně otevřená instance `better-sqlite3` nad `<DATA_DIR>/auth.sqlite`; líně proto, že modul se načte i při statickém buildu;
- `ensureAuthSchema()` — memoizovaná `Promise`, uvnitř `getMigrations()` z `better-auth/db/migration`.

`src/lib/mongo.ts` se smaže celý.

### Krok 3 — `tina/database.ts`

Výměna adaptéru. Zmizí UMD workaround i přetypování, protože `sqlite-level` je čisté ESM:

```ts
import { SqliteLevel } from 'sqlite-level';
…
databaseAdapter: new SqliteLevel<string, Record<string, any>>({ filename: indexPath() }),
```

Komentář v hlavičce souboru popisuje MongoDB — přepsat na soubor, včetně věty o tom, že index je odvozený z gitu.

### Krok 4 — `src/lib/auth.ts`

`mongodbAdapter(db, { client, transaction })` → `database: getAuthDb()`. better-auth si dialekt složí sám a zapne transakce. Zmizí import `@better-auth/mongo-adapter` i `mongoTransactionsEnabled()`.

Doplnit `await ensureAuthSchema()` do obou asynchronních vstupů, kde se relace poprvé čte:

- `src/pages/api/auth/[...all].ts`,
- `isAuthorized` v `src/pages/api/tina/[...routes].ts`.

Memoizovaná promise znamená jeden běh za život procesu; každý další `await` je zadarmo. Alternativa „migrovat samostatným příkazem při deployi“ je krok, na který se dá zapomenout, a projeví se to až selháním přihlášení.

Pro jistotu i explicitní `pnpm auth:migrate` — hodí se při ladění nasazení.

Drobnost, na kterou se přijde až u typové kontroly: konfigurace se musí vytáhnout do funkce s **výslovným návratovým typem `BetterAuthOptions`** (potřebuje ji `betterAuth()` i `getMigrations()`). Bez anotace se odvodí z literálu a `betterAuth()` pak neuzná vlastní databázový adaptér.

### Krok 5 — checkpoint indexu

`scripts/index-checkpoint.mjs` složí WAL do hlavního souboru, aby se index dal nasadit jako jeden kus (viz past v sekci 4). Připojí se na konec `pnpm build`:

```json
"build": "tinacms build -c \"astro build\" && node scripts/index-checkpoint.mjs",
```

Když index neexistuje (lokální build ho nezakládá), skript mlčky skončí. Ručně jde spustit přes `pnpm index:checkpoint`.

### Krok 6 — prostředí

`.env.example`:

```diff
-MONGODB_URI=mongodb://localhost:27017
-MONGODB_DB=debatovani
-MONGODB_TRANSACTIONS=false
+# Adresář s daty. Vzniká, když neexistuje. V produkci musí být na
+# persistentním volume — jinak se po restartu ztratí přihlášení.
+#   index-<větev>.sqlite  index obsahu pro Tinu (odvozený z gitu)
+#   auth.sqlite           účty a relace
+DATA_DIR=/var/lib/debatovani
```

Do `.gitignore` přidat `.data/` (vývojový výchozí adresář).

Tři proměnné odcházejí, jedna přibývá. Důležitější než počet je ale to, co zmizí: **adresa síťové služby**. Zbylé proměnné popisují buď tenhle proces, nebo cizí API — žádnou další věc, která musí běžet.

### Krok 7 — dokumentace

Migrace se dotýká čtyř dokumentů a README. Nechat je mluvit o MongoDB by z nich udělalo past pro toho, kdo je bude číst za půl roku:

| Soubor | Co upravit |
|---|---|
| `README.md` | ř. 19 (popis `pnpm build`), ř. 62 („MongoDB drží jen index“) |
| `docs/13-todo.md` | bod 2 — vyškrtnout „postavit MongoDB a rozhodnout o zálohách indexu“, nahradit persistentním volume a ověřením přeindexování |
| `docs/14-autentizace.md` | sekce „MongoDB“ (ř. 63–92), diagram, ř. 128 |
| `docs/06-doporucena-architektura.md` | otevřená otázka 5 (ř. 163) |
| `docs/15-tinacms-vs-decap.md` | **hotovo** — revidováno spolu s tímhle plánem |

`docs/10-i18n-varianty.md` ř. 49 mluví o úložištích jiných CMS, ne o našem — nechat.

## 6. Ověření

Provedeno 2. 9. 2026 ve worktree `sqlite-migrace`, Node 24.11.1.

| # | Zkouška | Výsledek |
|---|---|---|
| 1 | `pnpm install` | doběhlo za 8 s, `better_sqlite3.node` vzniklo |
| 2 | `pnpm check` | **0 chyb** ve 113 souborech |
| 3 | `pnpm build:local` | 453 HTML, 1 m 59 s, `.data/` se ani nezaložil |
| 4 | `pnpm build` (self-hosted, SQLite) | 453 HTML, 1 m 59 s, `index-main.sqlite` **4,2 MB / 5 513 záznamů** |
| 5 | porovnání `dist/` z kroků 3 a 4 | **452 stránek obsahově shodných do bajtu** |
| 6 | přeindexování | smazané `.data/`, build znovu → týž počet záznamů i HTML |
| 7 | `pnpm auth:migrate` | vytvořilo `user`, `session`, `account`, `verification` + 1 index; **druhý běh nedělá nic** |
| 8 | `ensureAuthSchema()` přes běžící server | `auth.sqlite` vzniklo až prvním požadavkem na `/api/auth/*` |
| 9 | `/api/auth/get-session` bez relace | 200 (prázdná relace) |
| 10 | `/api/tina/gql` bez relace a s podvrženou cookie | **401 v obou případech** — shoda s [14-autentizace.md](14-autentizace.md) sekcí 5 |
| 11 | přenositelnost indexu | holá kopie `.sqlite` po checkpointu nese všech 5 513 záznamů |

**Ke kroku 5 dvě poznámky.** Rozdíly mezi oběma buildy jsou dvě a ani jedna nesouvisí s úložištěm: `build:local` běží v režimu, kde `import.meta.env.DEV` platí, takže Astro do obrázků přidává `data-image-component="true"` a Tailwind vypisuje CSS jinak seřazené. Po odečtení těchto dvou je **shoda úplná** — index tedy vrací přesně to, co je v souborech.

**Ke kroku 11:** ověřovalo se to teprve poté, co se ukázalo, že bez checkpointu je kopie neúplná (sekce 4). Zkouška „zkopírovat jen `.sqlite` a spočítat záznamy“ patří do nasazení natrvalo.

Neověřeno, protože to bez cizích přístupových údajů nejde:

- **přihlašovací tok se skutečným OAuth klientem** — ověřené je, že schéma vznikne a že se neautorizovaný požadavek odmítne; nezkoušelo se založení účtu Googlem ([13-todo.md](13-todo.md), bod 2);
- **zápis obsahu přes GitHub API** — potřebuje servisní token, stejně jako před migrací;
- **běh v cílovém Docker image** — prebuilt `better-sqlite3` existuje pro glibc; na Alpine (musl) není.

## 7. Rizika

| Riziko | Závažnost | Co s tím |
|---|---|---|
| **Nativní modul se nepostaví v Docker image** | vysoká | ověřit v cílovém image dřív než cokoli jiného; prebuilt existuje pro Node 24, ale glibc/musl rozhoduje — na Alpine prebuilt není a je potřeba toolchain nebo Debian base |
| **Zapomenutý `allowBuilds`** | vysoká | selže až za běhu; do ověření patří kontrola existence `.node` souboru, ne jen „instalace proběhla“ |
| **Nasazení indexu bez checkpointu** | vysoká | tichá ztráta dat: index se nasadí neúplný a nikdo si toho nevšimne, protože se prostě jen část obsahu v administraci neukáže. `pnpm build` checkpoint dělá sám; **do deployového skriptu ale patří kontrola, že se vedle `.sqlite` nekopíruje neprázdný `-wal`** |
| **Ephemerální kontejner** | střední | bez persistentního volume se po restartu ztratí přihlášení a index; volume je součástí nasazení, ne volitelný doplněk |
| **Jediný zapisovatel** | nízká | SQLite i LevelDB počítají s jedním procesem. U jedné administrace to omezení není, ale **vylučuje to škálování do víc instancí** — pokud by se k tomu někdy sáhlo, je to návrat k síťové databázi |
| **`@types/better-sqlite3` zaostává za runtime** | nízká | 9.6.0 proti 12.11.1; používané API se nezměnilo, ale patří to do komentáře |
| **CI potřebuje `GITHUB_*` proměnné i pro build, který nezapisuje** | nízká | `createDatabase` je vyžaduje, i když se git provider při indexaci nepoužije. Není to regrese oproti dnešku, ale je to zbytečné právo v CI — vyřešit se to dá build-only režimem, až se bude psát CI workflow. **Mimo rozsah téhle migrace.** |

## 8. Co je mimo rozsah

Aby se plán nerozrostl v přestavbu:

- **CI workflow a Dockerfile** — v repozitáři zatím nejsou (`.github/` a `Dockerfile` neexistují). Migrace pro ně připraví podmínky a popíše je, ale nepíše je.
- **Média na R2** — samostatná položka, s volbou úložiště indexu nesouvisí.
- **Autorství commitů** — samostatná položka z [15](15-tinacms-vs-decap.md), sekce 8, bod 2.
- **Cokoli kolem Sveltie a Decapu** — rozhodnuto zůstat u Tiny, tahle migrace to rozhodnutí nechává platit a jen mu ubírá provozní cenu.

## 9. Odhad a skutečnost

| Krok | Odhad | Skutečnost |
|---|---|---|
| 1–6 (kód a prostředí) | 2–3 h | odpovídá, plus `scripts/index-checkpoint.mjs`, se kterým plán nepočítal |
| 7 (dokumentace) | 1 h | odpovídá — dotčeno README a docs/06, 13, 14, 15 |
| Ověření mimo přihlášení | 1 h | odpovídá; dvakrát celý build (2× ~2 min) je většina toho času |
| Přihlašovací tok se skutečnými údaji | dle dostupnosti OAuth klienta | **zbývá** |

**Celkem zhruba půl dne, jak plán čekal.** Jediné překvapení bylo WAL: bez checkpointu by se nasadil neúplný index, a byla by to chyba, která se projeví tiše.

Proti tomu stojí odstraněná služba z provozu, dvě odstraněné položky vlastního lepidla ([15](15-tinacms-vs-decap.md), sekce 6), vyškrtnutá položka z předstartovního seznamu a build, který nepotřebuje síť.
