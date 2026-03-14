import { and, eq } from "drizzle-orm";

import { db } from "..";
import { feedFollows, feeds, users, type Feed, type User } from "../schema";

export async function createFeedFollow(user: User, feed: Feed) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({
      userId: user.id,
      feedId: feed.id,
    })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(
      and(
        eq(feedFollows.userId, newFeedFollow.userId),
        eq(feedFollows.feedId, newFeedFollow.feedId),
      ),
    );

  return result;
}

export async function getFeedFollowsForUser(user: User) {
  return db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.userId, user.id));
}

export async function deleteFeedFollow(user: User, feedURL: string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, feedURL));

  if (!feed) {
    throw new Error(`feed ${feedURL} does not exist`);
  }

  const [result] = await db
    .delete(feedFollows)
    .where(
      and(eq(feedFollows.userId, user.id), eq(feedFollows.feedId, feed.id)),
    )
    .returning();

  if (!result) {
    throw new Error(`feed follow for ${feedURL} not found`);
  }

  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    userId: result.userId,
    feedId: result.feedId,
    userName: user.name,
    feedName: feed.name,
  };
}
