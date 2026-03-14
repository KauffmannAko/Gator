import { readConfig, setUser } from "./config";
import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feed_follows";
import {
  createFeed,
  getFeeds,
  getNextFeedToFetch,
  markFeedFetched,
  printFeed,
} from "./lib/db/queries/feeds";
import { createPost, getPostsForUser, printPost } from "./lib/db/queries/posts";
import {
  createUser,
  getUsers,
  getUserByName,
  resetUsers,
} from "./lib/db/queries/users";
import { fetchFeed } from "./rss";
import { getFeedByURL } from "./lib/db/queries/feeds";
import { type User } from "./schema";

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;
export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;
export type CommandsRegistry = Record<string, CommandHandler>;

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const config = await readConfig();
    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`current user ${config.currentUserName} does not exist`);
    }

    await handler(cmdName, user, ...args);
  };
}

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`${cmdName} command expects a username`);
  }

  const username = args[0];
  const user = await getUserByName(username);

  if (!user) {
    throw new Error(`user ${username} does not exist`);
  }

  const config = await readConfig();
  await setUser(username, config);
  console.log(`user set to ${username}`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(`${cmdName} command expects a username`);
  }

  const username = args[0];
  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error(`user ${username} already exists`);
  }

  const user = await createUser(username);
  const config = await readConfig();

  await setUser(username, config);
  console.log(`user created: ${username}`);
  console.log(user);
}

export async function handlerReset(): Promise<void> {
  await resetUsers();
  console.log("users table reset");
}

export async function handlerUsers(): Promise<void> {
  const config = await readConfig();
  const users = await getUsers();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
      continue;
    }

    console.log(`* ${user.name}`);
  }
}

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(`invalid duration: ${durationStr}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`invalid duration unit: ${unit}`);
  }
}

function formatDuration(durationMs: number): string {
  const hours = Math.floor(durationMs / (60 * 60 * 1000));
  const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((durationMs % (60 * 1000)) / 1000);
  const milliseconds = durationMs % 1000;

  if (hours > 0) {
    return `${hours}h${minutes}m${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }

  if (seconds > 0) {
    return `${seconds}s`;
  }

  return `${milliseconds}ms`;
}

function handleError(error: unknown) {
  console.error(error);
}

function parsePublishedAt(dateString: string): Date | null {
  const publishedAt = new Date(dateString);

  if (Number.isNaN(publishedAt.getTime())) {
    return null;
  }

  return publishedAt;
}

export async function scrapeFeeds(): Promise<void> {
  const nextFeed = await getNextFeedToFetch();

  if (!nextFeed) {
    console.log("no feeds to fetch");
    return;
  }

  console.log(`fetching feed: ${nextFeed.name}`);
  await markFeedFetched(nextFeed.id);

  const feed = await fetchFeed(nextFeed.url);
  let createdPosts = 0;

  for (const item of feed.channel.item) {
    const post = await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt: parsePublishedAt(item.pubDate),
      feedId: nextFeed.id,
    });

    if (post) {
      createdPosts += 1;
    }
  }

  console.log(`saved ${createdPosts} posts from ${nextFeed.name}`);
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(`${cmdName} command expects a time_between_reqs`);
  }

  const timeBetweenRequests = parseDuration(args[0]);
  console.log(
    `Collecting feeds every ${formatDuration(timeBetweenRequests)}`,
  );

  await scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    void scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error(`${cmdName} command expects a name and a url`);
  }

  const [name, url] = args;
  const feed = await createFeed(name, url, user);
  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user, feed);
  console.log(`${feedFollow.userName} is now following ${feedFollow.feedName}`);
}

export async function handlerFeeds(): Promise<void> {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`name: ${feed.feedName}`);
    console.log(`url: ${feed.feedUrl}`);
    console.log(`user: ${feed.userName}`);
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(`${cmdName} command expects a url`);
  }

  const [url] = args;
  const feed = await getFeedByURL(url);

  if (!feed) {
    throw new Error(`feed ${url} does not exist`);
  }

  const feedFollow = await createFeedFollow(user, feed);
  console.log(`${feedFollow.userName} is now following ${feedFollow.feedName}`);
}

export async function handlerFollowing(
  _cmdName: string,
  user: User,
): Promise<void> {
  const feedFollows = await getFeedFollowsForUser(user);

  for (const feedFollow of feedFollows) {
    console.log(feedFollow.feedName);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(`${cmdName} command expects a url`);
  }

  const [url] = args;
  const feedFollow = await deleteFeedFollow(user, url);
  console.log(`${feedFollow.userName} unfollowed ${feedFollow.feedName}`);
}

export async function handlerBrowse(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const limitArg = args[0];
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 2;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("browse command expects a positive integer limit");
  }

  const posts = await getPostsForUser(user, limit);

  for (const post of posts) {
    printPost(post);
  }
}
