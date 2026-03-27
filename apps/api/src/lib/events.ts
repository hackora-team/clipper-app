import { EventEmitter } from "node:events";

export const jobEmitter = new EventEmitter();
jobEmitter.setMaxListeners(200);

export interface JobEvent {
	jobId: string;
	status: string;
	message?: string;
	data?: unknown;
}

export function emitJobEvent(event: JobEvent) {
	jobEmitter.emit(`job:${event.jobId}`, event);
}
