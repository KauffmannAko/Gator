import { readFileSync } from "node:fs";
import { homedir } from "node:os";

import { defineConfig } from "drizzle-kit";

const defaultDbUrl =
  "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable";

type ConfigFile = {
  db_url: string;
};

function readDbUrl(): string {
  try {
    const configPath = `${homedir()}/.gatorconfig.json`;
    const configText = readFileSync(configPath, "utf8");
    const config = JSON.parse(configText) as ConfigFile;
    if (config.db_url === "postgres://example") {
      return defaultDbUrl;
    }

    return config.db_url;
  } catch {
    return defaultDbUrl;
  }
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/lib/db",
  dialect: "postgresql",
  dbCredentials: {
    url: readDbUrl(),
  },
});
