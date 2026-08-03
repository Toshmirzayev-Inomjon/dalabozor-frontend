"use client";

import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import type { Me } from "@/lib/api";

export type DashboardRole = "farmer" | "restaurant" | "collector" | "admin";
export type DashboardSection = {
  key: string;
  label: string;
  shortLabel?: string;
  icon: IconName;
};

const ROLE_LABEL: Record<DashboardRole, string> = {
  farmer: "Dehqon",
  restaurant: "Restoran",
  collector: "Yig‘uvchi",
  admin: "Administrator",
};

export const ROLE_SECTIONS: Record<DashboardRole, DashboardSection[]> = {
  farmer: [
    { key: "overview", label: "Asosiy", icon: "home" },
    { key: "new-offer", label: "Mahsulot berish", shortLabel: "E’lon", icon: "plus" },
    { key: "offers", label: "E’lonlarim", shortLabel: "E’lonlar", icon: "box" },
    { key: "payments", label: "To‘lovlar", icon: "wallet" },
    { key: "profile", label: "Profil", icon: "user" },
  ],
  restaurant: [
    { key: "overview", label: "Asosiy", icon: "home" },
    { key: "catalog", label: "Katalog", icon: "store" },
    { key: "orders", label: "Buyurtmalar", shortLabel: "Buyurtma", icon: "box" },
    { key: "payments", label: "Hisob-kitob", shortLabel: "To‘lov", icon: "wallet" },
    { key: "profile", label: "Profil", icon: "user" },
  ],
  collector: [
    { key: "overview", label: "Bugungi marshrut", shortLabel: "Marshrut", icon: "route" },
    { key: "history", label: "Qabul holati", shortLabel: "Holat", icon: "check" },
    { key: "profile", label: "Profil", icon: "user" },
  ],
  admin: [
    { key: "overview", label: "Boshqaruv markazi", shortLabel: "Boshqaruv", icon: "chart" },
    { key: "profile", label: "Profil", icon: "user" },
  ],
};

export function DashboardShell({
  me,
  activeRole,
  activeSection,
  onRoleChange,
  onSectionChange,
  onLogout,
  children,
}: {
  me: Me;
  activeRole: DashboardRole;
  activeSection: string;
  onRoleChange: (role: DashboardRole) => void;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const sections = ROLE_SECTIONS[activeRole];
  const availableRoles = me.roles.filter((role): role is DashboardRole => role in ROLE_LABEL);
  const displayName = me.full_name || me.phone;
  const initials = (me.full_name || "DB")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <div className="px-2"><Brand href="/kabinet" /></div>

        <div className="mt-7 rounded-2xl border border-line bg-bg/70 p-2">
          <label htmlFor="role-switch" className="block px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-dim">
            Faol kabinet
          </label>
          <select
            id="role-switch"
            value={activeRole}
            onChange={(event) => onRoleChange(event.target.value as DashboardRole)}
            className="w-full cursor-pointer rounded-xl border-0 bg-white px-3 py-2.5 text-sm font-bold text-text shadow-sm outline-none"
          >
            {availableRoles.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
          </select>
        </div>

        <nav className="mt-6 space-y-1" aria-label="Kabinet navigatsiyasi">
          {sections.map((section) => {
            const active = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                  active ? "bg-gold text-white shadow-[0_8px_20px_rgba(23,92,58,.16)]" : "text-muted hover:bg-bg hover:text-text"
                }`}
              >
                <Icon name={section.icon} className="h-[19px] w-[19px]" />
                {section.label}
              </button>
            );
          })}
        </nav>

        {!availableRoles.includes("admin") && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-line px-3 py-3 text-sm font-bold text-muted">
            <Icon name="shield" className="h-4 w-4" /> Bitta akkaunt — bitta rol
          </div>
        )}

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold/10 text-sm font-extrabold text-gold">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text">{displayName}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[activeRole]}</p>
            </div>
            <button onClick={onLogout} title="Chiqish" className="rounded-xl p-2 text-muted hover:bg-red/10 hover:text-red">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur-xl lg:hidden">
          <Brand href="/kabinet" />
          <div className="flex items-center gap-2">
            {availableRoles.length > 1 && (
              <select
                aria-label="Faol kabinet"
                value={activeRole}
                onChange={(event) => onRoleChange(event.target.value as DashboardRole)}
                className="max-w-32 rounded-xl border border-line bg-white px-2.5 py-2 text-xs font-bold text-text outline-none"
              >
                {availableRoles.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
              </select>
            )}
            <button onClick={onLogout} aria-label="Kabinetdan chiqish" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted">
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(20,55,39,.06)] backdrop-blur-xl lg:hidden" aria-label="Mobil kabinet navigatsiyasi">
          {sections.map((section) => {
            const active = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionChange(section.key)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${active ? "text-gold" : "text-dim"}`}
              >
                <span className={`grid h-7 w-10 place-items-center rounded-full ${active ? "bg-gold/10" : ""}`}>
                  <Icon name={section.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="max-w-full truncate">{section.shortLabel || section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
