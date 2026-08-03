import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, toLocalIsoDate } from "./date";

test("toLocalIsoDate local calendar sanasini UTCga siljitmaydi", () => {
  assert.equal(toLocalIsoDate(new Date(2026, 0, 2, 0, 30)), "2026-01-02");
  assert.equal(toLocalIsoDate(new Date(2026, 10, 9, 23, 45)), "2026-11-09");
});

test("formatDate ISO sanani o‘zbekcha o‘qiladigan ko‘rinishga o‘giradi", () => {
  const result = formatDate("2026-07-22", { day: "numeric", month: "long", year: "numeric" });
  assert.match(result, /2026/);
  assert.notEqual(result, "2026-07-22");
});

test("formatDate noto‘g‘ri qiymatni buzmasdan qaytaradi", () => {
  assert.equal(formatDate("noma’lum"), "noma’lum");
});
