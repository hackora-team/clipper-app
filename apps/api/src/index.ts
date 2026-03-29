import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createWorker } from "./lib/worker";
import { authRouter } from "./modules/auth/route";
import { clipRoute } from "./routes/clip.route";
import { jobRoute } from "./routes/job.route";
import { uploadRoute } from "./routes/upload.route";
import { startCronJobs } from "./services/cron.service";
import { initStorage } from "./services/ffmpeg.service";

const corsOrigins = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(",")
	: ["http://localhost:3000", "http://localhost:3001", "http://localhost:4000"];

const app = new Hono()
	.use(
		"*",
		cors({
			origin: corsOrigins,
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowHeaders: [
				"Content-Type",
				"Authorization",
				"X-Chunk-Index",
				"X-Chunk-Total",
			],
		}),
	)
	.route("/auth", authRouter)
	.onError((err, c) => {
		if (err instanceof HTTPException) {
			return c.json({ message: err.message }, err.status);
		}
		return c.json({ message: "Internal server error" }, 500);
	});

export type AppType = typeof app;

app.get("/", (c) => c.json({ status: "ok", service: "clipper-api" }));

app.route("/api/jobs", jobRoute);
app.route("/api/clips", clipRoute);
app.route("/api/upload", uploadRoute);

async function bootstrap() {
	await initStorage();
	createWorker();
	startCronJobs();

	serve({ fetch: app.fetch, port: 8000 }, (info) => {
		console.log(`Server running on http://localhost:${info.port}`);
	});
}

bootstrap().catch(console.error);
