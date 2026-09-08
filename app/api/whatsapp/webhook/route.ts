import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const COMMAND = "ارسل رمز التحقق الخاص بي";
const GRAPH_API_VERSION = "v22.0";

type WhatsAppTextMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type WhatsAppWebhookValue = {
  messages?: WhatsAppTextMessage[];
};

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: WhatsAppWebhookValue;
    }>;
  }>;
};

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
}

function phoneCandidates(phone: string): string[] {
  const digits = normalizeDigits(phone).replace(/\D/g, "");

  if (!digits) {
    return [];
  }

  const localNumber = digits.startsWith("967")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  return [...new Set([
    digits,
    localNumber,
    `0${localNumber}`,
    `967${localNumber}`,
  ])];
}

function timestampValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  return 0;
}

async function findLatestCode(phone: string): Promise<string | null> {
  const db = getDb();
  const candidates = phoneCandidates(phone);
  const snapshots = await Promise.all(
    candidates.map((candidate) =>
      db.collection("messages").where("phone", "==", candidate).get(),
    ),
  );

  const records = snapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => ({
      data: doc.data(),
      createdAt: timestampValue(doc.data().createdAt),
    })),
  );

  records.sort((left, right) => right.createdAt - left.createdAt);

  const latest = records[0]?.data;
  const code = latest?.otp ?? latest?.code ?? latest?.verificationCode;

  return code === undefined || code === null || String(code).trim() === ""
    ? null
    : String(code);
}

async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN و WHATSAPP_PHONE_NUMBER_ID مطلوبان لإرسال الرد",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `WhatsApp Cloud API فشل بحالة ${response.status}: ${errorBody.slice(0, 500)}`,
    );
  }
}

async function handleIncomingMessage(message: WhatsAppTextMessage): Promise<void> {
  const customerNumber = message.from;
  const text = message.text?.body?.trim();

  if (!customerNumber || message.type !== "text" || !text) {
    return;
  }

  console.log("WhatsApp webhook: received text message", {
    from: customerNumber,
    messageId: message.id,
  });

  if (text !== COMMAND) {
    return;
  }

  const code = await findLatestCode(customerNumber);
  const reply = code
    ? `رمز التحقق الخاص بك هو: ${code}`
    : "لا يوجد رمز تحقق مرتبط بهذا الرقم حالياً.";

  await sendWhatsAppText(customerNumber, reply);
  console.log("WhatsApp webhook: reply sent", {
    to: customerNumber,
    hasCode: Boolean(code),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  console.warn("WhatsApp webhook: verification rejected");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WhatsAppWebhookBody;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: true });
    }

    const messages = body.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
    ) ?? [];

    for (const message of messages) {
      try {
        await handleIncomingMessage(message);
      } catch (error) {
        console.error("WhatsApp webhook: failed to process message", {
          messageId: message.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook: invalid request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { received: false, error: "Invalid webhook request" },
      { status: 400 },
    );
  }
}