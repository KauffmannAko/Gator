import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { readConfig } from "../../config";
import * as schema from "./schema";

const config = await readConfig();
const conn = postgres(config.dbUrl);

export const db = drizzle(conn, { schema });
