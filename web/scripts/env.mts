import { existsSync } from "node:fs";
// loadEnvFile no pisa las variables ya definidas por la terminal/CI.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
