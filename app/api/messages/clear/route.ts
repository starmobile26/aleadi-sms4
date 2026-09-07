import { getDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

const API_KEY = "ALWADI-OTP-771176611";
const BATCH_SIZE = 400;

export async function DELETE(request: Request) {
  if (request.headers.get("x-api-key") !== API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    let deleted = 0;

    while (true) {
      const snapshot = await db.collection("messages").limit(BATCH_SIZE).get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snapshot.size;

      if (snapshot.size < BATCH_SIZE) break;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("CLEAR MESSAGES ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear messages" },
      { status: 500 },
    );
  }
}