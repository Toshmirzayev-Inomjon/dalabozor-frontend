"use client";

import { tomorrow } from "@/lib/date";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v1";
const TOKEN_KEY = "db_access_token";
const REFRESH_TOKEN_KEY = "db_refresh_token";
const ROLE_KEY = "db_active_role";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, refreshToken?: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function getActiveRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function setActiveRole(role: string) {
  window.localStorage.setItem(ROLE_KEY, role);
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

async function request(path: string, opts: Options = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("So‘rov bekor qilindi. Qayta urinib ko‘ring.");
    }
    throw new ApiError("Server bilan bog‘lanib bo‘lmadi. Internet va backend holatini tekshiring.");
  }

  if (!response.ok) {
    let detail = `So‘rov bajarilmadi (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string | { msg?: string }[] };
      if (typeof payload.detail === "string") detail = payload.detail;
      if (Array.isArray(payload.detail)) {
        detail = payload.detail.map((item) => item.msg).filter(Boolean).join(", ") || detail;
      }
    } catch {
      // JSON bo‘lmagan backend javobi uchun umumiy xabar yetarli.
    }
    throw new ApiError(detail, response.status);
  }

  return response;
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const response = await request(path, opts);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function apiBlob(path: string): Promise<Blob> {
  const response = await request(path);
  return response.blob();
}

export type Me = {
  id: string;
  phone: string;
  full_name: string | null;
  region: string | null;
  roles: string[];
  farmer_profile: {
    village: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
  } | null;
};

export const auth = {
  requestOtp: (phone: string) =>
    api<{ sent: boolean; dev_code: string | null }>("/auth/request-otp", {
      method: "POST",
      body: { phone },
      auth: false,
    }),
  verifyOtp: (phone: string, code: string) =>
    api<{ access_token: string; refresh_token: string; is_new_user: boolean }>(
      "/auth/verify-otp",
      { method: "POST", body: { phone, code }, auth: false },
    ),
  selectRole: (role: string) =>
    api<Me>("/auth/select-role", { method: "POST", body: { role } }),
  updateProfile: (body: {
    full_name?: string | null;
    region?: string | null;
    village?: string | null;
    address?: string | null;
    name?: string | null;
    geo_lat?: number | null;
    geo_lng?: number | null;
  }) => api<Me>("/auth/profile", { method: "POST", body }),
  me: () => api<Me>("/auth/me"),
};

export type Price = {
  product_id: string;
  name_uz: string;
  emoji: string | null;
  unit: string;
  buy_price: number;
  change_pct: number | null;
};

export type Offer = {
  id: string;
  product_id?: string;
  product_name: string;
  date: string;
  kg: number;
  price_per_kg: number;
  status: string;
  estimated_income: number;
};

export type Balance = {
  month_kg: number;
  month_sum: number;
  last_payout: number | null;
  rating: number;
};

export const farmer = {
  prices: () => api<Price[]>("/prices/today"),
  myOffers: () => api<Offer[]>("/offers/mine"),
  balance: () => api<Balance>("/farmers/me/balance"),
  createOffer: (body: {
    product_id: string;
    date: string;
    kg: number;
    price_per_kg: number;
  }) => api<Offer>("/offers", { method: "POST", body: { ...body, source: "app" } }),
};

export type CatalogItem = {
  product_id: string;
  name_uz: string;
  emoji: string | null;
  unit: string;
  sell_price: number;
  available_kg: number;
  farmer_count: number;
};

export type OrderItem = {
  product_id: string;
  product_name: string;
  kg: number;
  sell_price_per_kg: number;
  subtotal: number;
};

export type Order = {
  id: string;
  delivery_date: string;
  delivery_slot: string | null;
  status: string;
  total_sum: number;
  payment_type: "cash" | "card" | "credit";
  created_at: string;
  items: OrderItem[];
};

export type TimelineStep = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
};

export type OrderDetail = Order & { timeline: TimelineStep[] };

export const restaurant = {
  catalog: (date: string) => api<CatalogItem[]>(`/catalog?date=${encodeURIComponent(date)}`),
  createOrder: (
    items: { product_id: string; kg: number }[],
    date: string,
    paymentType: "cash" | "card" | "credit" = "cash",
    deliverySlot?: string,
  ) =>
    api<Order>("/orders", {
      method: "POST",
      body: {
        items,
        delivery_date: date,
        payment_type: paymentType,
        delivery_slot: deliverySlot || null,
      },
    }),
  myOrders: () => api<Order[]>("/orders/mine"),
  order: (id: string) => api<OrderDetail>(`/orders/${encodeURIComponent(id)}`),
  reorder: (id: string, date = tomorrow()) =>
    api<Order>(`/orders/${encodeURIComponent(id)}/reorder?delivery_date=${encodeURIComponent(date)}`, {
      method: "POST",
    }),
  invoice: (id: string) => apiBlob(`/orders/${encodeURIComponent(id)}/invoice`),
};

export type Stop = {
  id: string;
  seq: number;
  farmer_id?: string;
  farmer_name: string | null;
  village: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  planned_kg: number;
  actual_kg: number | null;
  quality: string | null;
  status: string;
  products: string[];
};

export type Route = {
  id: string;
  date: string;
  status: string;
  total_planned_kg: number;
  total_actual_kg: number;
  stops: Stop[];
};

export const collector = {
  routeToday: () => api<Route | null>("/routes/today"),
  acceptStop: (id: string, actualKg: number, quality: string) =>
    api(`/stops/${encodeURIComponent(id)}/accept`, {
      method: "POST",
      body: { actual_kg: actualKg, quality },
    }),
};

export type CardLink = { redirect_url: string; last4: string | null; brand: string | null };
export type Payment = {
  id: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  provider_ref: string | null;
};

export const payments = {
  linkCard: (provider: "payme" | "click") =>
    api<CardLink>("/cards", { method: "POST", body: { provider } }),
  payInvoice: (orderId: string) =>
    api<Payment>("/payments/invoice", { method: "POST", body: { order_id: orderId } }),
};

export function fmt(value: number): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 1 }).format(value);
}

export { tomorrow } from "@/lib/date";
