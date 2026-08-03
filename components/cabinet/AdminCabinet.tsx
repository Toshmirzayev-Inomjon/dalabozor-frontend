"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
import {
  adminApi,
  ROLE_LABELS,
  ROLE_ORDER,
  type AdminDashboard,
  type AdminOffer,
  type AdminRoutesDetail,
  type AdminUser,
  type CorridorToday,
  type ReviewAction,
  type Role,
  type RunResult,
} from "@/lib/admin-api";
import { fmt } from "@/lib/api";

type Notice = { tone: "success" | "error"; text: string };
type CorridorDraft = { min: string; max: string };
type CallOfferDraft = {
  farmerPhone: string;
  productId: string;
  date: string;
  kg: string;
  price: string;
};

const inputClass = "field text-sm disabled:cursor-not-allowed disabled:bg-bg2 disabled:opacity-70";

const sectionTitleClass =
  "font-head text-xl font-extrabold tracking-[-0.03em] text-text";

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kutilmagan xatolik yuz berdi";
}

function routeStatus(status: string): string {
  const labels: Record<string, string> = {
    planned: "Rejalashtirilgan",
    active: "Jarayonda",
    done: "Yakunlangan",
  };
  return labels[status] ?? status;
}

function roleTone(role: string): string {
  switch (role) {
    case "admin":
      return "border-red/30 bg-red/10 text-red";
    case "collector":
      return "border-orange/40 bg-orange/10 text-orange";
    case "restaurant":
      return "border-gold/25 bg-gold/10 text-gold";
    default:
      return "border-green/30 bg-green/10 text-green";
  }
}

export function AdminCabinet() {
  const initialDate = useRef(localDate()).current;
  const requestId = useRef(0);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [corridor, setCorridor] = useState<CorridorToday | null>(null);
  const [routes, setRoutes] = useState<RunResult<AdminRoutesDetail> | null>(null);
  const [callOffers, setCallOffers] = useState<AdminOffer[]>([]);
  const [corridorDrafts, setCorridorDrafts] = useState<
    Record<string, CorridorDraft>
  >({});
  const [callDraft, setCallDraft] = useState<CallOfferDraft>({
    farmerPhone: "+998",
    productId: "",
    date: initialDate,
    kg: "100",
    price: "",
  });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<Role | "">("");
  const [userQuery, setUserQuery] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const list = await adminApi.users(userRoleFilter || undefined, userQuery.trim());
      setUsers(list);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error) });
    }
  }, [userRoleFilter, userQuery]);

  useEffect(() => {
    const timer = setTimeout(() => void loadUsers(), 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setPageError("");

    const [dashboardResult, corridorResult, routesResult, callsResult] =
      await Promise.allSettled([
        adminApi.dashboard(),
        adminApi.corridor(selectedDate),
        adminApi.routes(selectedDate),
        adminApi.callOffers(),
      ]);

    if (currentRequest !== requestId.current) return;

    const errors: string[] = [];
    if (dashboardResult.status === "fulfilled") {
      setDashboard(dashboardResult.value);
    } else {
      errors.push(errorText(dashboardResult.reason));
    }

    if (corridorResult.status === "fulfilled") {
      const nextCorridor = corridorResult.value;
      setCorridor(nextCorridor);
      setCorridorDrafts(
        Object.fromEntries(
          nextCorridor.products.map((product) => [
            product.product_id,
            {
              min: product.min_price?.toString() ?? "",
              max: product.max_price?.toString() ?? "",
            },
          ]),
        ),
      );
      setCallDraft((current) => {
        const productStillExists = nextCorridor.products.some(
          (product) => product.product_id === current.productId,
        );
        return {
          ...current,
          productId: productStillExists
            ? current.productId
            : (nextCorridor.products[0]?.product_id ?? ""),
        };
      });
    } else {
      errors.push(errorText(corridorResult.reason));
    }

    if (routesResult.status === "fulfilled") {
      setRoutes(routesResult.value);
    } else {
      errors.push(errorText(routesResult.reason));
    }

    if (callsResult.status === "fulfilled") {
      setCallOffers(callsResult.value);
    } else {
      errors.push(errorText(callsResult.reason));
    }

    setPageError(errors[0] ?? "");
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeDate(date: string) {
    setSelectedDate(date);
    setCallDraft((current) => ({ ...current, date }));
    setNotice(null);
  }

  function updateCorridorDraft(
    productId: string,
    field: keyof CorridorDraft,
    value: string,
  ) {
    setCorridorDrafts((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] ?? { min: "", max: "" }),
        [field]: value,
      },
    }));
  }

  async function saveCorridor(productId: string, productName: string) {
    const draft = corridorDrafts[productId];
    const minPrice = Number(draft?.min);
    const maxPrice = Number(draft?.max);

    if (
      !draft ||
      draft.min.trim() === "" ||
      draft.max.trim() === "" ||
      !Number.isInteger(minPrice) ||
      !Number.isInteger(maxPrice) ||
      minPrice < 0 ||
      maxPrice < 0
    ) {
      setNotice({ tone: "error", text: "Narxlarni musbat butun son bilan kiriting." });
      return;
    }
    if (minPrice > maxPrice) {
      setNotice({ tone: "error", text: "Minimal narx maksimal narxdan katta bo‘la olmaydi." });
      return;
    }

    const actionKey = `corridor:${productId}`;
    setBusyAction(actionKey);
    setNotice(null);
    try {
      await adminApi.setCorridor(productId, {
        date: selectedDate,
        min_price: minPrice,
        max_price: maxPrice,
      });
      setNotice({ tone: "success", text: `${productName} narx koridori saqlandi.` });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function reviewOffer(offer: AdminOffer, action: ReviewAction) {
    const actionKey = `review:${offer.id}:${action}`;
    setBusyAction(actionKey);
    setNotice(null);
    try {
      await adminApi.reviewOffer(offer.id, action);
      setNotice({
        tone: "success",
        text:
          action === "approve"
            ? `${offer.product_name} e’loni tasdiqlandi.`
            : `${offer.product_name} e’loni rad etildi.`,
      });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function submitCallOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const kg = Number(callDraft.kg);
    const price = Number(callDraft.price);
    const phone = callDraft.farmerPhone.trim();

    if (phone.length < 7 || !callDraft.productId || !callDraft.date) {
      setNotice({ tone: "error", text: "Telefon, mahsulot va sanani to‘liq kiriting." });
      return;
    }
    if (!Number.isInteger(kg) || kg <= 0 || !Number.isInteger(price) || price <= 0) {
      setNotice({ tone: "error", text: "Miqdor va narx musbat butun son bo‘lishi kerak." });
      return;
    }

    setBusyAction("call-offer");
    setNotice(null);
    try {
      const result = await adminApi.createCallOffer({
        farmer_phone: phone,
        product_id: callDraft.productId,
        date: callDraft.date,
        kg,
        price_per_kg: price,
      });
      setNotice({
        tone: "success",
        text: `Qo‘ng‘iroq e’loni yaratildi: ${result.detail.status}.`,
      });
      setCallDraft((current) => ({
        ...current,
        farmerPhone: "+998",
        kg: "100",
        price: "",
      }));
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function runAllocation() {
    if (!window.confirm(`${selectedDate} sanasi uchun taqsimotni ishga tushirasizmi?`)) {
      return;
    }
    setBusyAction("allocation");
    setNotice(null);
    try {
      const result = await adminApi.runAllocation(selectedDate);
      const { orders, allocated_kg: allocatedKg, stops } = result.detail;
      setNotice({
        tone: "success",
        text: `Taqsimot tayyor: ${orders} buyurtma, ${fmt(allocatedKg)} kg, ${stops} ta bekat.`,
      });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function runPayouts() {
    if (!window.confirm(`${selectedDate} sanasi uchun to‘lovlarni ishga tushirasizmi?`)) {
      return;
    }
    setBusyAction("payouts");
    setNotice(null);
    try {
      const result = await adminApi.runPayouts(selectedDate);
      const { payouts, total_paid: totalPaid } = result.detail;
      setNotice({
        tone: "success",
        text: `To‘lov yakunlandi: ${payouts} ta, jami ${fmt(totalPaid)} so‘m.`,
      });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function assignUserRole(userId: string, role: Role) {
    const actionKey = `user-add:${userId}:${role}`;
    setBusyAction(actionKey);
    setNotice(null);
    try {
      await adminApi.assignRole(userId, role);
      setNotice({
        tone: "success",
        text: `${ROLE_LABELS[role]} roli biriktirildi.`,
      });
      await loadUsers();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeUserRole(userId: string, role: Role) {
    const actionKey = `user-remove:${userId}:${role}`;
    setBusyAction(actionKey);
    setNotice(null);
    try {
      await adminApi.removeRole(userId, role);
      setNotice({
        tone: "success",
        text: `${ROLE_LABELS[role]} roli olib tashlandi.`,
      });
      await loadUsers();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: errorText(error) });
    } finally {
      setBusyAction(null);
    }
  }

  const reviewOffers = corridor?.review_offers ?? [];
  const products = corridor?.products ?? [];
  const routeRows = routes?.detail.routes ?? [];
  const isBusy = busyAction !== null;

  if (loading && !dashboard && !corridor && !routes) {
    return <PageLoader label="Admin ma’lumotlari yuklanmoqda…" />;
  }

  const refreshAction = (
    <OutlineButton
      type="button"
      onClick={() => void load()}
      loading={loading}
      disabled={isBusy}
      icon="refresh"
      className="w-full sm:w-auto"
    >
      Yangilash
    </OutlineButton>
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Boshqaruv markazi"
        title="Admin panel"
        text="Savdo, narxlar va kunlik operatsiyalarni yagona ish oynasidan boshqaring."
        action={refreshAction}
      />

      {pageError && (
        <InlineAlert>
          Ayrim ma’lumotlar yuklanmadi: {pageError}
        </InlineAlert>
      )}
      {notice && (
        <InlineAlert tone={notice.tone}>
          {notice.text}
        </InlineAlert>
      )}

      <section aria-labelledby="admin-dashboard-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="admin-dashboard-title" className={sectionTitleClass}>
            Bugungi ko‘rsatkichlar
          </h2>
          <span className="rounded-full border border-line bg-white px-3 py-1.5 font-mono text-xs text-muted">
            {dashboard?.date ?? "—"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Savdo"
            value={dashboard ? `${fmt(dashboard.revenue)} so‘m` : "—"}
            icon="chart"
            tone="brand"
          />
          <MetricCard
            label="Sof marja"
            value={dashboard ? `${fmt(dashboard.margin)} so‘m` : "—"}
            icon="wallet"
            tone="lime"
          />
          <MetricCard
            label="Yig‘im rejasi"
            value={dashboard ? `${fmt(dashboard.collect_kg)} kg` : "—"}
            icon="truck"
            tone="orange"
          />
          <MetricCard
            label="Faol buyurtma"
            value={dashboard ? fmt(dashboard.active_orders) : "—"}
            icon="box"
            tone="blue"
          />
        </div>
      </section>

      <GlassCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className={sectionTitleClass}>Kunlik operatsiyalar</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Marshrut, taqsimot va dehqon to‘lovlari tanlangan sana bo‘yicha ishlaydi.
            </p>
          </div>
          <label className="w-full text-sm font-bold text-text sm:w-56">
            Operatsiya sanasi
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => changeDate(event.target.value)}
              disabled={isBusy}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void runAllocation()}
            disabled={isBusy}
            className="rounded-2xl border border-gold/15 bg-bg/60 px-4 py-3 text-left transition hover:border-gold/30 hover:bg-white disabled:opacity-50"
          >
            <span className="block font-semibold text-gold">
              {busyAction === "allocation" ? "Taqsimlanmoqda…" : "Taqsimotni ishga tushirish"}
            </span>
            <span className="mt-1 block text-xs text-muted">Buyurtmalarni e’lonlarga biriktiradi.</span>
          </button>
          <button
            type="button"
            onClick={() => void runPayouts()}
            disabled={isBusy}
            className="rounded-2xl border border-green/20 bg-green/10 px-4 py-3 text-left transition hover:border-green/35 hover:bg-white disabled:opacity-50"
          >
            <span className="block font-semibold text-green">
              {busyAction === "payouts" ? "To‘lanmoqda…" : "To‘lovlarni ishga tushirish"}
            </span>
            <span className="mt-1 block text-xs text-muted">Qabul qilingan hajmlar uchun payout yaratadi.</span>
          </button>
        </div>
      </GlassCard>

      <section aria-labelledby="routes-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="routes-title" className={sectionTitleClass}>
            Marshrutlar
          </h2>
          <span className="text-xs text-muted">{routes?.detail.date ?? selectedDate}</span>
        </div>
        {routeRows.length === 0 ? (
          <EmptyState
            icon="route"
            title="Marshrut hali yaratilmagan"
            text="Tanlangan sana uchun taqsimotni ishga tushirgach marshrut shu yerda ko‘rinadi."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {routeRows.map((route) => {
              const progress = route.planned_kg
                ? Math.min(100, (route.actual_kg / route.planned_kg) * 100)
                : 0;
              return (
                <GlassCard key={route.route_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-text">{routeStatus(route.status)}</div>
                      <div className="mt-1 font-mono text-xs text-dim">
                        {route.route_id.slice(0, 8)} · {route.stops} ta bekat
                      </div>
                    </div>
                    <span className="rounded-full border border-line bg-bg/60 px-2.5 py-1 text-xs font-semibold text-muted">
                      {route.collector_id ? "Yig‘uvchi biriktirilgan" : "Yig‘uvchi yo‘q"}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span className="text-muted">Yig‘ildi / reja</span>
                    <span className="font-mono">
                      {fmt(route.actual_kg)} / {fmt(route.planned_kg)} kg
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-green transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="corridor-title">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="corridor-title" className={sectionTitleClass}>
              Narx koridori
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">Har mahsulot uchun qabul qilinadigan narx chegarasi.</p>
          </div>
          <span className="font-mono text-xs text-muted">{corridor?.date ?? selectedDate}</span>
        </div>
        {products.length === 0 ? (
          <EmptyState
            icon="leaf"
            title="Mahsulotlar topilmadi"
            text="Mahsulotlar bazaga qo‘shilgach narx koridorini boshqarish mumkin bo‘ladi."
          />
        ) : (
          <div className="surface-card overflow-hidden">
            <div className="hidden grid-cols-[minmax(150px,1fr)_140px_140px_110px_110px] gap-3 border-b border-line bg-bg/60 px-5 py-3 text-xs font-semibold text-muted lg:grid">
              <span>Mahsulot</span>
              <span>Minimum</span>
              <span>Maksimum</span>
              <span>E’lonlar</span>
              <span />
            </div>
            <div className="divide-y divide-line">
              {products.map((product) => {
                const draft = corridorDrafts[product.product_id] ?? { min: "", max: "" };
                const actionKey = `corridor:${product.product_id}`;
                return (
                  <div
                    key={product.product_id}
                    className="grid gap-3 bg-white px-5 py-4 lg:grid-cols-[minmax(150px,1fr)_140px_140px_110px_110px] lg:items-center"
                  >
                    <div>
                      <div className="font-bold text-text">{product.name_uz}</div>
                      <div className="mt-1 text-xs text-muted lg:hidden">
                        {product.offers_total} e’lon · {product.needs_review} tekshiruvda
                      </div>
                    </div>
                    <label className="text-xs text-muted lg:text-transparent">
                      Minimum
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.min}
                        onChange={(event) =>
                          updateCorridorDraft(product.product_id, "min", event.target.value)
                        }
                        disabled={isBusy}
                        placeholder="Min narx"
                        className={`${inputClass} mt-1 lg:mt-0 lg:text-text`}
                      />
                    </label>
                    <label className="text-xs text-muted lg:text-transparent">
                      Maksimum
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.max}
                        onChange={(event) =>
                          updateCorridorDraft(product.product_id, "max", event.target.value)
                        }
                        disabled={isBusy}
                        placeholder="Maks narx"
                        className={`${inputClass} mt-1 lg:mt-0 lg:text-text`}
                      />
                    </label>
                    <div className="hidden text-sm lg:block">
                      <div>{product.offers_total} ta</div>
                      <div className={product.needs_review ? "text-gold" : "text-muted"}>
                        {product.needs_review} tekshiruvda
                      </div>
                    </div>
                    <OutlineButton
                      onClick={() => void saveCorridor(product.product_id, product.name_uz)}
                      disabled={isBusy && busyAction !== actionKey}
                      loading={busyAction === actionKey}
                      className="w-full px-3 py-2 text-xs"
                    >
                      Saqlash
                    </OutlineButton>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="reviews-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="reviews-title" className={sectionTitleClass}>
            Tekshiruvdagi e’lonlar
          </h2>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold">
            {reviewOffers.length} ta
          </span>
        </div>
        {reviewOffers.length === 0 ? (
          <EmptyState
            icon="check"
            title="Barcha e’lonlar ko‘rib chiqilgan"
            text="Hozir operator tasdig‘ini kutayotgan e’lon yo‘q."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviewOffers.map((offer) => (
              <GlassCard key={offer.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-text">{offer.product_name}</div>
                    <div className="mt-1 text-sm text-muted">
                      {offer.farmer_name || "Nomsiz dehqon"}
                    </div>
                  </div>
                  <Badge status={offer.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-bg/60 p-3 text-sm">
                  <div>
                    <div className="text-xs text-muted">Miqdor</div>
                    <div className="mt-1 font-mono">{fmt(offer.kg)} kg</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Taklif narxi</div>
                    <div className="mt-1 font-mono text-gold">{fmt(offer.price_per_kg)} so‘m</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void reviewOffer(offer, "reject")}
                    disabled={isBusy}
                    className="rounded-xl border border-red/30 px-3 py-2 text-sm text-red transition hover:bg-red/10 disabled:opacity-50"
                  >
                    {busyAction === `review:${offer.id}:reject` ? "…" : "Rad etish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reviewOffer(offer, "approve")}
                    disabled={isBusy}
                    className="rounded-xl border border-green/30 bg-green/10 px-3 py-2 text-sm text-green transition hover:border-green/60 disabled:opacity-50"
                  >
                    {busyAction === `review:${offer.id}:approve` ? "…" : "Tasdiqlash"}
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlassCard>
          <h2 className={sectionTitleClass}>Qo‘ng‘iroqdan e’lon kiritish</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Operator dehqon nomidan e’lon yaratadi va tasdiq SMS yuboriladi.
          </p>
          <form onSubmit={submitCallOffer} className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-text">
              Dehqon telefoni
              <input
                type="tel"
                value={callDraft.farmerPhone}
                onChange={(event) =>
                  setCallDraft((current) => ({
                    ...current,
                    farmerPhone: event.target.value,
                  }))
                }
                disabled={isBusy}
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                className={`${inputClass} mt-1`}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-text">
                Mahsulot
                <select
                  value={callDraft.productId}
                  onChange={(event) =>
                    setCallDraft((current) => ({
                      ...current,
                      productId: event.target.value,
                    }))
                  }
                  disabled={isBusy || products.length === 0}
                  className={`${inputClass} mt-1`}
                >
                  {products.length === 0 && <option value="">Mahsulot yo‘q</option>}
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name_uz}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-text">
                E’lon sanasi
                <input
                  type="date"
                  value={callDraft.date}
                  onChange={(event) =>
                    setCallDraft((current) => ({ ...current, date: event.target.value }))
                  }
                  disabled={isBusy}
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-text">
                Miqdor (kg)
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={callDraft.kg}
                  onChange={(event) =>
                    setCallDraft((current) => ({ ...current, kg: event.target.value }))
                  }
                  disabled={isBusy}
                  className={`${inputClass} mt-1 font-mono`}
                />
              </label>
              <label className="block text-sm font-bold text-text">
                Narx (so‘m/kg)
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={callDraft.price}
                  onChange={(event) =>
                    setCallDraft((current) => ({ ...current, price: event.target.value }))
                  }
                  disabled={isBusy}
                  placeholder="5 000"
                  className={`${inputClass} mt-1 font-mono`}
                />
              </label>
            </div>
            <GoldButton
              type="submit"
              disabled={isBusy || products.length === 0}
              loading={busyAction === "call-offer"}
              icon="plus"
              className="w-full"
            >
              E’lonni yaratish
            </GoldButton>
          </form>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitleClass}>Qo‘ng‘iroq e’lonlari</h2>
              <p className="mt-1 text-sm leading-6 text-muted">So‘nggi 100 ta operator e’loni.</p>
            </div>
            <span className="font-mono text-sm text-gold">{callOffers.length}</span>
          </div>
          {callOffers.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon="phone"
                title="Qo‘ng‘iroq e’lonlari yo‘q"
                text="Operator kiritgan yangi e’lonlar shu ro‘yxatda ko‘rinadi."
              />
            </div>
          ) : (
            <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {callOffers.map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-line bg-bg/50 px-3 py-3 transition hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-text">
                        {offer.product_name} · {offer.farmer_name || "Nomsiz dehqon"}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted">
                        {fmt(offer.kg)} kg · {fmt(offer.price_per_kg)} so‘m/kg
                      </div>
                    </div>
                    <Badge status={offer.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </section>

      <section aria-labelledby="users-title">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="users-title" className={sectionTitleClass}>
              Foydalanuvchilar va rollar
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Kirish huquqlarini boshqaring: rol biriktirish yoki olib tashlash orqali yig‘uvchi
              hamda adminlari faqat administrator tekshiruvi bilan uladi.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Telefon yoki ism bo‘yicha qidirish…"
              aria-label="Foydalanuvchi qidirish"
              className={`${inputClass} sm:w-60`}
            />
            <div className="flex gap-1 rounded-full border border-line bg-white p-1">
              {(["", ...ROLE_ORDER] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setUserRoleFilter(role)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    userRoleFilter === role
                      ? "bg-gold text-white"
                      : "text-muted hover:bg-bg2"
                  }`}
                >
                  {role === "" ? "Barchasi" : ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>
        {users.length === 0 ? (
          <EmptyState
            icon="user"
            title="Foydalanuvchilar topilmadi"
            text="Rol filtri yoki qidiruv so‘rovini o‘zgartiring."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {users.map((user) => {
              const availableRoles = ROLE_ORDER.filter((role) => !user.roles.includes(role));
              return (
                <GlassCard key={user.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-text">
                        {user.full_name || "Ism kiritilmagan"}
                      </div>
                      <div className="mt-0.5 font-mono text-sm text-muted">{user.phone}</div>
                      {user.region && <div className="mt-1 text-xs text-dim">{user.region}</div>}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-dim">
                      {user.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {user.roles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => void removeUserRole(user.id, role as Role)}
                        disabled={isBusy}
                        title={`${ROLE_LABELS[role as Role] ?? role} rolini olish`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${roleTone(role)}`}
                      >
                        {ROLE_LABELS[role as Role] ?? role}
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                    {availableRoles.length > 0 && (
                      <span className="inline-flex items-center gap-1 pl-1 text-xs text-muted">
                        <span aria-hidden="true">+</span>
                        <select
                          value=""
                          onChange={(event) => {
                            if (event.target.value) {
                              void assignUserRole(user.id, event.target.value as Role);
                            }
                          }}
                          disabled={isBusy}
                          aria-label="Rol biriktirish"
                          className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                        >
                          <option value="">Tanlash…</option>
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
