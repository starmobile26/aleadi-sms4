// Global in-memory state for managing SSE Connections
// Uses globalThis to ensure singleton state across hot-reloads and API routes

export type MessageType = {
  id: string;
  phone: string;
  message: string;
  createdAt: number;
  status: string;
  deliveredAt?: number;
  type?: "NEW_MESSAGE";
};

interface ServerState {
  readerStreams: Set<ReadableStreamDefaultController<any>>;
  dashboardStreams: Set<ReadableStreamDefaultController<any>>;
  lastCleanupTime: number;
}

const globalForState = globalThis as unknown as {
  __smsServerState?: ServerState;
  __smsMaintenanceMode?: boolean;
};

export const serverState: ServerState = globalForState.__smsServerState || {
  readerStreams: new Set(),
  dashboardStreams: new Set(),
  lastCleanupTime: Date.now(),
};

import { getDb } from "./firebase-admin";

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const db = getDb();
    const doc = await db.collection("settings").doc("app").get();
    if (doc.exists) {
      return doc.data()?.maintenanceMode ?? false;
    }
  } catch (e) {
    console.error("Error reading maintenance mode", e);
  }
  return false;
}

export async function setMaintenanceMode(mode: boolean) {
  try {
    const db = getDb();
    await db.collection("settings").doc("app").set({ maintenanceMode: mode }, { merge: true });
    pushUpdateToDashboards({ type: "MAINTENANCE_STATUS", maintenanceMode: mode });
  } catch (e) {
    console.error("Error setting maintenance mode", e);
  }
}

if (process.env.NODE_ENV !== "production") {
  globalForState.__smsServerState = serverState;
}

// Check if reader is connected
export function isReaderConnected(): boolean {
  return serverState.readerStreams.size > 0;
}

// Push message to all active readers
export function pushMessageToReaders(message: MessageType) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  serverState.readerStreams.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      console.error("Error sending to reader stream", e);
    }
  });
}

// Push updates to dashboards (status change, new message, etc)
export function pushUpdateToDashboards(payload: any) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  serverState.dashboardStreams.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      console.error("Error sending to dashboard stream", e);
    }
  });
}

// Notify dashboards about reader connection status change
export function notifyDashboardsReaderStatus() {
  pushUpdateToDashboards({ type: "READER_STATUS", connected: isReaderConnected() });
}
