"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { YandexRouteMap } from "@/components/maps/YandexRouteMap";
import {
  Badge,
  EmptyState,
  GlassCard,
  GoldButton,
  InlineAlert,
  MetricCard,
  OutlineButton,
  PageLoader,
  SectionHeading,
} from "@/components/ui";
import { collector, fmt, type Route, type Stop } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { isValidGeoCoordinates } from "@/lib/yandex-maps";

type Quality = "A" | "B" | "C";

const QUALITY_OPTIONS: { value: Quality; label: string; description: string }[] = [
  { value: "A", label: "A", description: "A’lo" },
  { value: "B", label: "B", description: "Yaxshi" },
  { value: "C", label: "C", description: "Qoniqarli" },
];

const ROUTE_STATUS: Record<string, string> = {
  planned: "Rejalashtirilgan",
  active: "Jarayonda",
  done: "Yakunlangan",
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kutilmagan xatolik yuz berdi.";
}

function routeDateLabel(value: string): string {
  return formatDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CollectorCabinet({ section = "overview" }: { section?: string }) {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await collector.routeToday();
      setRoute(result);
    } catch (requestError: unknown) {
      setError(errorText(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingStops = useMemo(
    () => route?.stops.filter((stop) => stop.status === "pending") || [],
    [route],
  );
  const acceptedStops = useMemo(
    () => route?.stops.filter((stop) => stop.status === "accepted") || [],
    [route],
  );

  async function handleAccepted(stop: Stop, actualKg: number, quality: Quality) {
    setRoute((current) => {
      if (!current) return current;
      const previousActual = stop.actual_kg || 0;
      return {
        ...current,
        total_actual_kg: Math.max(0, current.total_actual_kg - previousActual + actualKg),
        stops: current.stops.map((item) => item.id === stop.id
          ? { ...item, actual_kg: actualKg, quality, status: "accepted" }
          : item),
      };
    });
    setNotice(`${stop.farmer_name || "Dehqon"} nuqtasidagi mahsulot qabul qilindi.`);
    await load(true);
  }

  function showStopOnMap(stopId: string) {
    setSelectedStopId(stopId);
    window.requestAnimationFrame(() => {
      document.getElementById("collector-route-map")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  if (loading) return <PageLoader label="Bugungi marshrut yuklanmoqda…" />;

  const isHistory = section === "history";
  const refreshAction = (
    <OutlineButton
      onClick={() => void load(true)}
      loading={refreshing}
      icon="refresh"
      className="w-full sm:w-auto"
    >
      Yangilash
    </OutlineButton>
  );

  const heading = (
    <SectionHeading
      eyebrow="Yig‘uvchi kabineti"
      title={isHistory ? "Qabul holati" : "Bugungi marshrut"}
      text={
        isHistory
          ? "Bugun qabul qilingan nuqtalar, fakt hajm va mahsulot sifatini ko‘ring."
          : "Navbatdagi nuqtalarni tartib bilan yakunlang va fakt qabulni kiriting."
      }
      action={refreshAction}
    />
  );

  if (!route) {
    return (
      <div>
        {heading}
        {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
        <GlassCard>
          <EmptyState
            icon="route"
            title={error ? "Marshrutni yuklab bo‘lmadi" : "Bugun uchun marshrut yo‘q"}
            text={
              error
                ? "Internet yoki server holatini tekshirib, yana urinib ko‘ring."
                : "Operator marshrutni biriktirgach barcha yig‘im nuqtalari shu yerda ko‘rinadi."
            }
            action={
              <OutlineButton onClick={() => void load()} icon="refresh">
                Qayta urinish
              </OutlineButton>
            }
          />
        </GlassCard>
      </div>
    );
  }

  const plannedKg = Math.max(0, route.total_planned_kg || 0);
  const actualKg = Math.max(0, route.total_actual_kg || 0);
  const remainingKg = Math.max(0, plannedKg - actualKg);
  const progress = plannedKg > 0
    ? Math.min(100, Math.max(0, Math.round((actualKg / plannedKg) * 100)))
    : route.stops.length > 0
      ? Math.round((acceptedStops.length / route.stops.length) * 100)
      : 0;

  return (
    <div>
      {heading}
      {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
      {notice && (
        <div className="mb-5">
          <InlineAlert tone="success">{notice}</InlineAlert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Rejadagi hajm"
          value={`${fmt(plannedKg)} kg`}
          note={routeDateLabel(route.date)}
          icon="box"
        />
        <MetricCard
          label="Qabul qilindi"
          value={`${fmt(actualKg)} kg`}
          note={`${acceptedStops.length} ta nuqta yakunlandi`}
          icon="check"
          tone="lime"
        />
        <MetricCard
          label="Qolgan hajm"
          value={`${fmt(remainingKg)} kg`}
          note={`${pendingStops.length} ta nuqta kutilmoqda`}
          icon="route"
          tone="orange"
        />
        <MetricCard
          label="Marshrut holati"
          value={`${progress}%`}
          note={ROUTE_STATUS[route.status] || route.status}
          icon="chart"
          tone="blue"
        />
      </div>

      <GlassCard className="mt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-head text-lg font-extrabold tracking-[-0.025em] text-text">
                Yig‘im jarayoni
              </h2>
              <span className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs font-bold text-muted">
                {ROUTE_STATUS[route.status] || route.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {acceptedStops.length} / {route.stops.length} nuqta yakunlandi
            </p>
          </div>
          <p className="font-mono text-sm font-extrabold text-gold">
            {fmt(actualKg)} / {fmt(plannedKg)} kg
          </p>
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-bg2"
          role="progressbar"
          aria-label="Yig‘im marshruti bajarilishi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress} foiz, ${acceptedStops.length} ta nuqta yakunlangan`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-green transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </GlassCard>

      {!isHistory && (
        <YandexRouteMap
          stops={route.stops}
          selectedStopId={selectedStopId}
          onSelectStop={setSelectedStopId}
        />
      )}

      {isHistory ? (
        <HistorySection stops={acceptedStops} />
      ) : (
        <PendingSection
          stops={pendingStops}
          onAccepted={handleAccepted}
          onShowOnMap={showStopOnMap}
        />
      )}
    </div>
  );
}

function PendingSection({
  stops,
  onAccepted,
  onShowOnMap,
}: {
  stops: Stop[];
  onAccepted: (stop: Stop, actualKg: number, quality: Quality) => Promise<void>;
  onShowOnMap: (stopId: string) => void;
}) {
  return (
    <section className="mt-7" aria-labelledby="pending-stops-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Marshrut davomida</p>
          <h2 id="pending-stops-title" className="mt-1 font-head text-xl font-extrabold tracking-[-0.03em] text-text">
            Kutilayotgan nuqtalar
          </h2>
        </div>
        <span className="rounded-full border border-orange/20 bg-orange/10 px-3 py-1.5 text-xs font-bold text-[#A45D12]">
          {stops.length} ta qoldi
        </span>
      </div>

      {stops.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="check"
            title="Barcha nuqtalar yakunlandi"
            text="Bugungi marshrutda qabul qilinishi kutilayotgan nuqta qolmadi. Natijalarni “Qabul holati” bo‘limida ko‘rishingiz mumkin."
          />
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {stops.map((stop, index) => (
            <StopAcceptCard
              key={stop.id}
              stop={stop}
              isNext={index === 0}
              onAccepted={onAccepted}
              onShowOnMap={onShowOnMap}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StopAcceptCard({
  stop,
  isNext,
  onAccepted,
  onShowOnMap,
}: {
  stop: Stop;
  isNext: boolean;
  onAccepted: (stop: Stop, actualKg: number, quality: Quality) => Promise<void>;
  onShowOnMap: (stopId: string) => void;
}) {
  const [actualKg, setActualKg] = useState(String(stop.planned_kg));
  const [quality, setQuality] = useState<Quality>("A");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const inputId = `stop-actual-${stop.id}`;
  const qualityLegendId = `stop-quality-${stop.id}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const value = Number(actualKg);
    if (actualKg.trim() === "" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      setFormError("Fakt miqdorni 0 yoki undan katta butun son sifatida kiriting.");
      return;
    }

    setSubmitting(true);
    try {
      await collector.acceptStop(stop.id, value, quality);
      await onAccepted(stop, value, quality);
    } catch (requestError: unknown) {
      setFormError(errorText(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={`surface-card overflow-hidden ${isNext ? "border-gold/30 shadow-[0_16px_45px_rgba(23,92,58,.1)]" : ""}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.72fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-mono text-sm font-extrabold ${isNext ? "bg-gold text-white" : "bg-bg2 text-muted"}`}>
              {stop.seq}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-head text-lg font-extrabold tracking-[-0.025em] text-text">
                  {stop.farmer_name || "Nomsiz dehqon"}
                </h3>
                {isNext && (
                  <span className="rounded-full bg-accent/50 px-2.5 py-1 text-[11px] font-extrabold text-gold2">
                    Keyingi nuqta
                  </span>
                )}
                <Badge status={stop.status} />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
                <Icon name="route" className="h-4 w-4 shrink-0 text-gold" />
                {stop.village || "Manzil ko‘rsatilmagan"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-bg/55 p-4">
              <p className="text-xs font-bold text-muted">Rejadagi hajm</p>
              <p className="mt-1.5 font-head text-2xl font-extrabold tracking-[-0.035em] text-text">
                {fmt(stop.planned_kg)} <span className="text-sm font-bold text-muted">kg</span>
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-bg/55 p-4">
              <p className="text-xs font-bold text-muted">Mahsulotlar</p>
              <p className="mt-1.5 text-sm font-bold leading-6 text-text">
                {stop.products.length ? stop.products.join(", ") : "Ko‘rsatilmagan"}
              </p>
            </div>
          </div>
          {isValidGeoCoordinates(stop.geo_lat, stop.geo_lng) && (
            <OutlineButton
              onClick={() => onShowOnMap(stop.id)}
              icon="route"
              className="mt-4 w-full sm:w-auto"
            >
              Xaritada ko‘rish
            </OutlineButton>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-line bg-bg/55 p-5 sm:p-6 lg:border-l lg:border-t-0" noValidate>
          <h4 className="font-head text-base font-extrabold text-text">Fakt qabul</h4>
          <p className="mt-1 text-xs leading-5 text-muted">O‘lchangan miqdor va mahsulot sifatini tasdiqlang.</p>

          <label htmlFor={inputId} className="mt-5 block text-sm font-bold text-text">
            Fakt miqdor
          </label>
          <div className="relative mt-2">
            <input
              id={inputId}
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={actualKg}
              onChange={(event) => setActualKg(event.target.value)}
              className="field pr-12 font-mono text-lg font-extrabold"
              aria-describedby={`${inputId}-hint${formError ? ` ${inputId}-error` : ""}`}
              aria-invalid={Boolean(formError)}
              disabled={submitting}
            />
            <span className="pointer-events-none absolute right-4 top-3 text-sm font-bold text-muted">kg</span>
          </div>
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
            Reja: {fmt(stop.planned_kg)} kg
          </p>

          <fieldset className="mt-4" disabled={submitting} aria-labelledby={qualityLegendId}>
            <legend id={qualityLegendId} className="text-sm font-bold text-text">Mahsulot sifati</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((option) => {
                const active = quality === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setQuality(option.value)}
                    aria-pressed={active}
                    className={`min-h-14 rounded-2xl border px-2 py-2 text-center transition ${active ? "border-gold bg-gold text-white" : "border-line bg-white text-muted hover:border-gold/30 hover:text-text"}`}
                  >
                    <span className="block font-mono text-base font-extrabold">{option.label}</span>
                    <span className={`mt-0.5 block text-[10px] ${active ? "text-white/70" : "text-dim"}`}>{option.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {formError && (
            <p id={`${inputId}-error`} role="alert" className="mt-3 text-xs font-semibold leading-5 text-red">
              {formError}
            </p>
          )}
          <GoldButton
            type="submit"
            loading={submitting}
            icon="check"
            className="mt-4 w-full"
          >
            Qabulni tasdiqlash
          </GoldButton>
        </form>
      </div>
    </article>
  );
}

function HistorySection({ stops }: { stops: Stop[] }) {
  return (
    <section className="mt-7" aria-labelledby="accepted-stops-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Bugungi natijalar</p>
          <h2 id="accepted-stops-title" className="mt-1 font-head text-xl font-extrabold tracking-[-0.03em] text-text">
            Qabul qilingan nuqtalar
          </h2>
        </div>
        <span className="rounded-full border border-green/20 bg-green/10 px-3 py-1.5 text-xs font-bold text-green">
          {stops.length} ta yakunlandi
        </span>
      </div>

      {stops.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="clock"
            title="Hali qabul yakunlanmagan"
            text="Nuqtadagi fakt miqdor va sifat tasdiqlangach natija shu bo‘limga qo‘shiladi."
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {stops.map((stop) => (
            <AcceptedStopCard key={stop.id} stop={stop} />
          ))}
        </div>
      )}
    </section>
  );
}

function AcceptedStopCard({ stop }: { stop: Stop }) {
  const quality = stop.quality as Quality | null;
  const qualityTone = quality === "A"
    ? "bg-green/10 text-green"
    : quality === "B"
      ? "bg-orange/15 text-[#A45D12]"
      : quality === "C"
        ? "bg-red/10 text-red"
        : "bg-bg2 text-muted";
  const qualityLabel = QUALITY_OPTIONS.find((option) => option.value === quality)?.description || "Ko‘rsatilmagan";

  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green/10 text-green">
          <Icon name="check" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-head text-lg font-extrabold tracking-[-0.025em] text-text">
              {stop.seq}. {stop.farmer_name || "Nomsiz dehqon"}
            </h3>
            <Badge status={stop.status} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Icon name="route" className="h-4 w-4 shrink-0 text-gold" />
            {stop.village || "Manzil ko‘rsatilmagan"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-bg/60 p-4">
          <p className="text-xs font-bold text-muted">Fakt / reja</p>
          <p className="mt-1.5 font-head text-xl font-extrabold text-text">
            {fmt(stop.actual_kg || 0)} <span className="text-xs text-muted">/ {fmt(stop.planned_kg)} kg</span>
          </p>
        </div>
        <div className={`rounded-2xl p-4 ${qualityTone}`}>
          <p className="text-xs font-bold opacity-70">Sifat</p>
          <p className="mt-1.5 font-head text-xl font-extrabold">
            {quality || "—"} <span className="text-xs font-bold opacity-70">· {qualityLabel}</span>
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
        <Icon name="box" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        {stop.products.length ? stop.products.join(", ") : "Mahsulot nomi ko‘rsatilmagan"}
      </p>
    </article>
  );
}
