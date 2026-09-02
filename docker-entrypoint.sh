#!/bin/sh
# Start kontejneru: připravit `DATA_DIR` a spustit Node proces.
#
# `DATA_DIR` drží dva soubory a chovají se opačně:
#
#   auth.sqlite            účty a relace. **Nikdy se nepřepisuje** — kdyby se
#                          ztratil, redakce se odhlásí. Schéma si při prvním
#                          přihlášení doplní better-auth sám.
#   index-<větev>.sqlite   index obsahu. **Přepisuje se při každém startu**
#                          verzí z buildu, protože je odvozený z gitu a má
#                          odpovídat právě nasazenému kódu.
#
# Ten druhý řádek je vědomé rozhodnutí. Redaktorovo uložení mění index i git;
# restart tedy zahodí jen ty úpravy, které vznikly od posledního buildu — a ty
# jsou v gitu, takže se vrátí příštím nasazením. Opačná volba („zkopírovat jen
# když chybí“) by znamenala, že se index od repozitáře postupně rozejde
# a nikdo si toho nevšimne.
set -e

: "${DATA_DIR:=/data}"
: "${GITHUB_BRANCH:=main}"

mkdir -p "$DATA_DIR"

SEED="/app/seed/index-${GITHUB_BRANCH}.sqlite"
TARGET="${DATA_DIR}/index-${GITHUB_BRANCH}.sqlite"

if [ -f "$SEED" ]; then
	# WAL a SHM z minulého běhu musí pryč **před** výměnou hlavního souboru.
	# SQLite by starý žurnál přiložila k novému indexu a rozbila ho.
	rm -f "${TARGET}-wal" "${TARGET}-shm"
	cp "$SEED" "$TARGET"
	echo "[start] Index nasazen z buildu: $TARGET"
else
	echo "[start] VAROVÁNÍ: v image chybí $SEED — administrace nebude mít obsah."
	echo "[start] Buildil se image s jinou větví, než je GITHUB_BRANCH=$GITHUB_BRANCH?"
fi

exec node dist/server/entry.mjs
