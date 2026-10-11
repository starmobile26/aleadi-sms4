import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { pushUpdateToDashboards } from "@/lib/server-state";
import { updateStatsOnStatusChange, normalizeStatus } from "@/lib/stats-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing id or status" }, { status: 400 });
    }

    const normalizedStatus = normalizeStatus(status);
    if (
      normalizedStatus !== "delivered" &&
      normalizedStatus !== "failed" &&
      normalizedStatus !== "failed_balance"
    ) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    const docRef = db.collection("messages").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 });
    }

    const data = docSnap.data();
    const oldStatus = normalizeStatus(data?.status || "pending");
    const createdAt = Number(data?.createdAt || now);

    const updateData: any = { status: normalizedStatus };
    if (normalizedStatus === "delivered") {
      updateData.deliveredAt = now;
    }

    await docRef.update(updateData);

    // تحديث مستند الإحصائيات ذرياً
    const updatedStats = await updateStatsOnStatusChange(db, oldStatus, normalizedStatus, createdAt);
    const total = updatedStats.total;
    const delivered = updatedStats.delivered;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    const statsPayload = {
      ...updatedStats,
      successRate,
    };

    // تحديث اللوحة بالمعلومة الجديدة مع أحدث الإحصائيات المحدثة
    pushUpdateToDashboards({
      type: "MESSAGE_UPDATED",
      message: { id, status: normalizedStatus, deliveredAt: updateData.deliveredAt },
      oldStatus,
      stats: statsPayload,
    });

    return NextResponse.json({ success: true, stats: statsPayload });
  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
