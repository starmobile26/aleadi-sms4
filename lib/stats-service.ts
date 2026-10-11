import { FieldValue } from "firebase-admin/firestore";

export type DailyStats = {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  failedBalance: number;
};

export type DashboardStats = {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  failedBalance: number;
  daily: Record<string, DailyStats>;
  updatedAt: number;
};

const SETTINGS_COLLECTION = "settings";
const STATS_DOC_ID = "stats";

/**
 * جلب الإحصائيات الشاملة من ملف الإحصائيات المخصص (مستند واحد = قراءة واحدة فقط في فايربيس)
 * إذا لم يكن الملف موجوداً مسبقاً، يقوم بحسابها لأول مرة وحفظها لتقليل القراءات مستقبلاً.
 */
export async function getOrInitStats(db: FirebaseFirestore.Firestore): Promise<DashboardStats> {
  const statsRef = db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID);
  const docSnap = await statsRef.get();

  if (docSnap.exists) {
    const data = docSnap.data();
    return {
      total: Math.max(0, Number(data?.total ?? 0)),
      pending: Math.max(0, Number(data?.pending ?? 0)),
      delivered: Math.max(0, Number(data?.delivered ?? 0)),
      failed: Math.max(0, Number(data?.failed ?? 0)),
      failedBalance: Math.max(0, Number(data?.failedBalance ?? 0)),
      daily: (data?.daily as Record<string, DailyStats>) || {},
      updatedAt: Number(data?.updatedAt ?? Date.now()),
    };
  }

  // إذا لم يكن المستند منشأ، نقوم بحسابه وحفظه مرة واحدة
  return await recalculateAndSaveStats(db);
}

/**
 * إعادة حساب الإحصائيات بالكامل من مجموعة الرسائل وحفظها في مستند الإحصائيات
 */
export async function recalculateAndSaveStats(db: FirebaseFirestore.Firestore): Promise<DashboardStats> {
  const snapshot = await db.collection("messages").get();

  let total = 0;
  let pending = 0;
  let delivered = 0;
  let failed = 0;
  let failedBalance = 0;
  const daily: Record<string, DailyStats> = {};

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const status = data.status || "pending";
    const createdAt = Number(data.createdAt || Date.now());
    const dateKey = new Date(createdAt).toISOString().split("T")[0];

    total++;
    if (!daily[dateKey]) {
      daily[dateKey] = { total: 0, delivered: 0, pending: 0, failed: 0, failedBalance: 0 };
    }
    daily[dateKey].total++;

    if (status === "delivered") {
      delivered++;
      daily[dateKey].delivered++;
    } else if (status === "failed") {
      failed++;
      daily[dateKey].failed++;
    } else if (status === "failed_balance") {
      failedBalance++;
      daily[dateKey].failedBalance++;
    } else {
      pending++;
      daily[dateKey].pending++;
    }
  });

  const stats: DashboardStats = {
    total,
    pending,
    delivered,
    failed,
    failedBalance,
    daily,
    updatedAt: Date.now(),
  };

  await db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID).set(stats, { merge: true });

  return stats;
}

/**
 * تحديث الإحصائيات عند إنشاء رسالة جديدة (زيادة العدادات ذرياً)
 */
export async function incrementStatsOnNewMessage(
  db: FirebaseFirestore.Firestore,
  createdAt: number
): Promise<void> {
  const dateKey = new Date(createdAt).toISOString().split("T")[0];
  const statsRef = db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID);

  await statsRef.set(
    {
      total: FieldValue.increment(1),
      pending: FieldValue.increment(1),
      [`daily.${dateKey}.total`]: FieldValue.increment(1),
      [`daily.${dateKey}.pending`]: FieldValue.increment(1),
      updatedAt: createdAt,
    },
    { merge: true }
  );
}

/**
 * تحديث الإحصائيات عند تغير حالة رسالة (مثلاً: من معلقة إلى مستلمة أو فاشلة)
 */
export async function updateStatsOnStatusChange(
  db: FirebaseFirestore.Firestore,
  oldStatus: string,
  newStatus: string,
  createdAt: number
): Promise<void> {
  if (oldStatus === newStatus) return;

  const dateKey = new Date(createdAt).toISOString().split("T")[0];
  const statsRef = db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID);

  const statusFieldMap: Record<string, string> = {
    pending: "pending",
    delivered: "delivered",
    failed: "failed",
    failed_balance: "failedBalance",
  };

  const oldField = statusFieldMap[oldStatus];
  const newField = statusFieldMap[newStatus];

  const updates: Record<string, any> = {
    updatedAt: Date.now(),
  };

  if (oldField) {
    updates[oldField] = FieldValue.increment(-1);
    updates[`daily.${dateKey}.${oldField}`] = FieldValue.increment(-1);
  }

  if (newField) {
    updates[newField] = FieldValue.increment(1);
    updates[`daily.${dateKey}.${newField}`] = FieldValue.increment(1);
  }

  await statsRef.set(updates, { merge: true });
}
