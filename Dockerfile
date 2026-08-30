# Parameterized image for all three apps: --build-arg APP=storefront|pos|mgmt
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

ARG APP
# URL + anon key are public-safe by design (RLS is the gate); inlined at build.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1

COPY . .
# --ignore-scripts: skips the supabase-CLI/esbuild postinstalls (dev tooling
# not needed to build the apps)
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm build --filter @bach/${APP}

FROM node:22-alpine AS runner
WORKDIR /app
ARG APP
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_DIR=apps/${APP} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/apps/${APP}/.next/standalone ./
COPY --from=build /app/apps/${APP}/.next/static ./apps/${APP}/.next/static

USER node
EXPOSE 3000
CMD ["sh", "-c", "node ${APP_DIR}/server.js"]
