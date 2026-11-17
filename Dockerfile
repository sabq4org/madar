FROM node:26-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
RUN npm install --global pnpm@11.25.0
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3100 4100
CMD ["node", "apps/api/dist/index.js"]
