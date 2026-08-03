"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { AdminCabinet } from "@/components/cabinet/AdminCabinet";
import { CollectorCabinet } from "@/components/cabinet/CollectorCabinet";
import { FarmerCabinet } from "@/components/cabinet/FarmerCabinet";
import { ProfilePanel } from "@/components/cabinet/ProfilePanel";
import { RestaurantCabinet } from "@/components/cabinet/RestaurantCabinet";
import {
  DashboardShell,
  ROLE_SECTIONS,
  type DashboardRole,
} from "@/components/dashboard/DashboardShell";
import { InlineAlert, PageLoader } from "@/components/ui";
import {
  auth,
  clearToken,
  getActiveRole,
  getToken,
  setActiveRole,
  type Me,
} from "@/lib/api";

const VALID_ROLES: DashboardRole[] = ["farmer", "restaurant", "collector", "admin"];

function isDashboardRole(value: string): value is DashboardRole {
  return VALID_ROLES.includes(value as DashboardRole);
}

export default function KabinetPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [activeRole, setRole] = useState<DashboardRole>("farmer");
  const [section, setSection] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/kirish");
      return;
    }
    auth.me().then((profile) => {
      if (!profile.roles.length) {
        router.replace("/rol");
        return;
      }
      const available = profile.roles.filter(isDashboardRole);
      if (!available.length) {
        setError("Bu profil uchun sayt kabineti topilmadi.");
        return;
      }
      const savedRole = getActiveRole();
      const initialRole = savedRole && isDashboardRole(savedRole) && available.includes(savedRole)
        ? savedRole
        : available[0];
      const requestedSection = new URLSearchParams(window.location.search).get("section") || "overview";
      const validSection = ROLE_SECTIONS[initialRole].some((item) => item.key === requestedSection)
        ? requestedSection
        : "overview";
      setMe(profile);
      setRole(initialRole);
      setActiveRole(initialRole);
      setSection(validSection);
    }).catch((requestError: unknown) => {
      if (requestError instanceof Error && "status" in requestError && requestError.status === 401) {
        clearToken();
        router.replace("/kirish");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Kabinetni ochib bo‘lmadi.");
    });
  }, [router]);

  useEffect(() => {
    if (!me || me.roles.includes(activeRole)) return;
    const nextRole = me.roles.find(isDashboardRole);
    if (!nextRole) return;
    setRole(nextRole);
    setActiveRole(nextRole);
    setSection("overview");
    window.history.replaceState(null, "", "/kabinet");
  }, [activeRole, me]);

  function changeRole(role: DashboardRole) {
    if (!me?.roles.includes(role)) return;
    setRole(role);
    setActiveRole(role);
    changeSection("overview");
  }

  function changeSection(nextSection: string) {
    if (!ROLE_SECTIONS[activeRole].some((item) => item.key === nextSection)) return;
    setSection(nextSection);
    const url = nextSection === "overview" ? "/kabinet" : `/kabinet?section=${encodeURIComponent(nextSection)}`;
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function logout() {
    clearToken();
    router.replace("/");
  }

  if (error && !me) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-5">
        <div className="w-full"><InlineAlert>{error}</InlineAlert></div>
      </main>
    );
  }
  if (!me) return <PageLoader label="Kabinet tayyorlanmoqda…" />;

  const availableRoles = me.roles.filter(isDashboardRole);

  return (
    <>
      <DashboardShell
        me={me}
        activeRole={activeRole}
        activeSection={section}
        onRoleChange={changeRole}
        onSectionChange={changeSection}
        onLogout={logout}
      >
        {section === "profile" ? (
          <ProfilePanel
            me={me}
            activeRole={activeRole}
            onUpdated={setMe}
          />
        ) : activeRole === "farmer" ? (
          <FarmerCabinet section={section} onNavigate={changeSection} />
        ) : activeRole === "restaurant" ? (
          <RestaurantCabinet section={section} onNavigate={changeSection} />
        ) : activeRole === "collector" ? (
          <CollectorCabinet section={section} />
        ) : (
          <AdminCabinet />
        )}
      </DashboardShell>

      <AIAssistant<DashboardRole>
        userId={me.id}
        activeRole={activeRole}
        activeSection={section}
        allowedSections={ROLE_SECTIONS[activeRole].map((item) => item.key)}
        onNavigate={changeSection}
      />
    </>
  );
}
