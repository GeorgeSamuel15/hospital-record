# --- Build stage ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runtime stage --------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Deliberately NOT using --omit=dev here: the `prisma` CLI (a devDependency)
# is needed at container start to run `prisma migrate deploy` and
# `prisma db seed` (see docker-compose.yml's backend command). For a leaner
# production image, run migrations as a separate one-off step instead and
# switch this to --omit=dev.
COPY package.json package-lock.json* ./
RUN npm install

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
