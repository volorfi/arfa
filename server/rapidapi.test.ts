import { describe, expect, it } from "vitest";

describe("RapidAPI Key Validation", () => {
  it("should have RAPIDAPI_KEY set in environment", () => {
    const key = process.env.RAPIDAPI_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should successfully call Yahoo Finance API with the key", async () => {
    const key = process.env.RAPIDAPI_KEY;
    const res = await fetch(
      "https://yahoo-finance15.p.rapidapi.com/api/v1/markets/quote?ticker=AAPL&type=STOCKS",
      {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com",
          "x-rapidapi-key": key!,
        },
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeDefined();
  }, 15000);
});
