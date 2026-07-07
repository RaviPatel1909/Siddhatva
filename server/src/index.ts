import { env } from './env';
import { createApp } from './app';
import { prisma } from './prisma';
import { registerEmailSubscribers } from './lib/email/subscribers';
import { installGracefulShutdown } from './lib/shutdown';

// Wire lifecycle-event side-effects (transactional email) before serving.
registerEmailSubscribers();

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Siddhatva API listening on port ${env.port}`);
});

// Drain in-flight requests + close Prisma on SIGTERM/SIGINT before exiting.
installGracefulShutdown(server, { disconnect: () => prisma.$disconnect() });
