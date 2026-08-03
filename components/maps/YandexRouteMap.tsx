"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YMap as YandexMap } from "@yandex/ymaps3-types";

import { Icon } from "@/components/icons";
import { OutlineButton, Spinner } from "@/components/ui";
import type { Stop } from "@/lib/api";
import {
  buildYandexMapsUrl,
  getRouteMapLocation,
  isValidGeoCoordinates,
  loadYandexMaps,
  toYandexCoordinates,
  type GeoCoordinates,
} from "@/lib/yandex-maps";

type YandexRouteMapProps = {
  stops: Stop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
};

type MappedStop = Stop & {
  coordinates: GeoCoordinates;
};

type MapStatus = "idle" | "loading" | "ready" | "error";

function mapErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Yandex Maps’ni yuklab bo‘lmadi.";
}

function markerLabel(stop: Stop): string {
  const farmer = stop.farmer_name || "Nomsiz dehqon";
  const village = stop.village || "manzil ko‘rsatilmagan";
  return `${stop.seq}-nuqta: ${farmer}, ${village}`;
}

export function YandexRouteMap({
  stops,
  selectedStopId,
  onSelectStop,
}: YandexRouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() || "";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YandexMap | null>(null);
  const markerElementsRef = useRef(new Map<string, HTMLButtonElement>());
  const onSelectStopRef = useRef(onSelectStop);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const mappedStops = useMemo<MappedStop[]>(() => stops
    .filter((stop) => isValidGeoCoordinates(stop.geo_lat, stop.geo_lng))
    .map((stop) => ({
      ...stop,
      coordinates: { lat: stop.geo_lat!, lng: stop.geo_lng! },
    })), [stops]);
  const missingCount = stops.length - mappedStops.length;
  const nextPendingId = useMemo(
    () => stops.find((stop) => stop.status === "pending")?.id || null,
    [stops],
  );
  const selectedStop = mappedStops.find((stop) => stop.id === selectedStopId)
    || mappedStops.find((stop) => stop.id === nextPendingId)
    || mappedStops[0]
    || null;

  useEffect(() => {
    onSelectStopRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    if (!apiKey || mappedStops.length === 0) return;

    let cancelled = false;
    const markerElements = markerElementsRef.current;
    setStatus("loading");
    setError("");

    void loadYandexMaps(apiKey).then((api) => {
      const container = mapContainerRef.current;
      if (cancelled || !container) return;

      container.replaceChildren();
      const coordinates = mappedStops.map((stop) => stop.coordinates);
      const map = new api.YMap(container, {
        location: getRouteMapLocation(coordinates),
        behaviors: ["drag", "pinchZoom", "dblClick"],
        margin: [48, 48, 56, 48],
        copyrightsPosition: "top right",
        distributionPosition: "top left",
        showScaleInCopyrights: true,
      }, [
        new api.YMapDefaultSchemeLayer({}),
        new api.YMapDefaultFeaturesLayer({}),
      ]);

      if (mappedStops.length > 1) {
        map.addChild(new api.YMapFeature({
          id: "collector-stop-order",
          geometry: {
            type: "LineString",
            coordinates: mappedStops.map((stop) => (
              toYandexCoordinates(stop.coordinates.lat, stop.coordinates.lng)
            )),
          },
          style: {
            stroke: [
              { color: "rgba(255, 255, 255, 0.92)", width: 9 },
              { color: "#175c3a", width: 4 },
            ],
          },
        }));
      }

      markerElements.clear();
      mappedStops.forEach((stop) => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "yandex-route-marker";
        marker.dataset.kind = stop.status === "accepted"
          ? "accepted"
          : stop.id === nextPendingId
            ? "next"
            : "pending";
        marker.dataset.selected = "false";
        marker.title = markerLabel(stop);
        marker.setAttribute("aria-label", markerLabel(stop));
        const markerText = document.createElement("span");
        markerText.textContent = stop.status === "accepted" ? "✓" : String(stop.seq);
        marker.appendChild(markerText);
        marker.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectStopRef.current(stop.id);
        });

        markerElements.set(stop.id, marker);
        map.addChild(new api.YMapMarker({
          coordinates: toYandexCoordinates(stop.coordinates.lat, stop.coordinates.lng),
          zIndex: stop.id === nextPendingId ? 20 : 10,
          blockEvents: true,
        }, marker));
      });

      mapRef.current = map;
      setStatus("ready");
    }).catch((loadError: unknown) => {
      if (cancelled) return;
      setError(mapErrorText(loadError));
      setStatus("error");
    });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markerElements.clear();
    };
  }, [apiKey, mappedStops, nextPendingId, retryKey]);

  useEffect(() => {
    markerElementsRef.current.forEach((marker, stopId) => {
      marker.dataset.selected = String(stopId === selectedStopId);
    });

    const stop = mappedStops.find((item) => item.id === selectedStopId);
    if (stop && mapRef.current) {
      mapRef.current.setLocation({
        center: toYandexCoordinates(stop.coordinates.lat, stop.coordinates.lng),
        duration: 280,
      });
    }
  }, [mappedStops, selectedStopId, status]);

  function fitAllStops() {
    if (!mapRef.current) return;
    mapRef.current.setLocation({
      ...getRouteMapLocation(mappedStops.map((stop) => stop.coordinates)),
      duration: 280,
    });
  }

  return (
    <section id="collector-route-map" className="surface-card mt-5 overflow-hidden" aria-labelledby="route-map-title">
      <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="route-map-title" className="font-head text-lg font-extrabold tracking-[-0.025em] text-text">
              Nuqtalar xaritasi
            </h2>
            <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-extrabold text-gold">
              Yandex Maps
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            Chiziq avtomobil yo‘li emas — yig‘im nuqtalarining belgilangan tartibini ko‘rsatadi.
          </p>
        </div>
        {status === "ready" && mappedStops.length > 1 && (
          <OutlineButton onClick={fitAllStops} icon="route" className="w-full sm:w-auto">
            Barchasini ko‘rsatish
          </OutlineButton>
        )}
      </div>

      {!apiKey ? (
        <MapFallback
          title="Xarita kaliti sozlanmagan"
          text="Yandex Maps kaliti qo‘shilgach marshrut nuqtalari shu yerda ko‘rinadi. Qabul ro‘yxati ishlashda davom etadi."
        />
      ) : mappedStops.length === 0 ? (
        <MapFallback
          title="Nuqtalarning aniq lokatsiyasi kiritilmagan"
          text="Dehqonlar profil sozlamasida joriy joylashuvini saqlagach markerlar avtomatik paydo bo‘ladi."
        />
      ) : (
        <>
          <div className="relative h-[330px] bg-[#e9eee7] sm:h-[400px] xl:h-[440px]" aria-busy={status === "loading"}>
            <div
              ref={mapContainerRef}
              className="h-full w-full"
              role="region"
              aria-label="Bugungi yig‘im nuqtalari Yandex xaritasi"
            />
            {(status === "idle" || status === "loading") && (
              <div className="absolute inset-0 grid place-items-center bg-[#eef2ea]" role="status">
                <div className="flex flex-col items-center gap-3 text-sm font-semibold text-muted">
                  <Spinner className="h-6 w-6 text-gold" />
                  Xarita yuklanmoqda…
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="absolute inset-0 grid place-items-center bg-[#f5f6f1] px-6 text-center" role="alert">
                <div className="max-w-md">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-red/10 text-red">
                    <Icon name="route" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-head text-lg font-extrabold text-text">Xaritani ochib bo‘lmadi</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {error} Kalitning JavaScript API turi va HTTP Referer ruxsatini tekshiring.
                  </p>
                  <OutlineButton onClick={() => setRetryKey((value) => value + 1)} icon="refresh" className="mt-4">
                    Qayta urinish
                  </OutlineButton>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-line bg-white px-5 py-4 sm:px-6">
            {selectedStop && (
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold text-sm font-extrabold text-white">
                    {selectedStop.seq}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-text">
                      {selectedStop.farmer_name || "Nomsiz dehqon"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {selectedStop.village || "Manzil ko‘rsatilmagan"} · {selectedStop.planned_kg} kg
                    </p>
                  </div>
                </div>
                <a
                  href={buildYandexMapsUrl(selectedStop.coordinates.lat, selectedStop.coordinates.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="outline-btn px-4 py-2.5 text-sm"
                >
                  Yandex Maps’da ochish
                  <Icon name="arrow" className="h-4 w-4" />
                </a>
              </div>
            )}
            {missingCount > 0 && (
              <p className="mt-3 rounded-2xl border border-orange/20 bg-orange/10 px-3.5 py-2.5 text-xs font-semibold leading-5 text-[#A45D12]">
                {missingCount} ta nuqtaning aniq joylashuvi kiritilmagan; ular ro‘yxatda ishlashda davom etadi.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MapFallback({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[330px] place-items-center bg-[#eef2ea] px-6 py-10 text-center sm:min-h-[400px]">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
          <Icon name="route" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 font-head text-lg font-extrabold text-text">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}
