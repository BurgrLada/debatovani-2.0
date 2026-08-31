# Git-based CMS: Decap, Sveltia a spol.

_Doplněk k `06` a `07`. Obsahuje opravu dřívějšího tvrzení o Decapu._

> **Stav k 31. 8. 2026:** Node server s databází je k dispozici, takže hlavní argument této varianty — „bez serveru“ — už není rozhodující. Volba padla na TinaCMS self-hosted (viz [06-doporucena-architektura.md](06-doporucena-architektura.md)). Dokument zůstává jako podklad pro případ, že by se od Tiny ustupovalo.

## Oprava

V `03-technologie.md` jsem Decap CMS odbyl jako „projekt dlouhodobě málo aktivní“. **To neplatí.** Decap má 19,3 k hvězd, 4 572 commitů a poslední vydání `decap-cms-app` 3.15.1 z **24. 7. 2026**. Stagnace, kterou si projekt vysloužil po přejmenování z Netlify CMS v letech 2023–2024, už neodpovídá dnešnímu stavu.

Zajímavější je ale to, co jsem přehlédl úplně: **Sveltia CMS**.

## Kandidáti (stav k 27. 8. 2026)

| | **Sveltia CMS** | **Decap CMS** | **Pages CMS** | **Keystatic** |
|---|---|---|---|---|
| Verze / licence | 0.201.1, MIT | 3.15.1, MIT | – , MIT | 0.6.9, MIT |
| Poslední vydání | **27. 8. 2026** (dnes) | 24. 7. 2026 | aktivní | 26. 8. 2026 |
| Komunita | 2,8 k ★, 4 934 commitů | **19,3 k ★** | menší | Thinkmill |
| Git backendy | **GitHub, GitLab, Gitea/Forgejo, lokální repo** | GitHub, GitLab, Bitbucket, Azure, **Gitea/Forgejo**, Git Gateway | **jen GitHub** | GitHub, lokální |
| Vlastní server nutný | **ne** (statická SPA) | **ne** (statická SPA) | ano — Postgres + GitHub App | ne |
| Média | plná knihovna, **externí úložiště**, vestavěná optimalizace do WebP | základní, v repu | S3 / Cloudflare R2 | v repu / cloud |
| i18n | prvotřídní | ano | ano | ano |
| Náhled | ano (preview pane) | ano (vlastní preview šablony v Reactu) | ano | omezený |
| Vztah k Astru | framework-agnostic, funguje | framework-agnostic, funguje | podporuje Astro | Astro-first |
| Zralost | 0.x, ale 644 vydání a 480 webů v showcase | stabilní 3.x | mladší | 0.x |

Sveltia je **kompletní moderní přepis Netlify/Decap CMS** — kompatibilní s jejich `config.yml`, takže migrace mezi nimi je levná. Uvádí, že vyřešila 320 issues z Decap repozitáře, a v showcase má 480 webů, z toho 150 migrovaných z Decapu a **70 z WordPressu**.

## Proč je to pro ADK zajímavější, než se zdálo

**1. Odpadá potřeba Node runtime.** Decap i Sveltia jsou **statické JavaScriptové aplikace** — nasadí se jako `/admin` na tentýž statický hosting jako web. Žádný Node runtime, žádný Postgres, žádný Docker. Proti TinaCMS self-hosted (Node + databáze + git provider) nebo Puck + Directus (Docker + Postgres) je to úplně jiná provozní liga.

Jediná serverová část je **malý OAuth proxy** pro přihlášení — typicky Cloudflare Worker nebo pár řádků serverless kódu, existují hotové šablony.

**2. Skutečně self-hosted, když se chce.** Git-based CMS potřebuje git hosting — a GitHub je taky SaaS. Ale Sveltia i Decap podporují **Gitea/Forgejo**, takže při plné self-hostovanosti běží na vašem serveru Forgejo (jeden binárek, výrazně lehčí než Node + Postgres) a CMS se připojí k němu.

**3. Verzování zdarma.** Každá editace je commit. Historie, rollback, „kdo co změnil“ — bez jediného řádku kódu navíc. To je přesně to, co byste u Pucku musel dostavovat.

**4. Média.** Sveltia má knihovnu s podporou externího úložiště a **vestavěnou optimalizaci do WebP** — tedy řeší i tu bolest s 1 377 soubory a 295kB obrázky, aniž byste musel obcházet `astro:assets`.

## Kde to naráží na váš požadavek

Buďme přesní: **git-based CMS nedají to, co jste chtěl v minulé zprávě.** Žádné drag-and-drop plátno, žádné sloupce myší, žádné CSS pole. Editace je formulářová — vyplníte pole, vedle vidíte náhled. Bloky lze skládat a přeřazovat (widget typu `list` s vnořenými objekty), ale je to seznam v panelu, ne stavba na stránce.

Takže:

| Chcete | Volba |
|---|---|
| Elementor-like plátno se sloupci a styly | Puck (+ Directus nebo git), nebo Webstudio |
| Spolehlivé publikování obsahu bez serveru | **Sveltia CMS** |

## Kombinace, která dává smysl

Tady je varianta, která mě napadla až díky tomuhle průzkumu a která je provozně nejlevnější ze všech dosud probraných:

> **Astro + Sveltia CMS (články, lidé, kluby, dokumenty) + Puck se zápisem do gitu (stránky)**

Klíč je v tom, že **Puck nemusí mít databázi.** Uloží JSON — a ten JSON může být commitnutý do gitu přes stejné API, které používá Sveltia. Pak celý stack vypadá takhle:

| Vrstva | Nástroj | Server? |
|---|---|---|
| web | Astro 7, statický build | ne |
| články, lidé, kluby, dokumenty | Sveltia CMS na `/admin` | ne |
| stavba stránek | Puck na `/admin/pages`, JSON commituje do gitu | ne (klientská app) |
| přihlášení | OAuth proxy | mikroslužba |
| git | Forgejo (self-hosted) nebo GitHub | jeden binárek / SaaS |
| média | git nebo S3-kompatibilní úložiště (MinIO) | volitelně |
| akce | `debata21` API | beze změny |

Proti variantě „Puck + Directus“ tím ušetříte Postgres, Docker a celou správu Directusu. Proti „TinaCMS self-hosted“ ušetříte Node runtime i databázi. Cena: obsah je v gitu (u 1 377 médií chce externí úložiště) a Puck si zápis do gitu musíte napsat sám — je to ale řádově jedna funkce, ne CMS.

## Co ověřit

1. **Jestli Sveltia zvládne vaše kolekce** — hlavně vnořené bloky pro stránky a i18n pro dvojjazyčný obsah.
2. **Zda je 0.x verze riziko.** Sveltia má 644 vydání a stovky produkčních webů, ale formálně je pre-1.0. Pojistka je zpětná kompatibilita s Decap configem — když by projekt uvadl, přepnete na Decap bez přepisu obsahu.
3. **Jestli redakce ADK skousne formulářovou editaci.** Tohle rozhodne o všem — a zjistíte to za jedno odpoledne tím, že jim ukážete Sveltiu a Puck vedle sebe na téže stránce.
4. **Kam s médii.** 1 377 souborů v git repozitáři je hraniční; MinIO nebo R2 je čistší.
