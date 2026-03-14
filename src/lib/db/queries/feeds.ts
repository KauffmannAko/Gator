import { eq, sql } from "drizzle-orm";

import { db } from "..";
import { feeds, users, type Feed, type User } from "../schema";

export async function createFeed(name: string, url: string, user: User) {
  const [result] = await db
    .insert(feeds)
    .values({
      name,
      url,
      userId: user.id,
    })
    .returning();

  return result;
}

export function printFeed(feed: Feed, user: User) {
  console.log(`id: ${feed.id}`);
  console.log(`createdAt: ${feed.createdAt}`);
  console.log(`updatedAt: ${feed.updatedAt}`);
  console.log(`name: ${feed.name}`);
  console.log(`url: ${feed.url}`);
  console.log(`userId: ${feed.userId}`);
  console.log(`userName: ${user.name}`);
}

export async function getFeeds() {
  return db
    .select({
      feedName: feeds.name,
      feedUrl: feeds.url,
      userName: users.name,
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function getFeedByURL(url: string) {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

export async function markFeedFetched(feedId: string) {
  const now = new Date();

  const [result] = await db
    .update(feeds)
    .set({
      lastFetchedAt: now,
      updatedAt: now,
    })
    .where(eq(feeds.id, feedId))
    .returning();

  return result;
}

export async function getNextFeedToFetch() {
  const [result] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`)
    .limit(1);

  return result;
}
