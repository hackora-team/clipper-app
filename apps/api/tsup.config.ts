import { defineConfig } from "tsup";
import { dependencies, devDependencies } from "./package.json";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	outDir: "dist",
	splitting: false,
	platform: "node",
	// Externalize all node_modules — Docker image has them installed,
	// bundling CJS packages like ioredis into ESM causes __require2 failures.
	external: [
		...Object.keys(dependencies ?? {}),
		...Object.keys(devDependencies ?? {}),
	],
});
