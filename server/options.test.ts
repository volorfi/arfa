import { describe, expect, it } from "vitest";
import { blackScholesGreeks, calculateMaxPain, calculatePutCallRatio } from "./optionsService";
import type { OptionContract } from "./optionsService";

describe("Black-Scholes Greeks", () => {
  it("calculates call price correctly for ATM option", () => {
    const result = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    // ATM call with 3 months, 30% IV should be around $6-7
    expect(result.price).toBeGreaterThan(5);
    expect(result.price).toBeLessThan(9);
  });

  it("calculates put price correctly for ATM option", () => {
    const result = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    // ATM put should be slightly less than call (due to put-call parity with positive rate)
    expect(result.price).toBeGreaterThan(4);
    expect(result.price).toBeLessThan(8);
  });

  it("call delta is between 0 and 1", () => {
    const result = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    expect(result.delta).toBeGreaterThan(0);
    expect(result.delta).toBeLessThanOrEqual(1);
  });

  it("put delta is between -1 and 0", () => {
    const result = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(result.delta).toBeGreaterThanOrEqual(-1);
    expect(result.delta).toBeLessThan(0);
  });

  it("ATM call delta is approximately 0.5", () => {
    const result = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    expect(result.delta).toBeGreaterThan(0.45);
    expect(result.delta).toBeLessThan(0.65);
  });

  it("gamma is positive for both calls and puts", () => {
    const call = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    const put = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(call.gamma).toBeGreaterThan(0);
    expect(put.gamma).toBeGreaterThan(0);
  });

  it("theta is negative for long options", () => {
    const call = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    const put = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(call.theta).toBeLessThan(0);
    expect(put.theta).toBeLessThan(0);
  });

  it("vega is positive for both calls and puts", () => {
    const call = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    const put = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(call.vega).toBeGreaterThan(0);
    expect(put.vega).toBeGreaterThan(0);
  });

  it("deep ITM call has delta close to 1", () => {
    const result = blackScholesGreeks(150, 100, 0.25, 0.05, 0.3, "call");
    expect(result.delta).toBeGreaterThan(0.95);
  });

  it("deep OTM call has delta close to 0", () => {
    const result = blackScholesGreeks(50, 100, 0.25, 0.05, 0.3, "call");
    expect(result.delta).toBeLessThan(0.05);
  });

  it("handles zero time to expiry (expired option)", () => {
    const callITM = blackScholesGreeks(110, 100, 0, 0.05, 0.3, "call");
    expect(callITM.price).toBe(10); // intrinsic value
    expect(callITM.delta).toBe(1);

    const callOTM = blackScholesGreeks(90, 100, 0, 0.05, 0.3, "call");
    expect(callOTM.price).toBe(0);
    expect(callOTM.delta).toBe(0);
  });

  it("put-call parity holds approximately", () => {
    const S = 100, K = 105, T = 0.5, r = 0.05, sigma = 0.25;
    const call = blackScholesGreeks(S, K, T, r, sigma, "call");
    const put = blackScholesGreeks(S, K, T, r, sigma, "put");
    // C - P = S - K * e^(-rT)
    const parity = call.price - put.price;
    const expected = S - K * Math.exp(-r * T);
    expect(Math.abs(parity - expected)).toBeLessThan(0.01);
  });

  it("call and put gamma are equal", () => {
    const call = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    const put = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(Math.abs(call.gamma - put.gamma)).toBeLessThan(0.0001);
  });

  it("call and put vega are equal", () => {
    const call = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "call");
    const put = blackScholesGreeks(100, 100, 0.25, 0.05, 0.3, "put");
    expect(Math.abs(call.vega - put.vega)).toBeLessThan(0.0001);
  });
});

describe("Max Pain Calculation", () => {
  it("calculates max pain for simple chain", () => {
    const calls: OptionContract[] = [
      { contractSymbol: "C90", strike: 90, lastPrice: 12, change: 0, percentChange: 0, volume: 100, openInterest: 500, bid: 11.5, ask: 12.5, impliedVolatility: 0.3, inTheMoney: true, expiration: 0, lastTradeDate: 0 },
      { contractSymbol: "C100", strike: 100, lastPrice: 5, change: 0, percentChange: 0, volume: 200, openInterest: 1000, bid: 4.5, ask: 5.5, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
      { contractSymbol: "C110", strike: 110, lastPrice: 1, change: 0, percentChange: 0, volume: 50, openInterest: 300, bid: 0.8, ask: 1.2, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
    ];
    const puts: OptionContract[] = [
      { contractSymbol: "P90", strike: 90, lastPrice: 1, change: 0, percentChange: 0, volume: 50, openInterest: 200, bid: 0.8, ask: 1.2, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
      { contractSymbol: "P100", strike: 100, lastPrice: 5, change: 0, percentChange: 0, volume: 200, openInterest: 800, bid: 4.5, ask: 5.5, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
      { contractSymbol: "P110", strike: 110, lastPrice: 12, change: 0, percentChange: 0, volume: 100, openInterest: 400, bid: 11.5, ask: 12.5, impliedVolatility: 0.3, inTheMoney: true, expiration: 0, lastTradeDate: 0 },
    ];
    const maxPain = calculateMaxPain(calls, puts);
    // Max pain should be one of the strikes
    expect([90, 100, 110]).toContain(maxPain);
  });

  it("returns first strike for empty chain", () => {
    const maxPain = calculateMaxPain([], []);
    expect(maxPain).toBe(0);
  });
});

describe("Put/Call Ratio", () => {
  it("calculates volume and OI ratios correctly", () => {
    const calls: OptionContract[] = [
      { contractSymbol: "C100", strike: 100, lastPrice: 5, change: 0, percentChange: 0, volume: 1000, openInterest: 5000, bid: 4.5, ask: 5.5, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
    ];
    const puts: OptionContract[] = [
      { contractSymbol: "P100", strike: 100, lastPrice: 5, change: 0, percentChange: 0, volume: 500, openInterest: 3000, bid: 4.5, ask: 5.5, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
    ];
    const result = calculatePutCallRatio(calls, puts);
    expect(result.volumeRatio).toBe(0.5); // 500/1000
    expect(result.oiRatio).toBe(0.6); // 3000/5000
    expect(result.totalCallVolume).toBe(1000);
    expect(result.totalPutVolume).toBe(500);
    expect(result.totalCallOI).toBe(5000);
    expect(result.totalPutOI).toBe(3000);
  });

  it("handles zero call volume gracefully", () => {
    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [
      { contractSymbol: "P100", strike: 100, lastPrice: 5, change: 0, percentChange: 0, volume: 500, openInterest: 3000, bid: 4.5, ask: 5.5, impliedVolatility: 0.3, inTheMoney: false, expiration: 0, lastTradeDate: 0 },
    ];
    const result = calculatePutCallRatio(calls, puts);
    expect(result.volumeRatio).toBe(0); // division by zero guard
    expect(result.oiRatio).toBe(0);
  });
});
