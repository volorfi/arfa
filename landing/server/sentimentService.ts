/**
 * Sentiment Analysis Service
 * Uses the built-in LLM to classify news articles as bullish, bearish, or neutral.
 * Processes articles in batches to minimize API calls.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { newsArticles } from "../drizzle/schema";
import { eq, isNull, sql } from "drizzle-orm";

export type Sentiment = "bullish" | "bearish" | "neutral";

interface ArticleForSentiment {
  id: number;
  title: string;
  summary: string | null;
}

const BATCH_SIZE = 20; // Number of articles per LLM call
const MAX_BATCHES_PER_RUN = 30; // Process up to 600 articles per run

/**
 * Analyze sentiment for a batch of articles using structured JSON output.
 * Returns a map of article index to sentiment.
 */
async function analyzeBatch(articles: ArticleForSentiment[]): Promise<Map<number, Sentiment>> {
  const results = new Map<number, Sentiment>();

  // Build the articles list for the prompt
  const articlesList = articles
    .map((a, i) => `[${i}] "${a.title}"${a.summary ? ` — ${a.summary.substring(0, 150)}` : ""}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a financial sentiment classifier. For each news headline and summary, classify the market sentiment as exactly one of: "bullish", "bearish", or "neutral".

Rules:
- "bullish": positive market impact — earnings beats, price increases, upgrades, growth, expansion, deals, positive economic data
- "bearish": negative market impact — earnings misses, price drops, downgrades, layoffs, lawsuits, negative economic data, geopolitical risk
- "neutral": informational only — earnings announcements (without results), scheduled events, factual reports without clear positive/negative signal

Return a JSON object mapping each article index to its sentiment.`,
        },
        {
          role: "user",
          content: `Classify the sentiment of these ${articles.length} financial news articles:\n\n${articlesList}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentiment_results",
          strict: true,
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer", description: "Article index from the input list" },
                    sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"], description: "Market sentiment classification" },
                  },
                  required: ["index", "sentiment"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      if (parsed.results && Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          const idx = item.index;
          const sentiment = item.sentiment;
          if (
            typeof idx === "number" &&
            idx >= 0 &&
            idx < articles.length &&
            ["bullish", "bearish", "neutral"].includes(sentiment)
          ) {
            results.set(articles[idx].id, sentiment as Sentiment);
          }
        }
      }
    }
  } catch (error) {
    console.error("[SentimentService] Batch analysis failed:", error);
  }

  return results;
}

/**
 * Process unanalyzed articles in batches.
 * Returns the number of articles that were successfully analyzed.
 */
export async function analyzeUnprocessedArticles(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let totalProcessed = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
    // Fetch articles without sentiment
    const unprocessed = await db
      .select({
        id: newsArticles.id,
        title: newsArticles.title,
        summary: newsArticles.summary,
      })
      .from(newsArticles)
      .where(isNull(newsArticles.sentiment))
      .limit(BATCH_SIZE);

    if (unprocessed.length === 0) {
      console.log(`[SentimentService] No more unprocessed articles. Total processed: ${totalProcessed}`);
      break;
    }

    console.log(`[SentimentService] Processing batch ${batch + 1} (${unprocessed.length} articles)...`);

    const sentimentMap = await analyzeBatch(unprocessed);

    // Update articles in DB
    for (const [articleId, sentiment] of Array.from(sentimentMap.entries())) {
      try {
        await db
          .update(newsArticles)
          .set({ sentiment })
          .where(eq(newsArticles.id, articleId));
        totalProcessed++;
      } catch (error) {
        console.error(`[SentimentService] Failed to update article ${articleId}:`, error);
      }
    }

    // If the LLM failed to return results for some articles, mark them as neutral to avoid infinite retries
    for (const article of unprocessed) {
      if (!sentimentMap.has(article.id)) {
        try {
          await db
            .update(newsArticles)
            .set({ sentiment: "neutral" })
            .where(eq(newsArticles.id, article.id));
          totalProcessed++;
        } catch (error) {
          // ignore
        }
      }
    }

    // Small delay between batches to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`[SentimentService] Analysis complete: ${totalProcessed} articles processed`);
  return totalProcessed;
}

/**
 * Get sentiment statistics for all articles or filtered by ticker.
 */
export async function getSentimentStats(ticker?: string) {
  const db = await getDb();
  if (!db) return { bullish: 0, bearish: 0, neutral: 0, total: 0 };

  let query;
  if (ticker) {
    const t = ticker.toUpperCase();
    query = db
      .select({
        sentiment: newsArticles.sentiment,
        count: sql<number>`count(*)`,
      })
      .from(newsArticles)
      .where(
        sql`(${newsArticles.tickers} = ${t} OR ${newsArticles.tickers} LIKE ${`${t},%`} OR ${newsArticles.tickers} LIKE ${`%,${t},%`} OR ${newsArticles.tickers} LIKE ${`%,${t}`})`
      )
      .groupBy(newsArticles.sentiment);
  } else {
    query = db
      .select({
        sentiment: newsArticles.sentiment,
        count: sql<number>`count(*)`,
      })
      .from(newsArticles)
      .groupBy(newsArticles.sentiment);
  }

  const rows = await query;
  const stats = { bullish: 0, bearish: 0, neutral: 0, total: 0 };
  for (const row of rows) {
    const s = row.sentiment as Sentiment | null;
    const c = Number(row.count);
    if (s === "bullish") stats.bullish = c;
    else if (s === "bearish") stats.bearish = c;
    else if (s === "neutral") stats.neutral = c;
    stats.total += c;
  }
  return stats;
}
