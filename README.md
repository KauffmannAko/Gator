# Gator

Gator is a TypeScript CLI for tracking RSS feeds from the terminal.

It can:
- register and log in users
- add and follow feeds
- run a long-lived feed aggregator
- store posts in Postgres
- browse recent posts from the feeds the current user follows

## Requirements

To run the CLI locally, you need:
- Node.js 20+ recommended
- npm
- PostgreSQL running locally or another reachable Postgres instance

This project uses:
- `tsx` to run the TypeScript CLI
- `drizzle-orm` and `drizzle-kit` for database access and migrations

## Install

From the project root:

```bash
npm install
```

## Config File

Gator reads its config from:

```text
~/.gatorconfig.json
```

Create that file with contents like:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```

`db_url` should point to your Postgres database.

## Database Setup

Generate and apply migrations from the project root:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

If you already have the generated migration files in the repo, `generate` is optional and `migrate` is the important step.

## Run The CLI

All commands are run from the project root with:

```bash
npm run start <command> [args...]
```

Examples:

```bash
npm run start register nana
npm run start login nana
npm run start addfeed "Boot.dev Blog" "https://www.boot.dev/blog/index.xml"
npm run start follow https://news.ycombinator.com/rss
npm run start browse 5
```

## Common Commands

`register <username>`
- Creates a new user and sets them as the current user.

`login <username>`
- Logs in as an existing user.

`users`
- Lists all users and marks the current user.

`reset`
- Deletes users and dependent feed data from the database. Useful for development, dangerous for real data.

`addfeed <name> <url>`
- Creates a feed for the current user.
- Automatically creates a follow record for that feed.

`feeds`
- Lists all feeds in the database and the user who created each one.

`follow <url>`
- Follows an existing feed by URL for the current user.

`following`
- Lists feed names the current user is following.

`unfollow <url>`
- Removes a follow for the current user by feed URL.

`agg <time_between_reqs>`
- Starts the feed aggregator loop.
- Example durations: `500ms`, `1s`, `30s`, `5m`, `1h`
- Example:

```bash
npm run start agg 1m
```

This command continuously:
- picks the next feed that should be fetched
- fetches and parses its RSS feed
- stores new posts in the database

Stop it with `Ctrl+C`.

`browse [limit]`
- Shows recent posts from feeds the current user follows.
- Defaults to `2` posts if no limit is provided.

## Example Workflow

```bash
npm run start register nana
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
npm run start agg 30s
```

In another terminal:

```bash
npm run start browse 10
```

## Notes

- The aggregator is intentionally rate-limited by the interval you provide. Do not set it aggressively enough to spam third-party servers.
- The current `npm test` script is still a placeholder and does not run an automated test suite.
