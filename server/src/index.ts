import { env } from "./config/env.js";
import { createServer } from "./app.js";

const bootstrap = async (): Promise<void> => {
  const app = await createServer();
  app.listen(env.port, env.host, () => {
    console.log(
      `[server] Adverta Tools backend listening on http://${env.host}:${env.port} | auth=${env.authMode} | subscriptions=${env.subscriptionMode}`
    );
  });
};

bootstrap().catch((error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
