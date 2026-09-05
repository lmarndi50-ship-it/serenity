import { createApp } from './app';
import { env } from './config/env';
import { disconnectPrisma, prisma } from './utils/prisma';

async function main() {
  // Fail loudly at boot rather than on the first request.
  await prisma.$queryRaw`SELECT 1`;

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CAMS API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start CAMS API:', err);
  await disconnectPrisma();
  process.exit(1);
});
