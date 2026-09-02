import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`[luxury-backend] escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
