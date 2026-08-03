"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { InlineAlert, PageLoader } from "@/components/ui";
import { auth, getToken, setActiveRole } from "@/lib/api";

const ROLES: { key: string; icon: IconName; title: string; desc: string; note: string }[] = [
  {
    key: "farmer",
    icon: "leaf",
    title: "Dehqon",
    desc: "Mahsulot taklif qilaman",
    note: "Narxlar, e’lonlar va to‘lovlar",
  },
  {
    key: "restaurant",
    icon: "store",
    title: "Restoran",
    desc: "Mahsulot buyurtma qilaman",
    note: "Katalog, buyurtma va fakturalar",
  },
  {
    key: "collector",
    icon: "truck",
    title: "Yig‘uvchi",
    desc: "Mahsulotlarni yig‘aman",
    note: "Marshrut, bekatlar va qabul",
  },
];

export default function RolePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/kirish");
      return;
    }
    auth.me().then((me) => {
      if (me.roles.length > 0) {
        router.replace("/kabinet");
        return;
      }
      setReady(true);
    }).catch(() => router.replace("/kirish"));
  }, [router]);

  async function pick(role: string) {
    setBusy(role);
    setError("");
    if (role === "collector") {
      setError("Yig‘uvchi operatsion rolini marshrut xavfsizligi uchun administrator biriktiradi.");
      setBusy(null);
      return;
    }
    try {
      // Bitta akkaunt — bitta rol: rol faqat bir marta tanlanadi va
      // keyin o‘zgartirib yoki qo‘shib bo‘lmaydi.
      await auth.selectRole(role);
      setActiveRole(role);
      router.push("/kabinet?section=profile");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Rolni tanlab bo‘lmadi.");
      setBusy(null);
    }
  }

  if (!ready) return <PageLoader label="Profil tekshirilmoqda…" />;

  return (
    <main className="min-h-screen px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Brand />
        </div>

        <section className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
          <p className="eyebrow">Shaxsiylashtirish</p>
          <h1 className="mt-3 text-balance font-head text-3xl font-extrabold tracking-[-0.045em] text-text sm:text-5xl">
            DalaBozordan qanday foydalanasiz?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
            Bitta akkaunt — bitta rol. Tanlangan rol keyinchalik o‘zgartirilmaydi
            va boshqa rol qo‘shib bo‘lmaydi.
          </p>
        </section>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {ROLES.map((role, index) => {
            const selected = busy === role.key;
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => pick(role.key)}
                disabled={busy !== null}
                className={`group relative min-h-64 overflow-hidden rounded-[26px] border p-6 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-float disabled:translate-y-0 ${
                  selected ? "border-gold bg-gold text-white" : "border-line bg-white text-text"
                }`}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${selected ? "bg-white/15 text-accent" : "bg-gold/10 text-gold"}`}>
                  <Icon name={role.icon} className="h-6 w-6" />
                </span>
                <span className="mt-7 block font-head text-xl font-extrabold">{role.title}</span>
                <span className={`mt-1 block text-sm font-semibold ${selected ? "text-white/80" : "text-muted"}`}>{role.desc}</span>
                <span className={`mt-5 block border-t pt-4 text-xs ${selected ? "border-white/15 text-white/60" : "border-line text-dim"}`}>
                  {role.key === "collector" ? "Administrator tekshiruvi va biriktirishi talab qilinadi" : role.note}
                </span>
                <span className={`absolute right-5 top-5 text-xs font-bold ${selected ? "text-accent" : "text-dim"}`}>
                  {selected ? "Tayyorlanmoqda…" : role.key === "collector" ? "Tasdiq bilan" : `0${index + 1}`}
                </span>
                <Icon name="arrow" className={`absolute bottom-6 right-6 h-5 w-5 transition group-hover:translate-x-1 ${selected ? "text-accent" : "text-gold"}`} />
              </button>
            );
          })}
        </div>
        {error && <div className="mx-auto mt-5 max-w-xl"><InlineAlert>{error}</InlineAlert></div>}
      </div>
    </main>
  );
}
