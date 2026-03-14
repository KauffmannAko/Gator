import { desc, eq, sql } from "drizzle-orm";

import { db } from "..";
import { feedFollows, feeds, posts, type Feed, type Post, type User } from "../schema";

type CreatePostInput = {
  title: string;
  url: string;
  description?: string | null;
  publishedAt?: Date | null;
  feedId: string;
};

export async function createPost(input: CreatePostInput): Promise<Post | undefined> {
  const [result] = await db
    .insert(posts)
    .values({
      title: input.title,
      url: input.url,
      description: input.description ?? null,
      publishedAt: input.publishedAt ?? null,
      feedId: input.feedId,
    })
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return result;
}

export async function getPostsForUser(user: User, limit: number) {
  return db
    .select({
      postId: posts.id,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
    })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, user.id))
    .orderBy(sql`${posts.publishedAt} desc nulls last`, desc(posts.createdAt))
    .limit(limit);
}

export function printPost(post: Awaited<ReturnType<typeof getPostsForUser>>[number]) {
  console.log(`title: ${post.title}`);
  console.log(`url: ${post.url}`);
  console.log(`feed: ${post.feedName}`);

  if (post.publishedAt) {
    console.log(`publishedAt: ${post.publishedAt}`);
  }

  if (post.description) {
    console.log(`description: ${post.description}`);
  }
}
