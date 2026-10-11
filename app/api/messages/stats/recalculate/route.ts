import { getDb } from "@/lib/firebase-admin";
import { recalculateAndSaveStats } from "@/lib/stats-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const db = getDb();
    const stats = await recalculateAndSaveStats(db);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("RECALCULATE STATS ERROR:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
