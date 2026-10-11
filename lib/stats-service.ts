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
 * تطبيع الحالات لضمان توافق جميع التسميات القادمة من أجهزة وقراءات الرسائل المختلفة
 */
export function normalizeStatus(status?: string | null): string {
  if (!status) return "pending";
  const s = String(status).trim().toLowerCase().replace(/-/g, "_");
  if (
    s.includes("balance") ||
    s.includes("رصيد") ||
    s === "failed_balance" ||
    s === "balance_failed" ||
    s === "insufficient_balance"
  ) {
    return "failed_balance";
  }
  if (
    s === "sent" ||
    s === "success" ||
    s === "delivered" ||
    s.includes("deliver") ||
    s.includes("succes") ||
    s.includes("نجاح") ||
    s.includes("تم")
  ) {
    return "delivered";
  }
  if (
    s === "failed" ||
    s === "error" ||
    s === "fail" ||
    s.includes("fail") ||
    s.includes("خطأ") ||
    s.includes("فشل")
  ) {
    return "failed";
  }
  if (
    s === "pending" ||
    s === "wait" ||
    s === "waiting" ||
    s.includes("pend") ||
    s.includes("انتظار")
  ) {
    return "pending";
  }
  return s;
}

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
    const status = normalizeStatus(data.status || "pending");
    const rawCreatedAt = Number(data.createdAt);
    const createdAt = !isNaN(rawCreatedAt) && rawCreatedAt > 0 ? rawCreatedAt : Date.now();
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

  await db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID).set(stats);

  return stats;
}

/**
 * تحديث الإحصائيات عند إنشاء رسالة جديدة (زيادة العدادات بأمان ذري عبر transaction)
 */
export async function incrementStatsOnNewMessage(
  db: FirebaseFirestore.Firestore,
  createdAt: number
): Promise<DashboardStats> {
  const validCreatedAt = typeof createdAt === "number" && !isNaN(createdAt) && createdAt > 0 ? createdAt : Date.now();
  const dateKey = new Date(validCreatedAt).toISOString().split("T")[0];
  const statsRef = db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID);

  return await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(statsRef);
    let total = 0;
    let pending = 0;
    let delivered = 0;
    let failed = 0;
    let failedBalance = 0;
    let daily: Record<string, DailyStats> = {};

    if (docSnap.exists) {
      const data = docSnap.data();
      total = Math.max(0, Number(data?.total ?? 0));
      pending = Math.max(0, Number(data?.pending ?? 0));
      delivered = Math.max(0, Number(data?.delivered ?? 0));
      failed = Math.max(0, Number(data?.failed ?? 0));
      failedBalance = Math.max(0, Number(data?.failedBalance ?? 0));
      daily = (data?.daily as Record<string, DailyStats>) || {};
    }

    total += 1;
    pending += 1;

    const currentDay = daily[dateKey] || { total: 0, delivered: 0, pending: 0, failed: 0, failedBalance: 0 };
    daily[dateKey] = {
      total: (currentDay.total || 0) + 1,
      pending: (currentDay.pending || 0) + 1,
      delivered: currentDay.delivered || 0,
      failed: currentDay.failed || 0,
      failedBalance: currentDay.failedBalance || 0,
    };

    const stats: DashboardStats = {
      total,
      pending,
      delivered,
      failed,
      failedBalance,
      daily,
      updatedAt: validCreatedAt,
    };

    transaction.set(statsRef, stats);
    return stats;
  });
}

/**
 * تحديث الإحصائيات عند تغير حالة رسالة (تخفيض قيد الانتظار وزيادة تم التسليم أو فاشلة أو فاشلة للرصيد)
 * يعمل ذرياً بدون تداخل أو تعارض مسارات في فايربيس
 */
export async function updateStatsOnStatusChange(
  db: FirebaseFirestore.Firestore,
  rawOldStatus: string,
  rawNewStatus: string,
  createdAt: number
): Promise<DashboardStats> {
  const oldStatus = normalizeStatus(rawOldStatus);
  const newStatus = normalizeStatus(rawNewStatus);

  if (oldStatus === newStatus) {
    return await getOrInitStats(db);
  }

  const validCreatedAt = typeof createdAt === "number" && !isNaN(createdAt) && createdAt > 0 ? createdAt : Date.now();
  const dateKey = new Date(validCreatedAt).toISOString().split("T")[0];
  const statsRef = db.collection(SETTINGS_COLLECTION).doc(STATS_DOC_ID);

  return await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(statsRef);
    let total = 0;
    let pending = 0;
    let delivered = 0;
    let failed = 0;
    let failedBalance = 0;
    let daily: Record<string, DailyStats> = {};

    if (docSnap.exists) {
      const data = docSnap.data();
      total = Math.max(0, Number(data?.total ?? 0));
      pending = Math.max(0, Number(data?.pending ?? 0));
      delivered = Math.max(0, Number(data?.delivered ?? 0));
      failed = Math.max(0, Number(data?.failed ?? 0));
      failedBalance = Math.max(0, Number(data?.failedBalance ?? 0));
      daily = (data?.daily as Record<string, DailyStats>) || {};
    }

    const currentDay = {
      total: daily[dateKey]?.total ?? 0,
      delivered: daily[dateKey]?.delivered ?? 0,
      pending: daily[dateKey]?.pending ?? 0,
      failed: daily[dateKey]?.failed ?? 0,
      failedBalance: daily[dateKey]?.failedBalance ?? 0,
    };

    // 1. خصم الحالة القديمة
    if (oldStatus === "pending") {
      pending = Math.max(0, pending - 1);
      currentDay.pending = Math.max(0, currentDay.pending - 1);
    } else if (oldStatus === "delivered") {
      delivered = Math.max(0, delivered - 1);
      currentDay.delivered = Math.max(0, currentDay.delivered - 1);
    } else if (oldStatus === "failed") {
      failed = Math.max(0, failed - 1);
      currentDay.failed = Math.max(0, currentDay.failed - 1);
    } else if (oldStatus === "failed_balance") {
      failedBalance = Math.max(0, failedBalance - 1);
      currentDay.failedBalance = Math.max(0, currentDay.failedBalance - 1);
    }

    // 2. إضافة الحالة الجديدة
    if (newStatus === "pending") {
      pending++;
      currentDay.pending++;
    } else if (newStatus === "delivered") {
      delivered++;
      currentDay.delivered++;
    } else if (newStatus === "failed") {
      failed++;
      currentDay.failed++;
    } else if (newStatus === "failed_balance") {
      failedBalance++;
      currentDay.failedBalance++;
    }

    // ضمان اتساق الإجمالي
    total = Math.max(total, pending + delivered + failed + failedBalance);
    currentDay.total = Math.max(currentDay.total || 0, currentDay.pending + currentDay.delivered + currentDay.failed + currentDay.failedBalance);

    daily[dateKey] = currentDay;

    const stats: DashboardStats = {
      total,
      pending,
      delivered,
      failed,
      failedBalance,
      daily,
      updatedAt: Date.now(),
    };

    transaction.set(statsRef, stats);
    return stats;
  });
}
