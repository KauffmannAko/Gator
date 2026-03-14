import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

type ParsedRSSFeed = {
  rss?: {
    channel?: ParsedRSSChannel;
  };
};

type ParsedRSSChannel = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  item?: ParsedRSSItem | ParsedRSSItem[];
};

type ParsedRSSItem = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: unknown;
};

function isValidRSSItem(item: ParsedRSSItem): item is RSSItem {
  return (
    typeof item.title === "string" &&
    typeof item.link === "string" &&
    typeof item.description === "string" &&
    typeof item.pubDate === "string"
  );
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });
  const xml = await response.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xml) as ParsedRSSFeed;
  const channel = parsed.rss?.channel;

  if (!channel) {
    throw new Error("rss feed is missing a channel");
  }

  if (
    typeof channel.title !== "string" ||
    typeof channel.link !== "string" ||
    typeof channel.description !== "string"
  ) {
    throw new Error("rss feed channel is missing required fields");
  }

  let items: ParsedRSSItem[] = [];

  if (channel.item) {
    items = Array.isArray(channel.item) ? channel.item : [channel.item];
  }

  return {
    channel: {
      title: channel.title,
      link: channel.link,
      description: channel.description,
      item: items.filter(isValidRSSItem),
    },
  };
}
