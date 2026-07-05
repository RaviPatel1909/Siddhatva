import { env } from './env';
import { createApp } from './app';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Siddhatva API listening on http://localhost:${env.port}`);
});
