import { NextResponse } from "next/server";

const AUTO_REPLY = "مرحبا بك نظام ستار موبايل يعمل ------ تمام";
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

  if (!customerNumber) {
    return;
  }

  console.log("WhatsApp webhook: received text message", {
    from: customerNumber,
    messageId: message.id,
  });

  await sendWhatsAppText(customerNumber, AUTO_REPLY);
  console.log("WhatsApp webhook: automatic reply sent", {
      to: customerNumber,
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