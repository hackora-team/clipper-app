import cron from "node-cron";
import { cleanupOldFiles } from "./cleanup.service";

export function startCronJobs(): void {
	cron.schedule("0 * * * *", async () => {
		console.log("[cron] Running hourly file cleanup...");
		try {
			await cleanupOldFiles();
		} catch (err) {
			console.error("[cron] Cleanup failed:", err);
		}
	});

	console.log("[cron] Hourly cleanup scheduled");
}
