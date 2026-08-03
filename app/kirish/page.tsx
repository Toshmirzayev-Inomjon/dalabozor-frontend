"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
import { GoldButton, InlineAlert } from "@/components/ui";
import { auth, setToken } from "@/lib/api";

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "+998";
  return `+${digits.startsWith("998") ? digits : `998${digits}`}`;
}

function visiblePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return value;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

export default function KirishPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(event?: FormEvent) {
    event?.preventDefault();
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, "").length !== 12) {
      setError("Telefon raqamini +998 XX XXX XX XX formatida kiriting.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await auth.requestOtp(normalized);
      setPhone(normalized);
      setDevCode(response.dev_code);
      setStep("code");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Kod yuborilmadi.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(event?: FormEvent) {
    event?.preventDefault();
    if (code.length < 3) return;
    setError("");
    setLoading(true);
    try {
      const response = await auth.verifyOtp(phone, code);
      setToken(response.access_token, response.refresh_token);
      const me = await auth.me();
      router.replace(me.roles.length ? "/kabinet" : "/rol");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Kod tekshirilmadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.72fr)]">
      <section className="noise-panel relative hidden overflow-hidden px-10 py-10 text-white lg:flex lg:flex-col">
        <Brand href="/" inverse />
        <div className="my-auto max-w-xl py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-accent">
            <Icon name="shield" className="h-4 w-4" /> SMS orqali xavfsiz kirish
          </span>
          <h1 className="mt-6 text-balance font-head text-5xl font-extrabold leading-[1.08] tracking-[-0.055em]">
            Daladan oshxonagacha — bitta kabinetda.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/67">
            E’lon, buyurtma, yig‘im va hisob-kitob jarayonlarini istalgan qurilmadan boshqaring.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["18:00", "E’lonlar"],
            ["05:30", "Yig‘im"],
            ["08:00", "Yetkazish"],
          ].map(([time, label]) => (
            <div key={time} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <div className="font-mono text-lg font-bold text-accent">{time}</div>
              <div className="mt-1 text-xs text-white/55">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute left-5 top-5 lg:hidden">
          <Brand href="/" />
        </div>
        <div className="w-full max-w-[430px] pt-16 lg:pt-0">
          <Link href="/" className="mb-8 hidden w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-gold lg:inline-flex">
            <span aria-hidden="true">←</span> Bosh sahifaga qaytish
          </Link>

          <div className="surface-card p-6 sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
              <Icon name={step === "phone" ? "phone" : "shield"} className="h-6 w-6" />
            </div>
            <p className="eyebrow mt-6">{step === "phone" ? "Kabinetga kirish" : "Tasdiqlash"}</p>
            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-[-0.045em] text-text">
              {step === "phone" ? "Telefon raqamingiz" : "SMS kodni kiriting"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {step === "phone"
                ? "Parol eslab qolish shart emas. Bir martalik kod yuboramiz."
                : `${visiblePhone(phone)} raqamiga yuborilgan kodni kiriting.`}
            </p>

            {step === "phone" ? (
              <form onSubmit={sendOtp} className="mt-7">
                <label htmlFor="phone" className="text-sm font-bold text-text">Telefon raqami</label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setPhone(normalizePhone(phone))}
                  autoComplete="tel"
                  inputMode="tel"
                  className="field mt-2 font-mono text-lg tracking-wide"
                  placeholder="+998 90 123 45 67"
                  aria-describedby="phone-help"
                />
                <p id="phone-help" className="mt-2 text-xs text-muted">O‘zbekiston mobil raqamini kiriting.</p>
                <GoldButton type="submit" loading={loading} className="mt-5 w-full">
                  Kod yuborish <Icon name="arrow" className="h-4 w-4" />
                </GoldButton>
              </form>
            ) : (
              <form onSubmit={verify} className="mt-7">
                {devCode && (
                  <div className="mb-4 rounded-2xl border border-orange/20 bg-orange/10 px-4 py-3 text-sm text-[#91520F]">
                    Test rejimidagi kod: <strong className="font-mono tracking-wider">{devCode}</strong>
                  </div>
                )}
                <label htmlFor="code" className="text-sm font-bold text-text">Tasdiqlash kodi</label>
                <input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  autoComplete="one-time-code"
                  autoFocus
                  inputMode="numeric"
                  className="field mt-2 text-center font-mono text-2xl font-bold tracking-[0.45em]"
                  placeholder="••••"
                />
                <GoldButton type="submit" loading={loading} disabled={code.length < 3} className="mt-5 w-full">
                  Kabinetga kirish <Icon name="arrow" className="h-4 w-4" />
                </GoldButton>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                  }}
                  className="mt-4 w-full rounded-xl py-2 text-sm font-semibold text-muted hover:text-gold"
                >
                  Raqamni o‘zgartirish
                </button>
              </form>
            )}

            {error && <div className="mt-4"><InlineAlert>{error}</InlineAlert></div>}
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted">
            Davom etish orqali siz DalaBozor xizmat shartlari va maxfiylik qoidalariga rozilik bildirasiz.
          </p>
        </div>
      </section>
    </main>
  );
}
