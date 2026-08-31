# Design tokeny odvozené ze stávajícího webu

_Brand manuál pro ADK neexistuje. Tento dokument je náhrada: paleta, typografie a rozměry vytažené měřením z dnešního webu a z loga, roztříděné na **značku** a **dědictví šablony**._

Zdroje (staženo 31. 8. 2026):

| Co | Odkud |
|---|---|
| Barvy loga | `wp-content/uploads/2020/08/logo_vector.png` (1700 × 785, PNG s alfou) — kvantizace pixelů |
| Globální paleta a typografie | `wp-content/uploads/elementor/css/post-9.css` — Elementor kit `.elementor-kit-9` |
| Základní typografie a rozměry | `wp-content/themes/alone/css/alone-main.css` |
| Reálně použité barvy | `post-2642.css`, `post-11457.css`, `post-11429.css` |

## 1. Klíčové zjištění: značka a šablona se rozešly

**Logo obsahuje přesně čtyři barvy.** Žádné přechody, žádné mezitóny:

| Barva | Podíl plochy loga |
|---|---|
| `#C8DA2B` limetka | 28,6 % |
| `#00B2EF` modrá | 27,8 % |
| `#F6862F` oranžová | 24,7 % |
| `#15191C` uhel | 19,0 % |

**Elementor kit má devět barev a s logem se míjí:**

| Token v kitu | Hodnota | Vztah k logu |
|---|---|---|
| `primary` | `#ECC198` meruňka | **v logu není** — pastelový derivát, dědictví šablony |
| `secondary` | `#BDE3F5` bledá modrá | vybledlá modrá z loga |
| `accent` | `#BDE3F5` | **duplikát `secondary`** — accent fakticky neexistuje |
| `text` | `#000000` | čistá černá (logo má `#15191C`) |
| `48641a3` | `#E8EB93` bledá žlutozelená | vybledlá limetka |
| `918f1c1` | `#D88230` oranžová | logo `#F6862F` ztlumené |
| `7b91446` | `#23A3DD` modrá | logo `#00B2EF` ztlumené |
| `016837b` | `#D1D626` limetka | logo `#C8DA2B` — jediná, která sedí |
| `b86dfb8` | `#FFFFFF` | — |

K tomu barva přechodu stránky `#FFBC7D` (meruňka) a v CSS stránek se objevují ještě `#002866` (tmavě modrá), `#FAF0E6`, `#F9FAE5`, `#AA5252` a `#020101`.

**Závěr:** značku tvoří **limetka, modrá, oranžová a uhel**. Meruňkovo-pastelová linie (`#ECC198`, `#BDE3F5`, `#FFBC7D`, `#FAF0E6`, `#E8EB93`) je z demo obsahu šablony `alone` a do nového webu se **nepřenáší**. Zároveň platí, že každá barva loga existuje v kitu ve druhé, ztlumené verzi — to je čistě důsledek ručního zadávání barev v Elementoru, ne záměr.

## 2. Problém přístupnosti, který se musí vyřešit hned

**Žádná ze tří barev loga není použitelná jako text na bílé.** Kontrasty proti `#FFFFFF`:

| Barva | Kontrast na bílé | Kontrast na uhlu `#15191C` |
|---|---|---|
| `#C8DA2B` limetka | **1,55 : 1** | 11,38 : 1 |
| `#00B2EF` modrá | **2,44 : 1** | 7,25 : 1 |
| `#F6862F` oranžová | **2,51 : 1** | 7,05 : 1 |

WCAG AA vyžaduje 4,5 : 1 pro běžný text a 3 : 1 pro velké nadpisy a prvky UI. Značkové barvy tedy fungují **jako plochy pozadí s tmavým textem**, ne jako barva textu, odkazů ani tlačítek s bílým popiskem.

Řešení je mít od každé barvy dvě odvozené varianty — ztmavenou pro text a světlý tint pro plochy. Následující hodnoty jsem odvodil snížením světlosti při zachování odstínu a sytosti, přesně na hranici AA a AAA:

| Základ | Text AA (4,5 : 1) | Text AAA (7 : 1) | Plocha (tint) | Plocha (soft) |
|---|---|---|---|---|
| oranžová `#F6862F` | `#C05808` | `#904306` | `#FDEEE2` | `#FBD7BB` |
| modrá `#00B2EF` | `#007FAB` | `#006082` | `#E2F6FD` | `#BBEBFB` |
| limetka `#C8DA2B` | `#727D16` | `#565D10` | `#F8FAE5` | `#EFF4C2` |

## 3. Navržená sada tokenů

```css
:root {
  /* --- značka (přímo z loga) --- */
  --color-brand-lime:   #C8DA2B;
  --color-brand-blue:   #00B2EF;
  --color-brand-orange: #F6862F;
  --color-brand-ink:    #15191C;

  /* --- textové varianty (WCAG AA na bílé) --- */
  --color-lime-text:    #727D16;
  --color-blue-text:    #007FAB;
  --color-orange-text:  #C05808;

  /* --- plochy --- */
  --color-lime-tint:    #F8FAE5;
  --color-lime-soft:    #EFF4C2;
  --color-blue-tint:    #E2F6FD;
  --color-blue-soft:    #BBEBFB;
  --color-orange-tint:  #FDEEE2;
  --color-orange-soft:  #FBD7BB;

  /* --- neutrály --- */
  --color-surface:      #FFFFFF;
  --color-surface-alt:  #F7F8F8;
  --color-text:         #15191C;   /* 17,7 : 1 — nahrazuje #333 i #000 */
  --color-text-muted:   #5A6166;
  --color-border:       #E3E6E7;

  /* --- role --- */
  --color-accent:       var(--color-brand-orange); /* CTA, ověřit s ADK */
  --color-link:         var(--color-blue-text);
}
```

**Poznámka k roli akcentu:** dnešní web žádnou primární akční barvu nemá — pět tlačítek na homepage si konkuruje (viz `04-otazky.md`, otázka 24). Tokeny na to nestačí, je to obsahové rozhodnutí. Návrh: **oranžová = akce, modrá = odkazy a informace, limetka = zvýraznění a dekorace.** Rozdělení rolí je potřeba potvrdit dřív, než se postaví blok tlačítka.

## 4. Typografie

Dnešní stav je nejednotný, protože téma a Elementor kit si odporují:

| Vrstva | Písmo | Kde |
|---|---|---|
| Téma `alone` | **Poppins** 16 px / 175 %, barva `#333333` | tělo stránky, články |
| Elementor kit `text` / `primary` | **Roboto** 400 / 600 | widgety |
| Elementor kit `secondary` | **Roboto Slab** 400 | **fakticky nepoužito** (1 výskyt v CSS, jen definice) |
| Elementor display styly | **Poppins** 32 / 70 / 15 px, `uppercase`, `letter-spacing: 4px` | nadpisy sekcí, hero |

Stránka přitom z Google Fonts natahuje **všechny tři rodiny × 18 řezů = 54 fontových variant**. To je jedna z položek za 2,5 MB assetů z `01-analyza-stavu.md`.

**Návrh: dvě rodiny, osm řezů.**

```css
:root {
  --font-display: 'Poppins', system-ui, sans-serif;  /* nadpisy, hero */
  --font-body:    'Roboto', system-ui, sans-serif;   /* běžný text */
}
```

Poppins zůstává, protože nese poznávací znak dnešního webu — verzálky s prostrkáním 4 px v nadpisech sekcí. Roboto zůstává pro delší text, kde je Poppins na 16 px / 175 % hůř čitelný. **Roboto Slab se vypouští** — nikde se nepoužívá. Řezy omezit na 400 / 500 / 600 / 700, subset `latin-ext`, `font-display: swap`, ideálně self-hosted (odpadne dotaz na Google a s ním jeden důvod pro cookie lištu).

Naměřená typografická škála (téma, `line-height` nadpisů 125 %):

| | dnes | ≤ 1024 px | ≤ 767 px |
|---|---|---|---|
| hero | 70 px / 700 / uppercase | 48 px | 42 px |
| nadpis sekce | 32 px / 400 / uppercase / ls 4 px | 24 px | 20 px |
| h1 | 42 px | | |
| h2 | 32 px | | |
| h3 | 24 px | | |
| h4 | 18 px | | |
| h5 | 14 px | | |
| h6 | 12 px | | |
| tělo | 16 px / 175 % | | |
| popisek | 15 px / uppercase / ls 4 px | 24 px | 20 px |

Nesrovnalost k vyřešení: h5 (14 px) a h6 (12 px) jsou **menší než tělo textu** (16 px). To je vada šablony, ne záměr — v nové škále nastavit h5 = 18 px a h6 = 16 px a rozlišit je vahou, ne velikostí.

## 5. Rozměry a mřížka

Z kitu a tématu:

```css
:root {
  --container-max: 1200px;   /* breakpointy: 1024px, 767px */
  --space-widget:  30px;     /* svislá mezera mezi widgety, dnes konstantní */
}
```

Dnešní web má **jedinou hodnotu vertikální mezery (30 px)** a jednu šířku kontejneru. Pro sadu ~12 bloků z `05-rekonstrukce-rozsah.md` to znamená, že pole „mezera: malá / střední / velká“ nemá oporu v dnešním stavu — buď se zavede nová škála (např. 16 / 32 / 64 / 96 px), nebo se drží jedna hodnota a blok si mezeru neurčuje vůbec. **Doporučuji druhé** — je to konzistentní s tím, že web nemá vzniknout znovu, ale být zrekonstruovaný.

## 6. Co ověřit s ADK

1. **Je `logo_vector.png` skutečně finální podoba loga a existuje ve vektoru?** Soubor se jmenuje „vector“, ale je to PNG 1700 × 785 z roku 2020. Pro nový web je potřeba SVG.
2. **Potvrdit, že pastelová linie odchází.** Meruňkovou `#ECC198` a bledou modrou `#BDE3F5` má dnes web na viditelných místech; jejich odstranění je znatelná vizuální změna, i když jde formálně o rekonstrukci 1:1.
3. **Přidělení rolí barvám** (sekce 3) — hlavně která barva znamená „akce“.
4. **Jestli má vzniknout tmavý režim.** Uhel `#15191C` a tinty jsou na něj připravené; pokud ne, není důvod tokeny zdvojovat.
