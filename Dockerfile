FROM node:20-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS dev
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3000 6006

CMD ["pnpm", "dev"]
