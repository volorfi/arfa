import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ───

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── HTML Parsing Logic Tests ───

describe("IdeaFarm HTML Entity Decoding", () => {
  // Test the decodeHtmlEntities function logic inline
  function decodeHtmlEntities(text: string): string {
    return text
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, "–")
      .replace(/&#8212;/g, "—")
      .replace(/&#038;/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\[…\]/g, "…")
      .replace(/\[\.\.\.\]/g, "…");
  }

  it("decodes smart quotes", () => {
    expect(decodeHtmlEntities("&#8220;Hello&#8221;")).toBe('"Hello"');
    expect(decodeHtmlEntities("It&#8217;s")).toBe("It's");
  });

  it("decodes dashes", () => {
    expect(decodeHtmlEntities("A&#8211;B")).toBe("A–B");
    expect(decodeHtmlEntities("A&#8212;B")).toBe("A—B");
  });

  it("decodes ampersands", () => {
    expect(decodeHtmlEntities("A&#038;B")).toBe("A&B");
    expect(decodeHtmlEntities("A&amp;B")).toBe("A&B");
  });

  it("decodes angle brackets and quotes", () => {
    expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>");
    expect(decodeHtmlEntities("&quot;test&quot;")).toBe('"test"');
    expect(decodeHtmlEntities("&#39;test&#39;")).toBe("'test'");
  });

  it("decodes ellipsis patterns", () => {
    expect(decodeHtmlEntities("[…]")).toBe("…");
    expect(decodeHtmlEntities("[...]")).toBe("…");
  });

  it("handles text with no entities", () => {
    expect(decodeHtmlEntities("Plain text")).toBe("Plain text");
  });
});

// ─── URL Hashing ───

describe("URL Hashing", () => {
  it("produces consistent hash for same URL", async () => {
    const crypto = await import("crypto");
    const hash1 = crypto.createHash("sha256").update("https://example.com/research/1").digest("hex").slice(0, 64);
    const hash2 = crypto.createHash("sha256").update("https://example.com/research/1").digest("hex").slice(0, 64);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different URLs", async () => {
    const crypto = await import("crypto");
    const hash1 = crypto.createHash("sha256").update("https://example.com/research/1").digest("hex").slice(0, 64);
    const hash2 = crypto.createHash("sha256").update("https://example.com/research/2").digest("hex").slice(0, 64);
    expect(hash1).not.toBe(hash2);
  });

  it("hash length is 64 characters", async () => {
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update("https://example.com").digest("hex").slice(0, 64);
    expect(hash.length).toBe(64);
  });
});

// ─── tRPC Routes ───

describe("externalResearch.list route", () => {
  it("returns items and total with default params", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("accepts limit and offset params", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.list({ limit: 5, offset: 0 });
    expect(result.items.length).toBeLessThanOrEqual(5);
  });

  it("accepts category filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.list({ category: "Macro" });
    expect(result).toHaveProperty("items");
    // All returned items should match the category (if any)
    for (const item of result.items) {
      if (item.category) {
        expect(item.category.toLowerCase()).toContain("macro");
      }
    }
  });

  it("accepts sentiment filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.list({ sentiment: "bullish" });
    expect(result).toHaveProperty("items");
    for (const item of result.items) {
      expect(item.sentiment).toBe("bullish");
    }
  });

  it("accepts ticker filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.list({ ticker: "AAPL" });
    expect(result).toHaveProperty("items");
    // Items should contain AAPL in tickers
    for (const item of result.items) {
      const tickers = typeof item.tickers === "string" ? JSON.parse(item.tickers) : item.tickers;
      if (Array.isArray(tickers)) {
        expect(tickers.some((t: string) => t.toUpperCase().includes("AAPL"))).toBe(true);
      }
    }
  });
});

describe("externalPodcasts.list route", () => {
  it("returns items and total with default params", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalPodcasts.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("accepts limit and offset params", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalPodcasts.list({ limit: 3, offset: 0 });
    expect(result.items.length).toBeLessThanOrEqual(3);
  });

  it("accepts category filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalPodcasts.list({ category: "The Meb Faber Show" });
    expect(result).toHaveProperty("items");
  });
});

describe("externalResearch.categories route", () => {
  it("returns an array of category strings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalResearch.categories();
    expect(Array.isArray(result)).toBe(true);
    for (const cat of result) {
      expect(typeof cat).toBe("string");
    }
  });
});

describe("externalPodcasts.categories route", () => {
  it("returns an array of category strings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.externalPodcasts.categories();
    expect(Array.isArray(result)).toBe(true);
    for (const cat of result) {
      expect(typeof cat).toBe("string");
    }
  });
});
