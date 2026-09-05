FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads && addgroup -S cams && adduser -S cams -G cams && chown -R cams:cams /app
USER cams
EXPOSE 4000
# Apply pending migrations before serving, so a fresh volume comes up ready.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
