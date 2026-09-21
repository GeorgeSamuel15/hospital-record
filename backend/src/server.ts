import app from './app';
import { env } from './config/env';

app.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Hospital RMS API listening on http://0.0.0.0:${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`   Environment: ${env.NODE_ENV}`);
});
