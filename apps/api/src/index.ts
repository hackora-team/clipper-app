import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { mockAuth } from "./middleware/mock-auth.js";
import { clips } from "./routes/clips.js";
import { credits } from "./routes/credits.js";
import { jobs } from "./routes/jobs.js";
import { sse } from "./routes/sse.js";

const app = new Hono();

app.use(
	cors({
		origin: ["http://localhost:3000", "http://localhost:4000"],
		credentials: true,
	}),
);

app.use(mockAuth);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.route("/api/jobs", jobs);
app.route("/api/clips", clips);
app.route("/api/credits", credits);
app.route("/api/jobs", sse);

serve(
	{
		fetch: app.fetch,
		port: 8000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
