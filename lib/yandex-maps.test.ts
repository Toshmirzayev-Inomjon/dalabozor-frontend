import assert from "node:assert/strict";
import test from "node:test";

import {
  buildYandexMapsUrl,
  getRouteMapLocation,
  getYandexBounds,
  isValidGeoCoordinates,
  loadYandexMaps,
  toYandexCoordinates,
} from "./yandex-maps";

test("geo koordinatalar chegarasi va bo‘sh nuqta tekshiriladi", () => {
  assert.equal(isValidGeoCoordinates(38.861, 65.789), true);
  assert.equal(isValidGeoCoordinates(-90, 180), true);
  assert.equal(isValidGeoCoordinates(91, 65), false);
  assert.equal(isValidGeoCoordinates(38, -181), false);
  assert.equal(isValidGeoCoordinates(Number.NaN, 65), false);
  assert.equal(isValidGeoCoordinates(0, 0), false);
  assert.equal(isValidGeoCoordinates(null, 65), false);
});

test("backend lat/lng Yandex uchun lng/lat tartibiga o‘tkaziladi", () => {
  assert.deepEqual(toYandexCoordinates(38.861, 65.789), [65.789, 38.861]);
  assert.throws(() => toYandexCoordinates(0, 0), /noto‘g‘ri/);
});

test("bir nechta nuqta uchun marshrut chegarasi hisoblanadi", () => {
  const points = [
    { lat: 39.03, lng: 66.56 },
    { lat: 38.86, lng: 65.79 },
    { lat: 39.25, lng: 65.15 },
  ];
  assert.deepEqual(getYandexBounds(points), [[65.15, 38.86], [66.56, 39.25]]);
  assert.deepEqual(getRouteMapLocation(points), {
    bounds: [[65.15, 38.86], [66.56, 39.25]],
  });
});

test("bitta nuqta xavfsiz zoom bilan markazga olinadi", () => {
  assert.deepEqual(getRouteMapLocation([{ lat: 38.861, lng: 65.789 }]), {
    center: [65.789, 38.861],
    zoom: 13,
  });
});

test("Yandex Maps havolasi koordinatani query ichiga joylaydi", () => {
  const url = new URL(buildYandexMapsUrl(38.861, 65.789));
  assert.equal(url.origin, "https://yandex.com");
  assert.equal(url.searchParams.get("ll"), "65.789,38.861");
  assert.equal(url.searchParams.get("pt"), "65.789,38.861,pm2rdm");
});

test("loader kalitsiz va server muhitida xavfsiz xato qaytaradi", async () => {
  await assert.rejects(loadYandexMaps(""), /kaliti sozlanmagan/);
  await assert.rejects(loadYandexMaps("browser-only-key"), /faqat brauzerda/);
});
