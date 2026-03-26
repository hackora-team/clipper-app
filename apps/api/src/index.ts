import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createWorker } from "./lib/worker";
import { clipRoute } from "./routes/clip.route";
import { jobRoute } from "./routes/job.route";
import { startCronJobs } from "./services/cron.service";
import { initStorage } from "./services/ffmpeg.service";

const app = new Hono();

app.use(
	"*",
	cors({
		origin: ["http://localhost:3000", "http://localhost:4000"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

app.get("/", (c) => c.json({ status: "ok", service: "clipper-api" }));

app.route("/api/jobs", jobRoute);
app.route("/api/clips", clipRoute);

async function bootstrap() {
	await initStorage();
	createWorker();
	startCronJobs();

	serve({ fetch: app.fetch, port: 8000 }, (info) => {
		console.log(`Server running on http://localhost:${info.port}`);
	});
}

bootstrap().catch(console.error);
