import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import server from "./dist/server/server.js";

const app = new Hono();

app.use("/assets/*", serveStatic({ root: "./dist/client" }));

app.use("*", (c) => server.fetch(c.req.raw));

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 }, (info) => {
	console.log(`Platform running on http://localhost:${info.port}`);
});
