import { serve } from "@hono/node-server";
import server from "./dist/server/server.js";

serve(
	{ fetch: server.fetch, port: Number(process.env.PORT) || 3000 },
	(info) => {
		console.log(`Platform running on http://localhost:${info.port}`);
	},
);
