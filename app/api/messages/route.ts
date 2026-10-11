import { getDb } from "@/lib/firebase-admin";
import { isReaderConnected, pushMessageToReaders, pushUpdateToDashboards, MessageType, isMaintenanceMode } from "@/lib/server-state";
import { incrementStatsOnNewMessage } from "@/lib/stats-service";
import { NextResponse } from "next/server";

// مفتاح API المسموح للمرسل
const API_KEY = "ALWADI-OTP-771176611";

// مدة الحفظ: شهر كامل
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const REPLY_TEMPLATES = [
  (otp: string) => `منظومة الوادي: ${otp}`,
  (otp: string) => `ALWADI: ${otp}`,
  (otp: string) => `Al-Wadi System: ${otp}`,
];

function toEnglishDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
}

function extractOtp(text: string): string | null {
  const normalizedText = toEnglishDigits(String(text));
  const keywordMatch = normalizedText.match(
    /(?:رمز|كود|code|otp)[^\d]{0,40}(\d{4,8})/i,
  );

  if (keywordMatch) {
    return keywordMatch[1];
  }

  const fallbackMatch = normalizedText.match(/\b\d{4,8}\b/);
  return fallbackMatch?.[0] ?? null;
}

async function getNextReply(otp: string) {
  const db = getDb();
  const rotationRef = db.collection("settings").doc("otpReplyRotation");

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rotationRef);
    const currentIndex = Number(snapshot.data()?.nextTemplateIndex ?? 0);
    const templateIndex = currentIndex % REPLY_TEMPLATES.length;

    transaction.set(
      rotationRef,
      {
        nextTemplateIndex: (templateIndex + 1) % REPLY_TEMPLATES.length,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return {
      message: REPLY_TEMPLATES[templateIndex](otp),
      templateIndex,
    };
  });
}

export async function POST(request: Request) {
  try {
    // =====================================================
    // حماية الإرسال وصيانة النظام
    if (await isMaintenanceMode()) {
      return NextResponse.json(
        {
          success: false,
          error: "نعتذر، التطبيق حالياً تحت الصيانة وسيعود للعمل قريباً. نشكركم على صبركم وتفهمكم",
        },
        { status: 503 },
      );
    }

    const apiKey = request.headers.get("x-api-key");

    if (apiKey !== API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // =====================================================
    // قراءة الطلب
    // =====================================================

    const body = await request.json();

    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "phone and message are required",
        },
        { status: 400 },
      );
    }

    const originalMessage = String(message);
    const otp = extractOtp(originalMessage);

    if (!otp) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على رمز تحقق من 4 إلى 8 أرقام في الرسالة",
        },
        { status: 400 },
      );
    }

    const reply = await getNextReply(otp);

    // Store and forward only the short rotated reply. Keep the original for auditing.

    const db = getDb();
    const now = Date.now();
    const expiresAt = now + ONE_MONTH_MS;

    const readerConnected = isReaderConnected();
    const status = "pending";
    const deliveredAt = null;

    const docRef = await db.collection("messages").add({
      phone: String(phone),
      message: reply.message,
      originalMessage,
      otp,
      templateIndex: reply.templateIndex,
      createdAt: now,
      expiresAt,
      status,
      deliveredAt,
    });

    // تحديث مستند الإحصائيات ذرياً
    await incrementStatsOnNewMessage(db, now);

    const data: MessageType = {
      id: docRef.id,
      phone: String(phone),
      message: reply.message,
      createdAt: now,
      status,
      deliveredAt: deliveredAt ?? undefined,
    };

    // دفع مباشر للقارئ عبر SSE
    if (readerConnected) {
      pushMessageToReaders({ ...data, type: "NEW_MESSAGE" });
    }
    
    // إشعار اللوحة بالرسالة الجديدة
    pushUpdateToDashboards({ type: "NEW_MESSAGE", message: data });

    // =====================================================
    // نجاح
    // =====================================================

    return NextResponse.json({
      success: true,
      message: "Message received",
      data,
    });
  } catch (error) {
    console.error("MESSAGE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}