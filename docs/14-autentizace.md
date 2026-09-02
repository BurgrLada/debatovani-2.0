# Přihlašování do administrace

_Stav k 31. 8. 2026._

Do administrace se chodí **účtem Google Workspace na doméně `debatovani.cz`**.
Přihlašování obsluhuje [better-auth](https://www.better-auth.com), jediným
poskytovatelem je Google, hesla se nezakládají.

Tím se mění rozhodnutí z [06-doporucena-architektura.md](06-doporucena-architektura.md),
sekce 6, bod 4, kde bylo GitHub OAuth. Důvod: organizace má pracovní účty
u Googlu tak jako tak, odchod člověka z organizace mu přístup odebere sám
a redakce nemusí zakládat účty na GitHubu.

**Cena té změny:** Tina nemá GitHub token přihlášeného člověka, takže obsah
commituje jeden servisní účet. V historii repozitáře proto **nejsou vidět
jednotliví redaktoři** — kdo změnu udělal, se dá dohledat jen v logu
přihlášení.

## 1. Tři vrstvy, které rozhodují o přístupu

Každá stojí sama o sobě; kdyby některá selhala, drží zbylé dvě.

1. **Consent screen typu Internal** v Google Cloudu. Google sám nepustí dál
   účet mimo organizaci a aplikace nepotřebuje jeho verifikaci.
2. **Kontrola domény** (`hd` v `src/lib/auth.ts`). Better-auth pošle doménu
   Googlu jako `hd` a zároveň ji ověří proti claimu `hd` ve vráceném ID
   tokenu. Není to jen nápověda v adrese — přihlášení bez odpovídajícího
   claimu se odmítne na serveru.
3. **Allowlist** (`AUTH_ALLOWED_EMAILS`, vyhodnocuje `src/lib/access.ts`).
   Mít pracovní e-mail neznamená spravovat web.

Allowlist se kontroluje **dvakrát**: při zakládání účtu, aby cizí účet vůbec
nevznikl, a při každém požadavku na Tina API, aby odebrání ze seznamu odřízlo
i účet, který už má rozběhnutou relaci. Bez druhé kontroly by odebrání
zabralo až vypršením relace.

**Prázdný `AUTH_ALLOWED_EMAILS` nepouští nikoho.** Opak („prázdné = všichni
z domény“) by z překlepu v konfiguraci udělal otevřené dveře.

## 2. Správa lidí

Vlastní rozhraní pro správu přístupů **není a je to záměr** — kdo edituje
web, nemá tím měnit, kdo se do něj dostane. Přidání člověka je úprava
`AUTH_ALLOWED_EMAILS` a restart Node procesu.

Až by to začalo vadit, dá se doplnit role v databázi a stránka pro správu;
nic z toho, co je hotové, se kvůli tomu nepřepisuje.

## 3. Co je potřeba nastavit

### Google Cloud

1. Nový projekt, v něm **OAuth consent screen** typu **Internal**.
2. **OAuth client ID** typu *Web application*.
3. Návratové adresy:
   - `https://debatovani.cz/api/auth/callback/google`
   - `http://localhost:4321/api/auth/callback/google` (pro vývoj)

### Proměnné prostředí

Vzor je v [.env.example](../.env.example). Kromě přihlašovacích údajů
Googlu je potřeba `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
`DATA_DIR` (adresář se SQLite soubory) a token pro zápis do gitu.

**Serverový kód čte `process.env`, ne `import.meta.env`** — druhé jmenované
se při buildu nahrazuje staticky a přihlašovací údaje by skončily zapečené
v sestaveném souboru. V produkci proměnné dodá systemd nebo kontejner, při
vývoji je z `.env` načte `src/lib/env.ts`.

### Úložiště

Databázový server projekt nemá — k provozu stačí tenhle jediný Node proces.
Obojí, co si administrace pamatuje, leží v `DATA_DIR` jako SQLite soubor
(`src/lib/db.ts`):

| Soubor | Co drží | Když se ztratí |
|---|---|---|
| `index-<větev>.sqlite` | index obsahu pro Tinu (`sqlite-level`) | přeindexuje se z gitu při dalším buildu |
| `auth.sqlite` | účty a relace better-authu | redakce se odhlásí, účty vzniknou znovu |

Obsah v žádném z nich není — ten zůstává v gitu.

Postgres, se kterým počítala [06-doporucena-architektura.md](06-doporucena-architektura.md),
použít nejde: Tina bere jako index libovolnou implementaci `abstract-level`
a Postgres mezi nimi není. MongoDB, se kterou počítala první verze téhle
kapitoly, použít jde — ale je to databázový server navíc, takže ji nahradil
soubor. Rozbor je v [15-tinacms-vs-decap.md](15-tinacms-vs-decap.md) sekci 9,
postup v [16-migrace-sqlite.md](16-migrace-sqlite.md).

Schéma pro účty si better-auth vytvoří sám při prvním požadavku na
přihlášení (`ensureAuthSchema()` v `src/lib/auth.ts`); ručně jde totéž
spustit přes `pnpm auth:migrate`. Transakce se narozdíl od samostatně
běžící MongoDB zapínat nemusí — better-auth je nad SQLite zapne sám.

**V produkci musí `DATA_DIR` ležet na persistentním volume.** Na
ephemerálním kontejneru by přihlášení nepřežilo restart.

## 4. Jak to do sebe zapadá

```
prohlížeč                       Node proces                     vně
─────────                       ───────────                     ────
/admin  ──────────────────────► /api/auth/*  ─────────────────► accounts.google.com
(statická SPA, veřejná)         better-auth                     (ověří účet a doménu)
                                     │
                                     ▼
                             auth.sqlite ◄─── relace, účty
                                     
                       index-<větev>.sqlite ◄─── index obsahu
                                     ▲
                                     │
/admin ── dotazy na obsah ────► /api/tina/*  ─────────────────► GitHub API
                                TinaNodeBackend                 (zápis obsahu)
                                (ověří relaci a allowlist)
```

Statický web stojí mimo tenhle obrázek: vygeneruje se při buildu a servíruje
se z cache. Když Node proces spadne, web běží dál a nedostupná je jen
administrace.

### Dvě věci, které jsou proti obvyklému návodu jinak

**Obsah se na serveru čte přímo z databáze** (`src/lib/data.ts`), ne přes
HTTP. Vygenerovaný klient Tiny míří na `/api/tina/gql`, což dává smysl
v prohlížeči, ale ne na serveru: při statickém buildu i při vykreslování
oblastí pro vizuální editaci běží kód v Node, kde relativní adresa není
platná URL — a i kdyby byla, znamenala by, že si server volá sám sebe kvůli
datům, která má vedle sebe.

**Backend Tiny se překládá z Node API na Astro.** Tina dodává handler psaný
pro `IncomingMessage`/`ServerResponse`; překlad je v
`src/pages/api/tina/[...routes].ts`. Handler je nenáročný, takže stačí tenký
obal místo skutečného Node serveru vedle Astra.

## 5. Co je ověřené a co ne

Ověřené proti skutečnému OAuth klientovi (1. 9. 2026):

- **Přihlášení projde celé** — od `/admin` přes Google až po funkční
  administraci. Účet vznikl v databázi s `emailVerified: true`, napojený na
  `providerId: "google"`. _Ověřeno ještě proti MongoDB; po přechodu na SQLite
  se to musí zopakovat se skutečným OAuth klientem._
- Tina API **bez relace i s podvrženou cookie vrací 401**. _Přeověřeno nad
  SQLite 2. 9. 2026 proti sestavenému serveru._
- Allowlist odmítá všechny zkoušené varianty cizích adres, včetně adresy,
  kde je povolená doména jen předponou (`…@debatovani.cz.zly.cz`).
- Self-hosted build proběhne celý: obsah se naindexuje do `index-main.sqlite`
  a statický web se vygeneruje. _Přeověřeno 2. 9. 2026: 453 HTML souborů,
  obsahově shodných s buildem ze souborů._
- **Schéma `auth.sqlite` vzniká samo** při prvním požadavku na `/api/auth/*`
  a `getMigrations()` je idempotentní — druhý běh nedělá nic.

Zatím neověřené:

- **Zápis obsahu přes GitHub API.** Otestováno bylo čtení a indexace, ne
  commit — ten potřebuje skutečný servisní token.
- **Lokální režim po téhle změně.** `pnpm dev` teď posílá administraci na
  `/api/tina/gql` i při vývoji, aby se lokálně jezdilo po stejné cestě jako
  v produkci. Vyžaduje to běžící `astro dev` vedle `tinacms dev` — což
  `pnpm dev` dělá, ale stojí za to to při prvním spuštění projít.
- **Provoz na doméně.** Zkoušelo se na `localhost`; na ostrém originu bude
  cookie `Secure` a `BETTER_AUTH_URL` musí sedět s adresou, přes kterou se
  k webu přistupuje, jinak Google odmítne návrat.
