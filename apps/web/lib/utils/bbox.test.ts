import { describe, expect, it } from "vitest";
import { bboxToQueryString, boundsToTuple } from "./bbox";

describe("boundsToTuple", () => {
  it("converts array bounds", () => {
    const tuple = boundsToTuple([
      [-10, 5],
      [10, 15]
    ]);
    expect(tuple).toEqual([-10, 5, 10, 15]);
  });
});

describe("bboxToQueryString", () => {
  it("formats with fixed precision", () => {
    const query = bboxToQueryString([-1.1234567, 2.2345678, 3.3456789, 4.456789]);
    expect(query).toBe("-1.123457,2.234568,3.345679,4.456789");
  });
});
