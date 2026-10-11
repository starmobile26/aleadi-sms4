import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { pushUpdateToDashboards } from "@/lib/server-state";
import { updateStatsOnStatusChange } from "@/lib/stats-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing id or status" }, { status: 400 });
    }

    if (status !== "delivered" && status !== "failed" && status !== "failed_balance") {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    const docRef = db.collection("messages").doc(id);
    const docSnap = await docRef.get();

    let oldStatus = "pending";
    let createdAt = now;

    if (docSnap.exists) {
      const data = docSnap.data();
      oldStatus = data?.status || "pending";
      createdAt = Number(data?.createdAt || now);
    }

    const updateData: any = { status };
    if (status === "delivered") {
      updateData.deliveredAt = now;
    }

    await docRef.update(updateData);

    // تحديث مستند الإحصائيات ذرياً
    await updateStatsOnStatusChange(db, oldStatus, status, createdAt);

    // تحديث اللوحة بالمعلومة الجديدة
    pushUpdateToDashboards({
      type: "MESSAGE_UPDATED",
      message: { id, status, deliveredAt: updateData.deliveredAt },
      oldStatus,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
