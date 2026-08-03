import type {
  LngLat,
  LngLatBounds,
  YMapLocationRequest,
} from "@yandex/ymaps3-types";

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

export type YandexMapsApi = typeof import("@yandex/ymaps3-types");

const SCRIPT_ID = "dalabozor-yandex-maps";
const DEFAULT_TIMEOUT_MS = 15_000;

let loaderPromise: Promise<YandexMapsApi> | null = null;

function globalApi(): YandexMapsApi | null {
  return (globalThis as typeof globalThis & { ymaps3?: YandexMapsApi }).ymaps3 || null;
}

export function isValidGeoCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number"
    && typeof lng === "number"
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
    && !(lat === 0 && lng === 0)
  );
}

export function toYandexCoordinates(lat: number, lng: number): LngLat {
  if (!isValidGeoCoordinates(lat, lng)) {
    throw new Error("Xarita koordinatasi noto‘g‘ri.");
  }
  return [lng, lat];
}

export function getYandexBounds(coordinates: GeoCoordinates[]): LngLatBounds | null {
  const valid = coordinates.filter(({ lat, lng }) => isValidGeoCoordinates(lat, lng));
  if (valid.length === 0) return null;

  const longitudes = valid.map(({ lng }) => lng);
  const latitudes = valid.map(({ lat }) => lat);
  let minLng = Math.min(...longitudes);
  let maxLng = Math.max(...longitudes);
  let minLat = Math.min(...latitudes);
  let maxLat = Math.max(...latitudes);

  // Bir xil meridian yoki parallel ustidagi nuqtalarda kamera haddan tashqari
  // yaqinlashib ketmasligi uchun juda kichik maydon qoldiramiz.
  if (minLng === maxLng) {
    minLng -= 0.005;
    maxLng += 0.005;
  }
  if (minLat === maxLat) {
    minLat -= 0.005;
    maxLat += 0.005;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}

export function getRouteMapLocation(coordinates: GeoCoordinates[]): YMapLocationRequest {
  const valid = coordinates.filter(({ lat, lng }) => isValidGeoCoordinates(lat, lng));
  if (valid.length === 0) {
    return { center: [65.789, 38.861], zoom: 8 };
  }
  if (valid.length === 1) {
    return { center: toYandexCoordinates(valid[0].lat, valid[0].lng), zoom: 13 };
  }
  return { bounds: getYandexBounds(valid)! };
}

export function buildYandexMapsUrl(lat: number, lng: number): string {
  const [longitude, latitude] = toYandexCoordinates(lat, lng);
  const url = new URL("https://yandex.com/maps/");
  url.searchParams.set("ll", `${longitude},${latitude}`);
  url.searchParams.set("pt", `${longitude},${latitude},pm2rdm`);
  url.searchParams.set("z", "14");
  return url.toString();
}

function waitUntilReady(api: YandexMapsApi, timeoutMs: number): Promise<YandexMapsApi> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Yandex Maps yuklanish vaqti tugadi."));
    }, timeoutMs);

    api.ready.then(() => {
      window.clearTimeout(timeout);
      resolve(api);
    }).catch(() => {
      window.clearTimeout(timeout);
      reject(new Error("Yandex Maps ishga tushmadi."));
    });
  });
}

export function loadYandexMaps(
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<YandexMapsApi> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) {
    return Promise.reject(new Error("Yandex Maps API kaliti sozlanmagan."));
  }
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Yandex Maps faqat brauzerda ishlaydi."));
  }

  const loadedApi = globalApi();
  if (loadedApi) return waitUntilReady(loadedApi, timeoutMs);
  if (loaderPromise) return loaderPromise;

  const attempt = new Promise<YandexMapsApi>((resolve, reject) => {
    document.getElementById(SCRIPT_ID)?.remove();

    const script = document.createElement("script");
    const source = new URL("https://api-maps.yandex.ru/v3/");
    source.searchParams.set("apikey", normalizedKey);
    source.searchParams.set("lang", "en_RU");

    script.id = SCRIPT_ID;
    script.src = source.toString();
    script.async = true;
    script.dataset.service = "yandex-maps";

    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error("Yandex Maps yuklanish vaqti tugadi."));
    }, timeoutMs);

    script.addEventListener("load", () => {
      const api = globalApi();
      if (!api) {
        window.clearTimeout(timeout);
        reject(new Error("Yandex Maps moduli topilmadi."));
        return;
      }
      waitUntilReady(api, timeoutMs).then((readyApi) => {
        window.clearTimeout(timeout);
        resolve(readyApi);
      }).catch((error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      });
    }, { once: true });

    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Yandex Maps skriptini yuklab bo‘lmadi."));
    }, { once: true });

    document.head.appendChild(script);
  });

  loaderPromise = attempt.catch((error: unknown) => {
    loaderPromise = null;
    document.getElementById(SCRIPT_ID)?.remove();
    throw error;
  });
  return loaderPromise;
}
