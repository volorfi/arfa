import { describe, expect, it } from "vitest";
import {
  getSovereignBonds,
  getSovereignBondBySlug,
  getSovereignFilters,
  getSovereignSummary,
  getSovereignBondsByCountry,
  getSovereignCountries,
  getCountryMacroDetail,
} from "./sovereignService";

describe("sovereignService", () => {
  describe("getSovereignBonds", () => {
    it("returns all bonds when no filters provided", () => {
      const bonds = getSovereignBonds();
      expect(bonds.length).toBeGreaterThan(0);
    });

    it("filters by region", () => {
      const bonds = getSovereignBonds({ region: "Europe" });
      expect(bonds.length).toBeGreaterThan(0);
      bonds.forEach((b) => expect(b.region).toBe("Europe"));
    });

    it("filters by country", () => {
      const bonds = getSovereignBonds({ country: "Brazil" });
      expect(bonds.length).toBeGreaterThan(0);
      bonds.forEach((b) => expect(b.country).toBe("Brazil"));
    });

    it("filters by search query", () => {
      const bonds = getSovereignBonds({ search: "saudi" });
      expect(bonds.length).toBeGreaterThan(0);
      bonds.forEach((b) => {
        const match =
          b.ticker.toLowerCase().includes("saudi") ||
          b.name.toLowerCase().includes("saudi") ||
          (b.country && b.country.toLowerCase().includes("saudi"));
        expect(match).toBe(true);
      });
    });

    it("returns empty array for non-existent filter", () => {
      const bonds = getSovereignBonds({ country: "NonExistentCountry123" });
      expect(bonds).toEqual([]);
    });
  });

  describe("getSovereignBondBySlug", () => {
    it("returns a bond when slug exists", () => {
      const allBonds = getSovereignBonds();
      const firstSlug = allBonds[0]?.slug;
      if (firstSlug) {
        const bond = getSovereignBondBySlug(firstSlug);
        expect(bond).toBeDefined();
        expect(bond?.slug).toBe(firstSlug);
      }
    });

    it("returns undefined for non-existent slug", () => {
      const bond = getSovereignBondBySlug("non-existent-slug-12345");
      expect(bond).toBeUndefined();
    });
  });

  describe("getSovereignFilters", () => {
    it("returns filter arrays with data", () => {
      const filters = getSovereignFilters();
      expect(filters.regions.length).toBeGreaterThan(0);
      expect(filters.countries.length).toBeGreaterThan(0);
      expect(filters.currencies.length).toBeGreaterThan(0);
      expect(Array.isArray(filters.ratings)).toBe(true);
    });
  });

  describe("getSovereignSummary", () => {
    it("returns summary statistics", () => {
      const summary = getSovereignSummary();
      expect(summary.totalBonds).toBeGreaterThan(0);
      expect(summary.uniqueCountries).toBeGreaterThan(0);
      expect(parseFloat(summary.avgYield)).toBeGreaterThan(0);
      expect(typeof summary.regionDistribution).toBe("object");
      expect(typeof summary.ratingDistribution).toBe("object");
    });
  });

  describe("getSovereignBondsByCountry", () => {
    it("returns bonds for a valid country", () => {
      const bonds = getSovereignBondsByCountry("Mexico");
      expect(bonds.length).toBeGreaterThan(0);
      bonds.forEach((b) => expect(b.country?.toLowerCase()).toBe("mexico"));
    });

    it("is case-insensitive", () => {
      const bonds1 = getSovereignBondsByCountry("mexico");
      const bonds2 = getSovereignBondsByCountry("MEXICO");
      expect(bonds1.length).toBe(bonds2.length);
    });

    it("returns empty array for non-existent country", () => {
      const bonds = getSovereignBondsByCountry("Atlantis");
      expect(bonds).toEqual([]);
    });
  });

  describe("getSovereignCountries", () => {
    it("returns list of countries with macro data", () => {
      const countries = getSovereignCountries();
      expect(countries.length).toBeGreaterThan(0);
      countries.forEach((c) => {
        expect(c.country).toBeTruthy();
        expect(c.bondCount).toBeGreaterThan(0);
      });
    });

    it("countries are sorted alphabetically", () => {
      const countries = getSovereignCountries();
      for (let i = 1; i < countries.length; i++) {
        expect(countries[i].country.localeCompare(countries[i - 1].country)).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes key macro fields", () => {
      const countries = getSovereignCountries();
      const brazil = countries.find((c) => c.country === "Brazil");
      expect(brazil).toBeDefined();
      expect(brazil?.region).toBe("Latam");
      expect(brazil?.bondCount).toBeGreaterThan(0);
    });
  });

  describe("getCountryMacroDetail", () => {
    it("returns macro detail for a valid country", () => {
      const detail = getCountryMacroDetail("Saudi Arabia");
      expect(detail).not.toBeNull();
      expect(detail?.country).toBe("Saudi Arabia");
      expect(detail?.region).toBe("Middle East");
      expect(detail?.compositeRating).toBeTruthy();
    });

    it("includes credit commentary for countries that have it", () => {
      const detail = getCountryMacroDetail("Saudi Arabia");
      expect(detail?.creditComment).toBeTruthy();
    });

    it("is case-insensitive", () => {
      const detail1 = getCountryMacroDetail("brazil");
      const detail2 = getCountryMacroDetail("BRAZIL");
      expect(detail1?.country).toBe(detail2?.country);
    });

    it("returns null for non-existent country", () => {
      const detail = getCountryMacroDetail("Atlantis");
      expect(detail).toBeNull();
    });

    it("includes macro fields", () => {
      const detail = getCountryMacroDetail("Brazil");
      expect(detail).not.toBeNull();
      expect(typeof detail?.realGDPGrowth).toBe("number");
      expect(typeof detail?.inflation).toBe("number");
      expect(typeof detail?.publicDebtGDP2025).toBe("number");
    });
  });
});
