import { getDb } from "@/lib/firebase-admin";
import { serverState, isReaderConnected } from "@/lib/server-state";
import { getOrInitStats, updateStatsOnStatusChange } from "@/lib/stats-service";
import { NextResponse } from "next/server";

type Message = {
  id: string;
  phone: string;
  message: string;
  createdAt: number;
  status: string;
  deliveredAt?: number;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const now = Date.now();
    const db = getDb();
    
    // =====================================================
    // 1. جلب حالة القارئ من الذاكرة الحية (0 قراءات)
    // =====================================================
    const readerLastSeen = isReaderConnected() ? Date.now() : null;

    // =====================================================
    // 2. قراءة مستند الإحصائيات الشاملة (قراءة واحدة فقط 1 Read)
    // =====================================================
    const statsData = await getOrInitStats(db);

    // =====================================================
    // 3. جلب آخر 10 رسائل فقط للعرض (10 قراءات فقط 10 Reads)
    // الإجمالي: 1 + 10 = 11 قراءة فقط عند فتح أو تحديث الصفحة
    // =====================================================
    const snapshot = await db
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const updateBatch = db.batch();
    let hasUpdates = false;
    const statusChanges: Array<{ oldStatus: string; newStatus: string; createdAt: number }> = [];

    const messages: Message[] = snapshot.docs.map((doc) => {
      let status = doc.data().status;
      const createdAt = doc.data().createdAt;
      
      // إذا كانت الرسالة معلقة وتجاوزت 7 دقائق، تحول لفاشلة
      if (status === "pending" && now - createdAt > 7 * 60 * 1000) {
        status = "failed";
        updateBatch.update(doc.ref, { status: "failed" });
        hasUpdates = true;
        statusChanges.push({ oldStatus: "pending", newStatus: "failed", createdAt });
      }

      return {
        id: doc.id,
        phone: doc.data().phone,
        message: doc.data().message,
        createdAt,
        status,
        deliveredAt: doc.data().deliveredAt ?? undefined,
      };
    });

    if (hasUpdates) {
      await updateBatch.commit();
      for (const change of statusChanges) {
        await updateStatsOnStatusChange(db, change.oldStatus, change.newStatus, change.createdAt);
        statsData.pending = Math.max(0, statsData.pending - 1);
        statsData.failed = statsData.failed + 1;
      }
    }

    // =====================================================
    // 4. تجهيز بيانات الرسم البياني من مستند الإحصائيات (0 قراءات إضافية)
    // =====================================================
    const dailyStats: Record<string, { total: number; delivered: number; pending: number; failed: number; failedBalance: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      const dayData = statsData.daily?.[dateKey] || { total: 0, delivered: 0, pending: 0, failed: 0, failedBalance: 0 };
      dailyStats[dateKey] = {
        total: Math.max(0, dayData.total || 0),
        delivered: Math.max(0, dayData.delivered || 0),
        pending: Math.max(0, dayData.pending || 0),
        failed: Math.max(0, dayData.failed || 0),
        failedBalance: Math.max(0, dayData.failedBalance || 0),
      };
    }

    const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    // الأرقام الإجمالية الكاملة من مستند الإحصائيات المخصص
    const total = Math.max(0, statsData.total || 0);
    const pending = Math.max(0, statsData.pending || 0);
    const delivered = Math.max(0, statsData.delivered || 0);
    const failed = Math.max(0, statsData.failed || 0);
    const failedBalance = Math.max(0, statsData.failedBalance || 0);
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    const responsePayload = {
      success: true,
      stats: {
        total,
        pending,
        delivered,
        failed,
        failedBalance,
        successRate,
      },
      readerLastSeen,
      chartData,
      messages,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("HISTORY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}