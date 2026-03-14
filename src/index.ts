import {
  handlerAddFeed,
  handlerAgg,
  handlerBrowse,
  CommandsRegistry,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerLogin,
  handlerReset,
  handlerRegister,
  handlerUnfollow,
  handlerUsers,
  middlewareLoggedIn,
  registerCommand,
  runCommand,
} from "./commands";

async function main() {
  const cliArgs = process.argv.slice(2);

  if (cliArgs.length < 1) {
    console.error("usage: gator <command> [args...]");
    process.exit(1);
  }

  const [cmdName, ...args] = cliArgs;

  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(handlerFollowing),
  );
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

  try {
    await runCommand(registry, cmdName, ...args);
  } catch (error: unknown) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
