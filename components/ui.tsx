"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`surface-card p-5 sm:p-6 ${className}`}>{children}</section>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: IconName;
};

export function GoldButton({
  children,
  className = "",
  loading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`gold-btn px-5 py-3 text-sm ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className = "",
  loading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`outline-btn px-5 py-3 text-sm ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function Badge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    auto_approved: "border-green/20 bg-green/10 text-green",
    approved: "border-green/20 bg-green/10 text-green",
    needs_review: "border-orange/25 bg-orange/10 text-[#A45D12]",
    rejected: "border-red/20 bg-red/10 text-red",
    new: "border-gold/20 bg-gold/10 text-gold",
    allocated: "border-[#5B72D6]/20 bg-[#5B72D6]/10 text-[#4458B5]",
    collecting: "border-orange/25 bg-orange/10 text-[#A45D12]",
    in_transit: "border-[#2B82A5]/20 bg-[#2B82A5]/10 text-[#236A87]",
    delivered: "border-green/20 bg-green/10 text-green",
    paid: "border-green/20 bg-green/10 text-green",
    cancelled: "border-red/20 bg-red/10 text-red",
    accepted: "border-green/20 bg-green/10 text-green",
    pending: "border-orange/25 bg-orange/10 text-[#A45D12]",
  };
  const labels: Record<string, string> = {
    auto_approved: "Avtomatik qabul",
    approved: "Tasdiqlandi",
    needs_review: "Tekshiruvda",
    rejected: "Rad etildi",
    new: "Qabul qilindi",
    allocated: "Taqsimlandi",
    collecting: "Yig‘ilmoqda",
    in_transit: "Yo‘lda",
    delivered: "Yetkazildi",
    paid: "To‘landi",
    cancelled: "Bekor qilindi",
    accepted: "Qabul qilindi",
    pending: "Kutilmoqda",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${tones[status] || "border-line bg-bg2 text-muted"}`}>
      {labels[status] || status}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="font-head text-xl font-extrabold tracking-[-0.03em] text-text sm:text-2xl">{title}</h2>
        {text && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = "box",
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-bg/60 px-6 py-8 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/10 text-gold">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-bold text-text">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm leading-5 text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function InlineAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const toneClass = {
    error: "border-red/20 bg-red/10 text-red",
    success: "border-green/20 bg-green/10 text-green",
    info: "border-gold/20 bg-gold/10 text-gold",
  }[tone];
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClass}`}>{children}</div>;
}

export function PageLoader({ label = "Yuklanmoqda…" }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted" role="status">
      <Spinner className="h-6 w-6 text-gold" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon: IconName;
  tone?: "brand" | "lime" | "orange" | "blue";
}) {
  const tones = {
    brand: "bg-gold/10 text-gold",
    lime: "bg-accent/45 text-gold2",
    orange: "bg-orange/15 text-[#A45D12]",
    blue: "bg-[#5B72D6]/10 text-[#4458B5]",
  };
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted sm:text-sm">{label}</p>
          <div className="mt-2 font-head text-2xl font-extrabold tracking-[-0.04em] text-text sm:text-3xl">{value}</div>
          {note && <p className="mt-1 text-xs text-muted">{note}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
