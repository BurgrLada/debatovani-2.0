# Web i administrace v jediném Node procesu. Databázový server projekt nemá —
# index TinaCMS i účty better-authu jsou SQLite soubory v `DATA_DIR`
# (docs/16-migrace-sqlite.md), takže tenhle kontejner je celé nasazení.
#
# Debian, ne Alpine: `better-sqlite3` má hotové prebuilty pro glibc. Na muslu
# by se musel kompilovat, což znamená python3 a build-essential v image.
FROM node:24-bookworm-slim AS build

# `sharp` a `better-sqlite3` si prebuilty stahují, takže toolchain není
# potřeba — jen certifikáty pro HTTPS.
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Nativní modul musí opravdu vzniknout. `pnpm-workspace.yaml` ho má
# v `allowBuilds`, ale když ten řádek někdo omylem smaže, spadlo by to až za
# běhu — proto se to kontroluje tady, kde je to vidět v logu buildu.
RUN test -f node_modules/better-sqlite3/build/Release/better_sqlite3.node \
	|| (echo "CHYBA: better-sqlite3 se nepostavil — zkontrolujte allowBuilds v pnpm-workspace.yaml" && exit 1)

COPY . .

# Build indexuje obsah z checkoutu do `index-<větev>.sqlite` a pak generuje
# statický web. Do gitu při tom nezapisuje, takže **servisní token tady být
# nemusí** — hodnoty jsou jen proto, že je `tina/database.ts` vyžaduje.
# Skutečný token dostane až běžící kontejner z proměnných prostředí.
ENV TINA_PUBLIC_IS_LOCAL=false \
	INDEX_DIR=/app/index \
	DATA_DIR=/app/build-data \
	GITHUB_OWNER=build \
	GITHUB_REPO=build \
	GITHUB_PERSONAL_ACCESS_TOKEN=build-only-nepouzije-se

ARG GITHUB_BRANCH=main
ARG SITE_URL=https://debatovani.cz
ENV GITHUB_BRANCH=$GITHUB_BRANCH \
	SITE_URL=$SITE_URL

RUN pnpm build

# Vývojové závislosti (tinacms, React, typy) v běžícím kontejneru nemají co
# dělat — administrace je předgenerovaná do `public/admin`.
RUN pnpm prune --prod


FROM node:24-bookworm-slim AS runtime

# Index leží **uvnitř kontejneru**, ne na volume: je to artefakt buildu,
# odvozený z gitu. Každý kontejner tak má vlastní kopii a rolling update
# (nový kontejner vedle starého) si nemá s čím kolidovat. Na volume zbývá
# jediný soubor, který se opravdu nesmí ztratit — `auth.sqlite`.
ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=4321 \
	INDEX_DIR=/app/index \
	DATA_DIR=/data

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/index ./index
COPY docker-entrypoint.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /data

VOLUME ["/data"]
EXPOSE 4321

# Statický web i administraci servíruje tentýž proces. Když je potřeba, aby
# web přežil pád administrace, patří před tohle nginx nebo CDN se statickým
# `dist/client` — viz docs/17, sekce „Co tahle podoba nasazení obětuje“.
#
# Pozor: přítomnost HEALTHCHECK je jedna z podmínek, za kterých Coolify dělá
# rolling update. Díky indexu uvnitř kontejneru to nevadí.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
