"use client";

import { ApiError, api } from "@/lib/api";

export type AIMessageRole = "user" | "assistant";

export type AIHistoryMessage = {
  role: AIMessageRole;
  content: string;
};

// Bitta akkaunt — bitta rol: AI faqat bo‘limlar orasida navigatsiya qiladigan
// amallarni taklif qiladi; rol qo‘shish/almashtirish/olib tashlash mavjud emas.
export type AIActionType = "navigate";

export type AIAction = {
  type: AIActionType;
  value: string;
  requires_confirmation: boolean;
};

export type AIStatus = {
  chatAvailable: boolean;
};

export type AIChatInput = {
  message: string;
  history: AIHistoryMessage[];
  activeRole: string;
  activeSection: string;
  signal?: AbortSignal;
};

export type AIChatResult = {
  reply: string;
  action?: AIAction;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(record: UnknownRecord, ...keys: string[]): boolean {
  for (const key of keys) {
    if (typeof record[key] === "boolean") return record[key];
  }
  return false;
}

function normalizeAction(value: unknown): AIAction | undefined {
  if (!isRecord(value)) return undefined;

  const allowedTypes: AIActionType[] = ["navigate"];
  const type = value.type;
  const actionValue = value.value;
  if (
    typeof type !== "string" ||
    !allowedTypes.includes(type as AIActionType) ||
    typeof actionValue !== "string" ||
    !actionValue.trim()
  ) {
    return undefined;
  }

  return {
    type: type as AIActionType,
    value: actionValue.trim(),
    // Provider nima yuborishidan qat'i nazar, UI har bir amalni tasdiqlatadi.
    requires_confirmation: true,
  };
}

export async function getAIStatus(signal?: AbortSignal): Promise<AIStatus> {
  const payload = await api<unknown>("/ai/status", { signal });
  if (!isRecord(payload)) throw new ApiError("AI holati noto‘g‘ri formatda qaytdi.");

  return {
    chatAvailable: readBoolean(payload, "chat_available", "chatAvailable", "chat"),
  };
}

export async function sendAIMessage({
  message,
  history,
  activeRole,
  activeSection,
  signal,
}: AIChatInput): Promise<AIChatResult> {
  const payload = await api<unknown>("/ai/chat", {
    method: "POST",
    signal,
    body: {
      message,
      history,
      active_role: activeRole,
      active_section: activeSection,
    },
  });

  if (!isRecord(payload)) throw new ApiError("AI javobi noto‘g‘ri formatda qaytdi.");

  const replyCandidate = payload.reply ?? payload.message ?? payload.content;
  if (typeof replyCandidate !== "string" || !replyCandidate.trim()) {
    throw new ApiError("AI bo‘sh javob qaytardi. Qayta urinib ko‘ring.");
  }

  const action = normalizeAction(payload.action);
  return {
    reply: replyCandidate.trim(),
    ...(action ? { action } : {}),
  };
}

