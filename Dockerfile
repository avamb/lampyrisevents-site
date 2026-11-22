# Static site image: build with Node, serve with nginx (the kit's nginx templates).
# Only the web target is used. Build args are PUBLIC values only.
#   docker build --target web -t lampyris-site .
FROM node:22-alpine AS deps
# The kit is a public GitHub dependency; the lock file names it with an ssh address, so git must read it over https.
RUN apk add --no-cache git \
    && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ARG SITE_URL=https://new.lampyrisevents.com
ARG SITE_INDEXING=false
ARG PUBLIC_ARENA_API=https://api.arenasoldout.com
ARG PUBLIC_FEED_TOKEN=
ARG PUBLIC_META_PIXEL_ID=
ARG PUBLIC_GA4_ID=
ARG PUBLIC_TURNSTILE_SITE_KEY=
ARG DATA_SOURCE=fixture
ENV SITE_URL=$SITE_URL SITE_INDEXING=$SITE_INDEXING PUBLIC_ARENA_API=$PUBLIC_ARENA_API \
    PUBLIC_FEED_TOKEN=$PUBLIC_FEED_TOKEN PUBLIC_META_PIXEL_ID=$PUBLIC_META_PIXEL_ID \
    PUBLIC_GA4_ID=$PUBLIC_GA4_ID PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY DATA_SOURCE=$DATA_SOURCE
# Snapshots, resized media (committed in public/_site/media, originals are fetched only when a file is missing) and fonts.
RUN npm run prepare:data && npm run build

FROM nginx:1.27-alpine AS web
ARG KIT=/app/node_modules/arena-site-kit
COPY --from=deps ${KIT}/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=deps ${KIT}/nginx/headers.conf ${KIT}/nginx/headers-personal.conf /etc/nginx/snippets/
COPY --from=deps ${KIT}/nginx/15-site-root.envsh ${KIT}/nginx/40-watch-release.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/15-site-root.envsh /docker-entrypoint.d/40-watch-release.sh
# dist holds .nginx/redirects.conf (301 and 410 rules from redirects.yaml), csp-hashes.conf and locations.conf, written by postbuild.
COPY --from=build /app/dist /usr/share/nginx/html
ARG SITE_INDEXING=false
ARG PUBLIC_ARENA_API=https://api.arenasoldout.com
ENV ARENA_API_ORIGIN=$PUBLIC_ARENA_API SITE_INDEXING=$SITE_INDEXING SITE_ROOT=/usr/share/nginx/html
EXPOSE 80
