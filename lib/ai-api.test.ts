import assert from "node:assert/strict";
import test from "node:test";
import { sendAIMessage } from "./ai-api";

test("AI action provider qiymatidan qat’i nazar tasdiq talab qiladi", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        reply: "Mahsulot berish bo‘limini ochaman.",
        action: {
          type: "navigate",
          value: "new-offer",
          requires_confirmation: false,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const result = await sendAIMessage({
    message: "E’lon bermoqchiman",
    history: [],
    activeRole: "farmer",
    activeSection: "overview",
  });

  assert.equal(result.action?.type, "navigate");
  assert.equal(result.action?.value, "new-offer");
  assert.equal(result.action?.requires_confirmation, true);
});
