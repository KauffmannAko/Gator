import { promises as fs } from "node:fs";
import * as os from "node:os";

export type Config = {
  dbUrl: string;
  currentUserName: string;
};

type ConfigFile = {
  db_url: string;
  current_user_name: string;
};

// Store the config in the user's home directory.
const CONFIG_FILE_PATH = `${os.homedir()}/.gatorconfig.json`;

function fromConfigFile(configFile: ConfigFile): Config {
  // Convert persisted snake_case keys into the app's camelCase shape.
  return {
    dbUrl: configFile.db_url,
    currentUserName: configFile.current_user_name,
  };
}

function toConfigFile(config: Config): ConfigFile {
  // Convert the app config back into the JSON file's expected keys.
  return {
    db_url: config.dbUrl,
    current_user_name: config.currentUserName,
  };
}

export async function readConfig(): Promise<Config> {
  const configText = await fs.readFile(CONFIG_FILE_PATH, "utf8");
  const configFile = JSON.parse(configText) as ConfigFile;
  return fromConfigFile(configFile);
}

export async function setUser(userName: string, config: Config): Promise<void> {
  const updatedConfig: Config = {
    ...config,
    currentUserName: userName,
  };

  await fs.writeFile(
    CONFIG_FILE_PATH,
    `${JSON.stringify(toConfigFile(updatedConfig), null, 2)}\n`,
    "utf8",
  );
}
