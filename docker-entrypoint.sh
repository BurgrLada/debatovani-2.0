#!/bin/sh
# Start kontejneru: ověřit, že je z čeho odpovídat, a spustit Node proces.
#
# Dva SQLite soubory, dvě různé životnosti:
#
#   $DATA_DIR/auth.sqlite            účty a relace. Na persistentním volume —
#                                    kdyby se ztratil, redakce se odhlásí.
#                                    Schéma si při prvním přihlášení doplní
#                                    better-auth sám.
#   $INDEX_DIR/index-<větev>.sqlite  index obsahu. **Uvnitř kontejneru**,
#                                    protože je odvozený z gitu a vzniká při
#                                    buildu. Restart ho tím vrací do stavu
#                                    posledního nasazení; úpravy, které mezitím
#                                    redakce uložila, jsou v gitu a vrátí se
#                                    příštím buildem.
#
# Index schválně **není** na volume: Coolify při rolling update pouští nový
# kontejner vedle starého a oba by na týž soubor sáhly. Takhle má každý
# kontejner vlastní a překryv nikoho nezajímá.
set -e

: "${DATA_DIR:=/data}"
: "${INDEX_DIR:=/app/index}"
: "${GITHUB_BRANCH:=main}"

mkdir -p "$DATA_DIR"

INDEX="${INDEX_DIR}/index-${GITHUB_BRANCH}.sqlite"

if [ -f "$INDEX" ]; then
	echo "[start] Index: $INDEX ($(du -h "$INDEX" | cut -f1))"
else
	echo "[start] VAROVÁNÍ: chybí $INDEX — administrace nebude mít obsah."
	echo "[start] Buildil se image s jinou větví, než je GITHUB_BRANCH=$GITHUB_BRANCH?"
fi

exec node dist/server/entry.mjs
