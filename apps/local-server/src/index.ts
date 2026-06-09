import { createApp } from "./app.js";
import { listen } from "./server/listen.js";

const port = Number(process.env.SEMANTIC_AGENT_PORT ?? 4317);
listen(createApp(), port);
console.log(`Semantic Agent local server listening on http://127.0.0.1:${port}`);
