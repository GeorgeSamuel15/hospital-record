import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Hospital RMS API listening on http://localhost:${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`   Environment: ${env.NODE_ENV}`);
});
