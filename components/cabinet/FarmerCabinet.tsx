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
import { farmer, fmt, type Balance, type Offer, type Price } from "@/lib/api";
import { formatDate, tomorrow } from "@/lib/date";

type Message = { tone: "success" | "error"; text: string };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kutilmagan xatolik yuz berdi.";
}

export function FarmerCabinet({
  section = "overview",
  onNavigate = () => undefined,
}: {
  section?: string;
  onNavigate?: (section: string) => void;
}) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [kg, setKg] = useState(100);
  const [price, setPrice] = useState(0);
  const [offerDate, setOfferDate] = useState(tomorrow());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const selected = prices.find((item) => item.product_id === selectedId) || null;

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    const [priceResult, offerResult, balanceResult] = await Promise.allSettled([
      farmer.prices(),
      farmer.myOffers(),
      farmer.balance(),
    ]);
    const errors: string[] = [];
    if (priceResult.status === "fulfilled") {
      setPrices(priceResult.value);
      setSelectedId((current) => current || priceResult.value[0]?.product_id || "");
      setPrice((current) => current || priceResult.value[0]?.buy_price || 0);
    } else errors.push(errorText(priceResult.reason));
    if (offerResult.status === "fulfilled") setOffers(offerResult.value);
    else errors.push(errorText(offerResult.reason));
    if (balanceResult.status === "fulfilled") setBalance(balanceResult.value);
    else errors.push(errorText(balanceResult.reason));
    setError(errors[0] || "");
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pickProduct(item: Price) {
    setSelectedId(item.product_id);
    setPrice(item.buy_price);
    setMessage(null);
  }

  async function submitOffer() {
    if (!selected) {
      setMessage({ tone: "error", text: "Avval mahsulotni tanlang." });
      return;
    }
    if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(price) || price <= 0) {
      setMessage({ tone: "error", text: "Miqdor va narx musbat son bo‘lishi kerak." });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const result = await farmer.createOffer({
        product_id: selected.product_id,
        date: offerDate,
        kg,
        price_per_kg: price,
      });
      setMessage({
        tone: "success",
        text: result.status === "auto_approved"
          ? `${selected.name_uz} taklifi avtomatik tasdiqlandi.`
          : `${selected.name_uz} taklifi operator tekshiruviga yuborildi.`,
      });
      await load(true);
    } catch (requestError: unknown) {
      setMessage({ tone: "error", text: errorText(requestError) });
    } finally {
      setSending(false);
    }
  }

  const filteredOffers = useMemo(
    () => statusFilter === "all" ? offers : offers.filter((offer) => offer.status === statusFilter),
    [offers, statusFilter],
  );

  if (loading) return <PageLoader label="Dehqon ma’lumotlari yuklanmoqda…" />;

  const refreshAction = (
    <OutlineButton onClick={() => void load(true)} loading={refreshing} icon="refresh" className="w-full sm:w-auto">
      Yangilash
    </OutlineButton>
  );

  if (section === "new-offer") {
    return (
      <div>
        <SectionHeading
          eyebrow="Yangi taklif"
          title="Ertaga uchun mahsulot bering"
          text="Mahsulot, miqdor va qabul narxini kiriting. Koridordagi takliflar darhol tasdiqlanadi."
        />
        {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
        {message && <div className="mb-5"><InlineAlert tone={message.tone}>{message.text}</InlineAlert></div>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          <GlassCard>
            <div>
              <label className="text-sm font-bold text-text">1. Mahsulotni tanlang</label>
              {prices.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {prices.map((item) => {
                    const active = selectedId === item.product_id;
                    return (
                      <button
                        key={item.product_id}
                        type="button"
                        onClick={() => pickProduct(item)}
                        className={`rounded-2xl border p-3 text-left transition ${active ? "border-gold bg-gold text-white" : "border-line bg-bg/60 hover:border-gold/30 hover:bg-white"}`}
                      >
                        <span className="text-2xl" aria-hidden="true">{item.emoji || "🌱"}</span>
                        <span className="mt-2 block text-sm font-bold">{item.name_uz}</span>
                        <span className={`mt-0.5 block text-[11px] ${active ? "text-white/70" : "text-muted"}`}>
                          {fmt(item.buy_price)} so‘m/{item.unit}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3"><EmptyState icon="leaf" title="Mahsulot narxlari hali ochilmagan" text="Operator narxlarni e’lon qilgach bu yerda ko‘rinadi." /></div>
              )}
            </div>

            <div className="my-6 h-px bg-line" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="offer-kg" className="text-sm font-bold text-text">2. Miqdor</label>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setKg((value) => Math.max(1, value - 10))} className="outline-btn h-12 w-12 shrink-0 px-0 text-lg" aria-label="10 kilogramm kamaytirish">−</button>
                  <div className="relative flex-1">
                    <input id="offer-kg" type="number" min="1" value={kg} onChange={(event) => setKg(Number(event.target.value))} className="field pr-10 text-center font-mono font-bold" />
                    <span className="pointer-events-none absolute right-3 top-3 text-sm text-muted">kg</span>
                  </div>
                  <button type="button" onClick={() => setKg((value) => value + 10)} className="outline-btn h-12 w-12 shrink-0 px-0 text-lg" aria-label="10 kilogramm qo‘shish">+</button>
                </div>
              </div>
              <div>
                <label htmlFor="offer-price" className="text-sm font-bold text-text">3. Bir kg narxi</label>
                <div className="relative mt-2">
                  <input id="offer-price" type="number" min="1" value={price} onChange={(event) => setPrice(Number(event.target.value))} className="field pr-16 font-mono font-bold" />
                  <span className="pointer-events-none absolute right-3 top-3 text-xs text-muted">so‘m</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="offer-date" className="text-sm font-bold text-text">Topshirish sanasi</label>
                <input id="offer-date" type="date" min={tomorrow()} value={offerDate} onChange={(event) => setOfferDate(event.target.value)} className="field mt-2" />
              </div>
            </div>

            <GoldButton onClick={submitOffer} loading={sending} disabled={!selected} icon="arrow" className="mt-6 w-full">
              Taklifni yuborish
            </GoldButton>
          </GlassCard>

          <div className="space-y-5">
            <div className="noise-panel overflow-hidden rounded-3xl p-6 text-white shadow-float">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-accent">Taxminiy tushum</p>
              <div className="mt-3 font-head text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">{fmt(Math.max(0, kg * price))} <span className="text-lg text-white/60">so‘m</span></div>
              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/65">
                <Icon name="calendar" className="h-4 w-4 text-accent" /> {formatDate(offerDate)} uchun
              </div>
            </div>
            <GlassCard>
              <h3 className="font-bold text-text">Qanday tasdiqlanadi?</h3>
              <div className="mt-4 space-y-4">
                {[
                  ["check", "Koridor ichidagi narx", "Taklif avtomatik qabul qilinadi."],
                  ["clock", "Koridordan tashqari narx", "Operator tekshiradi va javob beradi."],
                  ["truck", "Ertalabki yig‘im", "Tasdiqlangan mahsulot manzildan olinadi."],
                ].map(([icon, title, text]) => (
                  <div key={title} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Icon name={icon as "check"} className="h-4 w-4" /></span>
                    <div><p className="text-sm font-bold text-text">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted">{text}</p></div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (section === "offers") {
    const statuses = [
      ["all", "Barchasi"],
      ["auto_approved", "Qabul qilingan"],
      ["needs_review", "Tekshiruvda"],
      ["rejected", "Rad etilgan"],
    ];
    return (
      <div>
        <SectionHeading eyebrow="Takliflar" title="E’lonlarim" text="Yuborgan mahsulotlaringiz va ularning holatini kuzating." action={refreshAction} />
        {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {statuses.map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold ${statusFilter === key ? "border-gold bg-gold text-white" : "border-line bg-white text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
        <GlassCard>
          {filteredOffers.length === 0 ? (
            <EmptyState title="Bu holatda e’lon yo‘q" text="Yangi mahsulot taklifini bir necha qadamda yuborishingiz mumkin." action={<GoldButton onClick={() => onNavigate("new-offer")} icon="plus">Mahsulot berish</GoldButton>} />
          ) : (
            <div className="divide-y divide-line">
              {filteredOffers.map((offer) => (
                <article key={offer.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-bg text-lg">🌱</span>
                    <div>
                      <h3 className="font-bold text-text">{offer.product_name}</h3>
                      <p className="mt-1 text-xs text-muted">{formatDate(offer.date, { day: "numeric", month: "long", year: "numeric" })} · {fmt(offer.kg)} kg · {fmt(offer.price_per_kg)} so‘m/kg</p>
                      <p className="mt-1 text-xs font-bold text-green">{fmt(offer.estimated_income)} so‘m tushum</p>
                    </div>
                  </div>
                  <Badge status={offer.status} />
                </article>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  if (section === "payments") {
    return (
      <div>
        <SectionHeading eyebrow="Hisob-kitob" title="To‘lovlar" text="Topshirilgan hajm va rejalashtirilgan o‘tkazmalar." action={refreshAction} />
        {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Bu oy tushum" value={`${fmt(balance?.month_sum || 0)} so‘m`} note="Tasdiqlangan qabul bo‘yicha" icon="wallet" tone="brand" />
          <MetricCard label="Topshirilgan hajm" value={`${fmt(balance?.month_kg || 0)} kg`} note="Joriy oy" icon="box" tone="lime" />
          <MetricCard label="Dehqon reytingi" value={`★ ${(balance?.rating || 0).toFixed(1)}`} note="Qabul sifati asosida" icon="chart" tone="orange" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.75fr]">
          <GlassCard>
            <h3 className="font-head text-lg font-extrabold text-text">Oxirgi hisob-kitob</h3>
            <div className="mt-5 flex items-end justify-between border-b border-line pb-5">
              <div><p className="text-sm text-muted">Kartaga o‘tkazilgan</p><p className="mt-1 font-head text-3xl font-extrabold text-text">{balance?.last_payout ? `${fmt(balance.last_payout)} so‘m` : "—"}</p></div>
              <span className="rounded-full bg-green/10 px-3 py-1.5 text-xs font-bold text-green">Avtomatik</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">Qabul qilingan fakt miqdor bo‘yicha to‘lovlar har kuni 12:00 da hisoblanadi.</p>
          </GlassCard>
          <div className="noise-panel rounded-3xl p-6 text-white">
            <Icon name="clock" className="h-6 w-6 text-accent" />
            <h3 className="mt-5 font-head text-xl font-extrabold">Kunlik to‘lov sikli</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">05:30 da yig‘im boshlanadi, fakt miqdor tasdiqlanadi va 12:00 da to‘lov reestri yaratiladi.</p>
            <button onClick={() => onNavigate("profile")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Kartani boshqarish <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading eyebrow="Dehqon kabineti" title="Bugungi holat" text="Narxlar, takliflar va tushumingiz bir ekranda." action={refreshAction} />
      {error && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bu oy tushum" value={`${fmt(balance?.month_sum || 0)} so‘m`} note="Joriy oy" icon="wallet" />
        <MetricCard label="Topshirilgan" value={`${fmt(balance?.month_kg || 0)} kg`} note="Jami qabul" icon="box" tone="lime" />
        <MetricCard label="Faol takliflar" value={offers.filter((offer) => offer.status !== "rejected").length} note={`${offers.length} ta jami`} icon="leaf" tone="orange" />
        <MetricCard label="Reyting" value={`★ ${(balance?.rating || 0).toFixed(1)}`} note="Sifat ko‘rsatkichi" icon="chart" tone="blue" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-head text-lg font-extrabold text-text">Bugungi qabul narxlari</h2><p className="mt-1 text-xs text-muted">Operator tasdiqlagan so‘nggi narxlar</p></div>
            <button onClick={() => onNavigate("new-offer")} className="hidden items-center gap-1.5 text-sm font-bold text-gold sm:inline-flex">Mahsulot berish <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
          {prices.length ? (
            <div className="mt-4 divide-y divide-line">
              {prices.slice(0, 6).map((item) => (
                <div key={item.product_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-bg text-lg">{item.emoji || "🌱"}</span><div><p className="text-sm font-bold text-text">{item.name_uz}</p><p className="text-[11px] text-muted">1 {item.unit}</p></div></div>
                  <div className="text-right"><p className="font-mono text-sm font-bold text-text">{fmt(item.buy_price)} so‘m</p>{item.change_pct !== null && <p className={`text-[11px] font-bold ${item.change_pct >= 0 ? "text-green" : "text-red"}`}>{item.change_pct >= 0 ? "↑" : "↓"} {Math.abs(item.change_pct)}%</p>}</div>
                </div>
              ))}
            </div>
          ) : <div className="mt-4"><EmptyState title="Narxlar kiritilmagan" /></div>}
        </GlassCard>

        <div className="space-y-5">
          <div className="noise-panel rounded-3xl p-6 text-white shadow-float">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-accent"><Icon name="plus" className="h-5 w-5" /></span>
            <h2 className="mt-5 font-head text-xl font-extrabold">Ertaga nima topshirasiz?</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Taklifni bugun kiriting, ertalab yig‘uvchi manzilingizdan olib ketadi.</p>
            <button onClick={() => onNavigate("new-offer")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-gold2">Yangi taklif <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
          <GlassCard>
            <div className="flex items-center justify-between"><h2 className="font-bold text-text">So‘nggi e’lonlar</h2><button onClick={() => onNavigate("offers")} className="text-xs font-bold text-gold">Barchasi</button></div>
            {offers.length ? <div className="mt-3 space-y-3">{offers.slice(0, 3).map((offer) => <div key={offer.id} className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-text">{offer.product_name} · {fmt(offer.kg)} kg</p><p className="text-[11px] text-muted">{formatDate(offer.date)}</p></div><Badge status={offer.status} /></div>)}</div> : <p className="mt-3 text-sm text-muted">Hali e’lon yo‘q.</p>}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
