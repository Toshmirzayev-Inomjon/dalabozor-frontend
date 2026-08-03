import { api } from "@/lib/api";

export type OfferStatus =
  | "auto_approved"
  | "needs_review"
  | "approved"
  | "rejected";

export type ReviewAction = "approve" | "reject";

export type AdminDashboard = {
  date: string;
  revenue: number;
  margin: number;
  collect_kg: number;
  active_orders: number;
};

export type CorridorProduct = {
  product_id: string;
  name_uz: string;
  min_price: number | null;
  max_price: number | null;
  offers_total: number;
  needs_review: number;
};

export type AdminOffer = {
  id: string;
  farmer_name: string | null;
  product_name: string;
  kg: number;
  price_per_kg: number;
  status: OfferStatus;
};

export type CorridorToday = {
  date: string;
  products: CorridorProduct[];
  review_offers: AdminOffer[];
};

export type AdminRoute = {
  route_id: string;
  status: string;
  collector_id: string | null;
  stops: number;
  planned_kg: number;
  actual_kg: number;
};

export type RunResult<T = Record<string, unknown>> = {
  ok: boolean;
  detail: T;
};

export type AdminRoutesDetail = {
  date: string;
  routes: AdminRoute[];
};

export type SetCorridorInput = {
  date: string;
  min_price: number;
  max_price: number;
};

export type CallOfferInput = {
  farmer_phone: string;
  product_id: string;
  date: string;
  kg: number;
  price_per_kg: number;
};

export type AllocationRunDetail = {
  orders: number;
  allocated_kg: number;
  stops: number;
};

export type PayoutRunDetail = {
  payouts: number;
  total_paid: number;
};

export type Role = "farmer" | "restaurant" | "collector" | "admin";

export type AdminUser = {
  id: string;
  phone: string;
  full_name: string | null;
  region: string | null;
  roles: string[];
};

export const ROLE_LABELS: Record<Role, string> = {
  farmer: "Dehqon",
  restaurant: "Restoran",
  collector: "Yig'uvchi",
  admin: "Admin",
};

export const ROLE_ORDER: Role[] = ["farmer", "restaurant", "collector", "admin"];

function targetQuery(target?: string): string {
  return target ? `?target=${encodeURIComponent(target)}` : "";
}

export const adminApi = {
  dashboard: () => api<AdminDashboard>("/admin/dashboard"),

  corridor: (target?: string) =>
    api<CorridorToday>(`/admin/corridor/today${targetQuery(target)}`),

  setCorridor: (productId: string, body: SetCorridorInput) =>
    api<RunResult<{ product_id: string; date: string }>>(
      `/admin/corridor/${encodeURIComponent(productId)}`,
      { method: "POST", body },
    ),

  reviewOffer: (offerId: string, action: ReviewAction) =>
    api<RunResult<{ offer_id: string; status: OfferStatus }>>(
      `/admin/offers/${encodeURIComponent(offerId)}/review`,
      { method: "POST", body: { action } },
    ),

  routes: (target?: string) =>
    api<RunResult<AdminRoutesDetail>>(
      `/admin/routes${targetQuery(target)}`,
    ),

  callOffers: () => api<AdminOffer[]>("/admin/calls"),

  createCallOffer: (body: CallOfferInput) =>
    api<RunResult<{ offer_id: string; status: OfferStatus }>>(
      "/admin/calls/offer",
      { method: "POST", body },
    ),

  runAllocation: (target?: string) =>
    api<RunResult<AllocationRunDetail>>(
      `/admin/allocation/run${targetQuery(target)}`,
      { method: "POST" },
    ),

  runPayouts: (target?: string) =>
    api<RunResult<PayoutRunDetail>>(
      `/admin/payouts/run${targetQuery(target)}`,
      { method: "POST" },
    ),

  users: (role?: Role, q?: string) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (q) params.set("q", q);
    const query = params.toString();
    return api<AdminUser[]>(`/admin/users${query ? `?${query}` : ""}`);
  },

  assignRole: (userId: string, role: Role) =>
    api<AdminUser>(
      `/admin/users/${encodeURIComponent(userId)}/role`,
      { method: "POST", body: { role } },
    ),

  removeRole: (userId: string, role: Role) =>
    api<AdminUser>(
      `/admin/users/${encodeURIComponent(userId)}/role/${role}`,
      { method: "DELETE" },
    ),
};
