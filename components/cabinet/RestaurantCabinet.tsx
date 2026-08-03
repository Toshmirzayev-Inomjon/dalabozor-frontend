"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
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
  fmt,
  payments,
  restaurant,
  type CatalogItem,
  type Order,
  type OrderDetail,
} from "@/lib/api";
import { formatDate, tomorrow } from "@/lib/date";

const ORDER_FLOW = ["new", "allocated", "collecting", "in_transit", "delivered", "paid"];
const PAYMENT_LABEL: Record<string, string> = { cash: "Naqd", card: "Karta", credit: "Nasiya" };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kutilmagan xatolik yuz berdi.";
}

function orderProgress(status: string): number {
  const index = ORDER_FLOW.indexOf(status);
  return index < 0 ? 0 : ((index + 1) / ORDER_FLOW.length) * 100;
}

export function RestaurantCabinet({
  section = "overview",
  onNavigate = () => undefined,
}: {
  section?: string;
  onNavigate?: (section: string) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(tomorrow());
  const [deliverySlot, setDeliverySlot] = useState("06:00–08:00");
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "credit">("cash");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (silent = false, date = deliveryDate) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    const [catalogResult, ordersResult] = await Promise.allSettled([
      restaurant.catalog(date),
      restaurant.myOrders(),
    ]);
    const errors: string[] = [];
    if (catalogResult.status === "fulfilled") setCatalog(catalogResult.value);
    else errors.push(errorText(catalogResult.reason));
    if (ordersResult.status === "fulfilled") setOrders(ordersResult.value);
    else errors.push(errorText(ordersResult.reason));
    setError(errors[0] || "");
    setLoading(false);
    setRefreshing(false);
  }, [deliveryDate]);

  useEffect(() => {
    void load();
    // Dastlabki yuklashda tanlangan sana bir marta ishlatiladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uz");
    return query ? catalog.filter((item) => item.name_uz.toLocaleLowerCase("uz").includes(query)) : catalog;
  }, [catalog, search]);

  const cartItems = useMemo(
    () => catalog.filter((item) => (cart[item.product_id] || 0) > 0),
    [catalog, cart],
  );
  const totalKg = cartItems.reduce((sum, item) => sum + (cart[item.product_id] || 0), 0);
  const total = cartItems.reduce((sum, item) => sum + (cart[item.product_id] || 0) * item.sell_price, 0);
  const activeOrder = orders.find((order) => !["paid", "cancelled"].includes(order.status));
  const unpaidOrders = orders.filter((order) => !["paid", "cancelled"].includes(order.status));

  function setQty(item: CatalogItem, delta: number) {
    setCart((current) => {
      const limit = Math.max(0, item.available_kg);
      const next = Math.max(0, Math.min(limit, (current[item.product_id] || 0) + delta));
      const copy = { ...current };
      if (!next) delete copy[item.product_id];
      else copy[item.product_id] = next;
      return copy;
    });
  }

  async function changeDeliveryDate(date: string) {
    setDeliveryDate(date);
    setCart({});
    setBusy("catalog-date");
    setMessage(null);
    try {
      const items = await restaurant.catalog(date);
      setCatalog(items);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  async function checkout() {
    const items = Object.entries(cart).map(([product_id, kg]) => ({ product_id, kg }));
    if (!items.length) {
      setMessage({ tone: "error", text: "Savatga kamida bitta mahsulot qo‘shing." });
      return;
    }
    setBusy("checkout");
    setMessage(null);
    try {
      const order = await restaurant.createOrder(items, deliveryDate, paymentType, deliverySlot);
      setMessage({ tone: "success", text: `${fmt(order.total_sum)} so‘mlik buyurtma qabul qilindi.` });
      setCart({});
      await load(true);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  async function openOrder(id: string) {
    setBusy(`detail:${id}`);
    setMessage(null);
    try {
      setSelectedOrder(await restaurant.order(id));
      if (section !== "orders") onNavigate("orders");
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  async function reorder(id: string) {
    setBusy(`reorder:${id}`);
    setMessage(null);
    try {
      const result = await restaurant.reorder(id, tomorrow());
      setMessage({ tone: "success", text: `Buyurtma ${formatDate(result.delivery_date)} uchun takrorlandi.` });
      setSelectedOrder(null);
      await load(true);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  async function downloadInvoice(id: string) {
    setBusy(`invoice:${id}`);
    setMessage(null);
    try {
      const blob = await restaurant.invoice(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dalabozor-faktura-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  async function payOrder(order: Order) {
    setBusy(`pay:${order.id}`);
    setMessage(null);
    try {
      const result = await payments.payInvoice(order.id);
      setMessage({
        tone: result.status === "failed" ? "error" : "success",
        text: result.status === "failed"
          ? "To‘lov amalga oshmadi. Qayta urinib ko‘ring."
          : `${fmt(result.amount)} so‘m to‘lov ${result.status === "success" ? "muvaffaqiyatli" : "qabul qilindi"}.`,
      });
      await load(true);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <PageLoader label="Restoran ma’lumotlari yuklanmoqda…" />;

  const refreshAction = (
    <OutlineButton onClick={() => void load(true)} loading={refreshing} icon="refresh" className="w-full sm:w-auto">Yangilash</OutlineButton>
  );
  const alerts = (
    <>
      {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
      {message && <div className="mb-5"><InlineAlert tone={message.tone}>{message.text}</InlineAlert></div>}
    </>
  );

  if (section === "catalog") {
    return (
      <div>
        <SectionHeading eyebrow="Ertangi katalog" title="Yangi buyurtma" text="Daladan to‘g‘ridan-to‘g‘ri mavjud mahsulotlarni tanlang." action={refreshAction} />
        {alerts}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div>
            <div className="surface-card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_200px]">
              <label className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-dim" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="field pl-10" placeholder="Mahsulot qidirish…" />
              </label>
              <input type="date" min={tomorrow()} value={deliveryDate} onChange={(event) => void changeDeliveryDate(event.target.value)} className="field" aria-label="Yetkazish sanasi" />
            </div>

            {busy === "catalog-date" ? <PageLoader label="Katalog yangilanmoqda…" /> : filteredCatalog.length === 0 ? (
              <EmptyState icon="store" title="Bu sana uchun mahsulot topilmadi" text="Boshqa sanani tanlang yoki keyinroq qayta tekshiring." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCatalog.map((item) => {
                  const quantity = cart[item.product_id] || 0;
                  const soldOut = item.available_kg <= 0;
                  return (
                    <article key={item.product_id} className={`surface-card flex min-h-64 flex-col p-4 transition ${quantity ? "border-gold/35 ring-2 ring-gold/5" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-bg text-2xl">{item.emoji || "🌿"}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${soldOut ? "bg-red/10 text-red" : "bg-green/10 text-green"}`}>
                          {soldOut ? "Tugagan" : `${fmt(item.available_kg)} ${item.unit} mavjud`}
                        </span>
                      </div>
                      <h3 className="mt-4 font-head text-lg font-extrabold text-text">{item.name_uz}</h3>
                      <p className="mt-1 text-xs text-muted">{item.farmer_count} ta dehqondan</p>
                      <p className="mt-3 font-mono text-lg font-bold text-gold">{fmt(item.sell_price)} <span className="text-xs font-medium text-muted">so‘m/{item.unit}</span></p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <button onClick={() => setQty(item, -10)} disabled={!quantity} className="outline-btn h-10 w-10 px-0 text-lg disabled:opacity-35" aria-label={`${item.name_uz} miqdorini kamaytirish`}>−</button>
                        <span className="min-w-16 text-center font-mono text-sm font-bold text-text">{quantity} {item.unit}</span>
                        <button onClick={() => setQty(item, 10)} disabled={soldOut || quantity >= item.available_kg} className="gold-btn h-10 w-10 px-0 text-lg disabled:opacity-35" aria-label={`${item.name_uz} miqdorini oshirish`}>+</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="h-fit xl:sticky xl:top-8">
            <GlassCard>
              <div className="flex items-center justify-between"><h2 className="font-head text-lg font-extrabold text-text">Savat</h2><span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">{totalKg} kg</span></div>
              {cartItems.length ? (
                <div className="mt-4 divide-y divide-line">
                  {cartItems.map((item) => <div key={item.product_id} className="flex justify-between gap-3 py-3 text-sm first:pt-0"><div><p className="font-bold text-text">{item.name_uz}</p><p className="mt-0.5 text-xs text-muted">{cart[item.product_id]} {item.unit} × {fmt(item.sell_price)}</p></div><p className="font-mono font-bold text-text">{fmt(cart[item.product_id] * item.sell_price)}</p></div>)}
                </div>
              ) : <p className="mt-4 rounded-2xl bg-bg p-4 text-center text-sm text-muted">Mahsulot tanlanmagan.</p>}
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <div><label htmlFor="slot" className="text-xs font-bold text-muted">Yetkazish vaqti</label><select id="slot" value={deliverySlot} onChange={(event) => setDeliverySlot(event.target.value)} className="field mt-1.5 text-sm"><option>06:00–08:00</option><option>08:00–10:00</option><option>10:00–12:00</option></select></div>
                <div><span className="text-xs font-bold text-muted">To‘lov usuli</span><div className="mt-1.5 grid grid-cols-3 gap-1.5">{(["cash", "card", "credit"] as const).map((type) => <button key={type} onClick={() => setPaymentType(type)} className={`rounded-xl border px-2 py-2 text-xs font-bold ${paymentType === type ? "border-gold bg-gold/10 text-gold" : "border-line text-muted"}`}>{PAYMENT_LABEL[type]}</button>)}</div></div>
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-line pt-4"><div><p className="text-xs text-muted">Jami</p><p className="mt-1 font-head text-2xl font-extrabold text-text">{fmt(total)} <span className="text-sm">so‘m</span></p></div><span className="text-xs text-muted">{formatDate(deliveryDate)}</span></div>
              <GoldButton onClick={checkout} loading={busy === "checkout"} disabled={!cartItems.length} className="mt-4 w-full">Buyurtmani tasdiqlash</GoldButton>
            </GlassCard>
          </aside>
        </div>
      </div>
    );
  }

  if (section === "orders") {
    return (
      <div>
        <SectionHeading eyebrow="Buyurtmalar" title={selectedOrder ? "Buyurtma tafsiloti" : "Buyurtmalar tarixi"} text={selectedOrder ? `Buyurtma #${selectedOrder.id.slice(0, 8)}` : "Barcha buyurtmalar, holatlar va fakturalar."} action={selectedOrder ? <OutlineButton onClick={() => setSelectedOrder(null)}>← Orqaga</OutlineButton> : refreshAction} />
        {alerts}
        {selectedOrder ? (
          <OrderDetailView order={selectedOrder} busy={busy} onReorder={reorder} onInvoice={downloadInvoice} onPay={payOrder} />
        ) : orders.length === 0 ? (
          <EmptyState title="Hali buyurtma yo‘q" text="Katalogdan kerakli mahsulotlarni tanlab birinchi buyurtmani bering." action={<GoldButton onClick={() => onNavigate("catalog")} icon="store">Katalogni ochish</GoldButton>} />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button key={order.id} onClick={() => void openOrder(order.id)} className="surface-card grid w-full gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-card sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                <div className="flex min-w-0 gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg text-gold"><Icon name="box" className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-text">{formatDate(order.delivery_date, { day: "numeric", month: "long", year: "numeric" })}</h3><Badge status={order.status} /></div><p className="mt-1 truncate text-xs text-muted">{order.items.map((item) => `${item.product_name} ${item.kg} kg`).join(" · ")}</p></div></div>
                <div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-left sm:text-right"><p className="font-mono font-bold text-text">{fmt(order.total_sum)} so‘m</p><p className="mt-0.5 text-xs text-muted">{PAYMENT_LABEL[order.payment_type] || order.payment_type}</p></div>{busy === `detail:${order.id}` ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-r-transparent" /> : <Icon name="chevron" className="h-5 w-5 text-dim" />}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (section === "payments") {
    const unpaidTotal = unpaidOrders.reduce((sum, order) => sum + order.total_sum, 0);
    return (
      <div>
        <SectionHeading eyebrow="Hisob-kitob" title="Faktura va to‘lovlar" text="Ochiq hisoblarni ko‘ring, fakturani yuklab oling yoki karta bilan to‘lang." action={refreshAction} />
        {alerts}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Ochiq hisob" value={`${fmt(unpaidTotal)} so‘m`} note={`${unpaidOrders.length} ta buyurtma`} icon="wallet" />
          <MetricCard label="To‘langan" value={orders.filter((order) => order.status === "paid").length} note="Buyurtmalar soni" icon="check" tone="lime" />
          <MetricCard label="Jami buyurtma" value={orders.length} note="Butun davr" icon="box" tone="blue" />
        </div>
        <GlassCard className="mt-5">
          <h2 className="font-head text-lg font-extrabold text-text">Ochiq fakturalar</h2>
          {unpaidOrders.length ? <div className="mt-4 divide-y divide-line">{unpaidOrders.map((order) => <div key={order.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-text">{formatDate(order.delivery_date, { day: "numeric", month: "long" })}</p><Badge status={order.status} /></div><p className="mt-1 font-mono text-sm text-muted">#{order.id.slice(0, 8)} · {fmt(order.total_sum)} so‘m</p></div><div className="flex flex-wrap gap-2"><OutlineButton onClick={() => void downloadInvoice(order.id)} loading={busy === `invoice:${order.id}`} icon="download">PDF</OutlineButton><GoldButton onClick={() => void payOrder(order)} loading={busy === `pay:${order.id}`} icon="card">Karta bilan to‘lash</GoldButton></div></div>)}</div> : <div className="mt-4"><EmptyState icon="check" title="Ochiq hisob yo‘q" text="Barcha fakturalar yopilgan." /></div>}
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading eyebrow="Restoran kabineti" title="Bugungi holat" text="Faol buyurtmalar va tezkor amallar." action={refreshAction} />
      {alerts}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faol buyurtma" value={activeOrder ? "1 ta" : "Yo‘q"} note={activeOrder ? formatDate(activeOrder.delivery_date) : "Yangi buyurtma bering"} icon="truck" />
        <MetricCard label="Ochiq hisob" value={`${fmt(unpaidOrders.reduce((sum, order) => sum + order.total_sum, 0))} so‘m`} note={`${unpaidOrders.length} ta faktura`} icon="wallet" tone="orange" />
        <MetricCard label="Katalog" value={`${catalog.length} tur`} note={`${fmt(catalog.reduce((sum, item) => sum + item.available_kg, 0))} kg mavjud`} icon="store" tone="lime" />
        <MetricCard label="Jami buyurtma" value={orders.length} note="Butun davr" icon="box" tone="blue" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        {activeOrder ? (
          <button onClick={() => void openOrder(activeOrder.id)} className="noise-panel group rounded-3xl p-6 text-left text-white shadow-float sm:p-7">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-accent"><span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Faol buyurtma</span><Badge status={activeOrder.status} /></div>
            <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-sm text-white/55">Yetkazish: {formatDate(activeOrder.delivery_date)}</p><p className="mt-1 font-head text-3xl font-extrabold tracking-[-.04em]">{fmt(activeOrder.total_sum)} <span className="text-base text-white/55">so‘m</span></p></div><Icon name="arrow" className="h-6 w-6 text-accent transition group-hover:translate-x-1" /></div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${orderProgress(activeOrder.status)}%` }} /></div>
            <div className="mt-2 flex justify-between text-[10px] font-bold text-white/45"><span>Qabul qilindi</span><span>Yetkazildi</span></div>
          </button>
        ) : (
          <div className="noise-panel rounded-3xl p-7 text-white shadow-float"><Icon name="store" className="h-7 w-7 text-accent" /><h2 className="mt-5 font-head text-2xl font-extrabold">Yangi mahsulot kerakmi?</h2><p className="mt-2 text-sm leading-6 text-white/65">Ertangi katalogdan tanlang — tongda eshigingizgacha yetkazamiz.</p><button onClick={() => onNavigate("catalog")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-gold2">Katalogni ochish <Icon name="arrow" className="h-4 w-4" /></button></div>
        )}
        <GlassCard>
          <h2 className="font-head text-lg font-extrabold text-text">Tezkor amallar</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[{ key: "catalog", icon: "store", title: "Buyurtma", text: "Katalogdan tanlash" }, { key: "orders", icon: "box", title: "Tarix", text: "Barcha buyurtmalar" }, { key: "payments", icon: "wallet", title: "Fakturalar", text: "Hisob-kitoblar" }, { key: "profile", icon: "user", title: "Profil", text: "Manzil va karta" }].map((item) => <button key={item.key} onClick={() => onNavigate(item.key)} className="rounded-2xl border border-line bg-bg/60 p-4 text-left transition hover:border-gold/25 hover:bg-white"><Icon name={item.icon as "store"} className="h-5 w-5 text-gold" /><p className="mt-3 text-sm font-bold text-text">{item.title}</p><p className="mt-1 text-[11px] text-muted">{item.text}</p></button>)}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function OrderDetailView({
  order,
  busy,
  onReorder,
  onInvoice,
  onPay,
}: {
  order: OrderDetail;
  busy: string | null;
  onReorder: (id: string) => Promise<void>;
  onInvoice: (id: string) => Promise<void>;
  onPay: (order: Order) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <GlassCard>
          <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-start"><div><p className="text-sm text-muted">Yetkazish sanasi</p><p className="mt-1 font-head text-2xl font-extrabold text-text">{formatDate(order.delivery_date, { day: "numeric", month: "long", year: "numeric" })}</p><p className="mt-1 text-xs text-muted">{order.delivery_slot || "06:00–08:00"}</p></div><div className="sm:text-right"><Badge status={order.status} /><p className="mt-2 font-mono text-xl font-bold text-gold">{fmt(order.total_sum)} so‘m</p></div></div>
          <h3 className="mt-5 font-bold text-text">Mahsulotlar</h3>
          <div className="mt-3 divide-y divide-line">{order.items.map((item) => <div key={item.product_id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-text">{item.product_name}</p><p className="mt-0.5 text-xs text-muted">{item.kg} kg × {fmt(item.sell_price_per_kg)} so‘m</p></div><p className="font-mono text-sm font-bold text-text">{fmt(item.subtotal)} so‘m</p></div>)}</div>
        </GlassCard>
        <div className="flex flex-wrap gap-2"><OutlineButton onClick={() => void onInvoice(order.id)} loading={busy === `invoice:${order.id}`} icon="download">Fakturani yuklash</OutlineButton><OutlineButton onClick={() => void onReorder(order.id)} loading={busy === `reorder:${order.id}`} icon="refresh">Ertaga takrorlash</OutlineButton>{!["paid", "cancelled"].includes(order.status) && <GoldButton onClick={() => void onPay(order)} loading={busy === `pay:${order.id}`} icon="card">Karta bilan to‘lash</GoldButton>}</div>
      </div>
      <GlassCard>
        <h3 className="font-head text-lg font-extrabold text-text">Buyurtma holati</h3>
        <div className="mt-5 space-y-0">
          {order.timeline.map((step, index) => (
            <div key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {index < order.timeline.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px ${step.done ? "bg-green" : "bg-line"}`} />}
              <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${step.done ? "border-green bg-green text-white" : step.current ? "border-gold bg-gold/10 text-gold" : "border-line bg-white text-dim"}`}>
                {step.done ? <Icon name="check" className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <div className="pt-1"><p className={`text-sm font-bold ${step.current ? "text-gold" : step.done ? "text-text" : "text-muted"}`}>{step.label}</p>{step.current && <p className="mt-1 text-xs text-muted">Hozirgi bosqich</p>}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
