import { env } from './env';
import { createApp } from './app';
import { registerEmailSubscribers } from './lib/email/subscribers';

// Wire lifecycle-event side-effects (transactional email) before serving.
registerEmailSubscribers();

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Siddhatva API listening on http://localhost:${env.port}`);
});
