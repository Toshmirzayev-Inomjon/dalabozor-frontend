"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { GlassCard, GoldButton, InlineAlert, OutlineButton, SectionHeading } from "@/components/ui";
import { auth, payments, type Me } from "@/lib/api";
import { isValidGeoCoordinates, type GeoCoordinates } from "@/lib/yandex-maps";

const ROLE_LABEL: Record<string, string> = {
  farmer: "Dehqon",
  restaurant: "Restoran",
  collector: "Yig‘uvchi",
  admin: "Administrator",
};

function savedFarmerLocation(me: Me): GeoCoordinates | null {
  const profile = me.farmer_profile;
  if (!profile || !isValidGeoCoordinates(profile.geo_lat, profile.geo_lng)) return null;
  return { lat: profile.geo_lat!, lng: profile.geo_lng! };
}

function geolocationErrorText(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Brauzer joylashuvga ruxsat bermadi. Sayt ruxsatlarini tekshirib, yana urinib ko‘ring.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Qurilma joylashuvni aniqlay olmadi. GPS yoki internetni tekshiring.";
  }
  if (error.code === error.TIMEOUT) {
    return "Joylashuvni aniqlash vaqti tugadi. Ochiqroq joyda yana urinib ko‘ring.";
  }
  return "Joriy joylashuvni aniqlab bo‘lmadi.";
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && typeof (error as { code?: unknown }).code === "number"
  );
}

export function ProfilePanel({
  me,
  activeRole,
  onUpdated,
}: {
  me: Me;
  activeRole: string;
  onUpdated: (me: Me) => void;
}) {
  const [name, setName] = useState(me.full_name || "");
  const [region, setRegion] = useState(me.region || "");
  const [extra, setExtra] = useState(me.farmer_profile?.village || "");
  const [farmerLocation, setFarmerLocation] = useState<GeoCoordinates | null>(() => savedFarmerLocation(me));
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardBusy, setCardBusy] = useState<"payme" | "click" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    setName(me.full_name || "");
    setRegion(me.region || "");
  }, [me.full_name, me.region]);

  useEffect(() => {
    if (activeRole === "farmer") {
      setExtra(me.farmer_profile?.village || "");
      setFarmerLocation(savedFarmerLocation(me));
    } else {
      setExtra("");
    }
  }, [activeRole, me]);

  const isFarmer = activeRole === "farmer";
  const isRestaurant = activeRole === "restaurant";

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await auth.updateProfile({
        full_name: name.trim() || null,
        region: region.trim() || null,
        village: isFarmer ? extra.trim() || null : undefined,
        address: isRestaurant ? extra.trim() || null : undefined,
        name: isRestaurant ? name.trim() || null : undefined,
        geo_lat: isFarmer ? farmerLocation?.lat ?? null : undefined,
        geo_lng: isFarmer ? farmerLocation?.lng ?? null : undefined,
      });
      onUpdated(updated);
      setMessage({ tone: "success", text: "Profil ma’lumotlari saqlandi." });
    } catch (error: unknown) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Profil saqlanmadi." });
    } finally {
      setSaving(false);
    }
  }

  async function detectFarmerLocation() {
    if (!("geolocation" in navigator)) {
      setMessage({ tone: "error", text: "Bu brauzer joylashuvni aniqlashni qo‘llab-quvvatlamaydi." });
      return;
    }

    setLocating(true);
    setMessage(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 60_000,
        });
      });
      const nextLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      if (!isValidGeoCoordinates(nextLocation.lat, nextLocation.lng)) {
        throw new Error("Qurilma noto‘g‘ri koordinata qaytardi.");
      }
      setFarmerLocation(nextLocation);
      setMessage({
        tone: "info",
        text: "Joylashuv aniqlandi. Uni bazaga yozish uchun “O‘zgarishlarni saqlash”ni bosing.",
      });
    } catch (error: unknown) {
      setMessage({
        tone: "error",
        text: isGeolocationError(error)
          ? geolocationErrorText(error)
          : error instanceof Error
            ? error.message
            : "Joriy joylashuvni aniqlab bo‘lmadi.",
      });
    } finally {
      setLocating(false);
    }
  }

  async function linkCard(provider: "payme" | "click") {
    setCardBusy(provider);
    setMessage(null);
    try {
      const result = await payments.linkCard(provider);
      setMessage({
        tone: "success",
        text: result.last4
          ? `${result.brand || "Karta"} •••• ${result.last4} bog‘lashga tayyor.`
          : "Karta bog‘lash oynasi tayyor.",
      });
      if (result.redirect_url && /^https?:\/\//.test(result.redirect_url)) {
        window.open(result.redirect_url, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Kartani bog‘lab bo‘lmadi." });
    } finally {
      setCardBusy(null);
    }
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Sozlamalar"
        title="Profil va to‘lovlar"
        text="Aloqa ma’lumotlari va hisob-kitob usullarini boshqaring."
      />

      {message && <div className="mb-5"><InlineAlert tone={message.tone}>{message.text}</InlineAlert></div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <GlassCard>
          <div className="mb-6 flex items-center gap-4 border-b border-line pb-5">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold text-xl font-extrabold text-white">
              {(name || me.phone).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-head text-lg font-extrabold text-text">{name || "Ism kiritilmagan"}</h3>
              <p className="mt-0.5 font-mono text-xs text-muted">{me.phone}</p>
              <span className="mt-2 inline-flex rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
                {ROLE_LABEL[activeRole] || activeRole}
              </span>
            </div>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="text-sm font-bold text-text">
                {isRestaurant ? "Restoran nomi" : "Ism va familiya"}
              </label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field mt-2"
                placeholder={isRestaurant ? "Masalan, Osh Markazi" : "Ism Familiya"}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="profile-region" className="text-sm font-bold text-text">Hudud</label>
              <input
                id="profile-region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="field mt-2"
                placeholder="Masalan, Qashqadaryo"
                autoComplete="address-level1"
              />
            </div>
            {(isFarmer || isRestaurant) && (
              <div>
                <label htmlFor="profile-extra" className="text-sm font-bold text-text">
                  {isFarmer ? "Qishloq yoki mahalla" : "Yetkazish manzili"}
                </label>
                <input
                  id="profile-extra"
                  value={extra}
                  onChange={(event) => setExtra(event.target.value)}
                  className="field mt-2"
                  placeholder={isFarmer ? "Chiroqchi, Langar qishlog‘i" : "Ko‘cha, uy va mo‘ljal"}
                  autoComplete="street-address"
                />
                <p className="mt-2 text-xs leading-5 text-muted">
                  {isFarmer
                    ? "Qishloq nomi yig‘uvchiga nuqtani tez tanib olishga yordam beradi."
                    : "Bu maydon qayta ochilganda bo‘sh ko‘rinishi mumkin; yangi qiymat kiritsangiz yangilanadi."}
                </p>
              </div>
            )}
            {isFarmer && (
              <div className="rounded-2xl border border-line bg-bg/60 p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${farmerLocation ? "bg-green/10 text-green" : "bg-orange/10 text-[#A45D12]"}`}>
                    <Icon name="route" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-text">
                      {farmerLocation ? "Yig‘im nuqtasi aniqlandi" : "Yig‘im nuqtasi kiritilmagan"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {farmerLocation
                        ? `${farmerLocation.lat.toFixed(5)}, ${farmerLocation.lng.toFixed(5)}`
                        : "Yig‘uvchi marshrut xaritasida ko‘rishi uchun qurilmaning joriy joylashuvini oling."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <OutlineButton
                    onClick={() => void detectFarmerLocation()}
                    loading={locating}
                    icon="route"
                    className="w-full sm:w-auto"
                  >
                    Joriy joylashuvni olish
                  </OutlineButton>
                  {farmerLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setFarmerLocation(null);
                        setMessage({ tone: "info", text: "Joylashuv o‘chirishga belgilandi. O‘zgarishni saqlang." });
                      }}
                      className="min-h-11 rounded-xl px-4 text-sm font-bold text-red transition hover:bg-red/10"
                    >
                      Nuqtani o‘chirish
                    </button>
                  )}
                </div>
                <p className="mt-3 flex gap-2 text-xs leading-5 text-muted">
                  <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                  GPS ruxsati faqat shu tugmani bosganingizda so‘raladi; fon kuzatuvi yoqilmaydi.
                </p>
              </div>
            )}
            <GoldButton type="submit" loading={saving} icon="check" className="w-full sm:w-auto">
              O‘zgarishlarni saqlash
            </GoldButton>
          </form>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/45 text-gold2">
                <Icon name="card" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-text">Hisob-kitob kartasi</h3>
                <p className="mt-1 text-sm leading-5 text-muted">To‘lov olish yoki fakturani yopish uchun kartani xavfsiz bog‘lang.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <OutlineButton onClick={() => linkCard("payme")} loading={cardBusy === "payme"} disabled={cardBusy !== null}>
                Payme orqali bog‘lash
              </OutlineButton>
              <OutlineButton onClick={() => linkCard("click")} loading={cardBusy === "click"} disabled={cardBusy !== null}>
                Click orqali bog‘lash
              </OutlineButton>
            </div>
            <div className="mt-4 flex gap-2 rounded-2xl bg-bg p-3 text-xs leading-5 text-muted">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-green" />
              Karta raqami va CVV DalaBozorda saqlanmaydi; faqat provayder tokeni ishlatiladi.
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
