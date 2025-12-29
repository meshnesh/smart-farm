"use client";

import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db, auth } from "./firebaseClient";
import { farms as mockFarms, sensorsByFarm } from "./mock";
import { DBG } from "@/lib/debug";

const useFirestore = process.env.NEXT_PUBLIC_USE_FIRESTORE === "true";

function currentUser() {
  return auth().currentUser ?? null;
}

function currentUserOrThrow() {
  const u = currentUser();
  if (!u) throw new Error("Not signed in");
  return u;
}

const formatLastSeen = (ts?: Date | null) => {
  if (!ts) return "—";
  const diffMs = Date.now() - ts.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
};

const statusFromTs = (ts?: Date | null) => {
  if (!ts) return "offline";
  const m = (Date.now() - ts.getTime()) / 60000;
  if (m <= 10) return "online";
  if (m <= 60) return "warning";
  return "offline";
};

function toDateMaybe(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export type ReadingPoint = {
  label: string;
  moisture: number;
  tempC: number;
  timestamp?: Date | null;
};

/** FARMS */
export async function listFarms() {
  if (!useFirestore) {
    DBG("listFarms: useFirestore=false -> returning mockFarms", { count: mockFarms.length });
    return mockFarms;
  }

  const user = currentUser();
  DBG("listFarms: start", { hasUser: !!user, uid: user?.uid ?? null });

  if (!user) {
    DBG("listFarms: no user -> returning []");
    return [];
  }

  const qy = query(collection(db(), "farms"), where("userId", "==", user.uid), limit(100));
  DBG("listFarms: running query", { uid: user.uid });

  const snap = await getDocs(qy);

  DBG("listFarms: query done", {
    size: snap.size,
    docIds: snap.docs.map((d) => d.id),
  });

  return snap.docs.map((d) => {
    const x: any = d.data();
    const canonicalId = d.id;

    return {
      id: canonicalId,
      farmId: canonicalId,
      legacyFarmId: x.farmId ?? null,

      farmName: x.farmName ?? x.name ?? canonicalId,
      name: x.farmName ?? x.name ?? canonicalId,
      location: x.location ?? "",
      crop: x.crop ?? "",
      crops: Array.isArray(x.crops) ? x.crops : [],
      zones: x.zones ?? null,
      sizeInSquareMeters: typeof x.sizeInSquareMeters === "number" ? x.sizeInSquareMeters : null,
      userId: x.userId ?? null,
    };
  });
}

export async function getFarm(farmId: string) {
  if (!useFirestore) {
    DBG("getFarm: useFirestore=false -> null", { farmId });
    return null;
  }

  const user = currentUser();
  DBG("getFarm: start", { farmId, hasUser: !!user, uid: user?.uid ?? null });

  if (!user) {
    DBG("getFarm: no user -> null");
    return null;
  }

  const ref = doc(db(), "farms", farmId);
  const snap = await getDoc(ref);

  DBG("getFarm: got doc", { farmId, exists: snap.exists() });

  if (!snap.exists()) return null;

  const x: any = snap.data();
  DBG("getFarm: data", { docId: snap.id, userId: x.userId ?? null });

  return {
    id: snap.id,
    farmId: snap.id,
    legacyFarmId: x.farmId ?? null,
    farmName: x.farmName ?? x.name ?? snap.id,
    name: x.farmName ?? x.name ?? snap.id,
    location: x.location ?? "",
    crops: Array.isArray(x.crops) ? x.crops : [],
    sizeInSquareMeters: typeof x.sizeInSquareMeters === "number" ? x.sizeInSquareMeters : null,
    zones: x.zones ?? null,
    userId: x.userId ?? null,
  };
}

/**
 * Create a farm.
 * Rules require request.resource.data.farmId == document id.
 */
export async function createFarm(input: {
  farmName: string;
  location: string;
  sizeInSquareMeters: number;
  crops: string[];
  zones: number;
}): Promise<{ farmId: string }> {
  if (!useFirestore) {
    DBG("createFarm: useFirestore=false -> FARM_LOCAL");
    return { farmId: "FARM_LOCAL" };
  }

  const user = currentUserOrThrow();
  DBG("createFarm: start", { uid: user.uid, input });

  const farmsCol = collection(db(), "farms");
  const farmRef = doc(farmsCol);
  const farmId = farmRef.id;

  const payload = {
    farmId,
    farmName: input.farmName,
    location: input.location,
    sizeInSquareMeters: Math.round(input.sizeInSquareMeters),
    crops: input.crops ?? [],
    zones: String(input.zones),
    userId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  DBG("createFarm: writing farm doc", { farmId, payload });
  await setDoc(farmRef, payload, { merge: false });
  DBG("createFarm: done", { farmId });

  return { farmId };
}

/** SENSORS */
export async function listSensors(farmId: string) {
  if (!useFirestore) {
    DBG("listSensors: useFirestore=false -> from mock", { farmId });
    return (sensorsByFarm as any)[farmId] ?? [];
  }

  const user = currentUser();
  DBG("listSensors: start", { farmId, hasUser: !!user, uid: user?.uid ?? null });

  if (!user) return [];

  const qy = query(collection(db(), "sensors"), where("farmId", "==", farmId), limit(500));
  const snap = await getDocs(qy);

  DBG("listSensors: query done", { farmId, size: snap.size, ids: snap.docs.map((d) => d.id) });

  return snap.docs.map((d) => {
    const x: any = d.data();
    const latest: any = x.latest ?? null;
    const ts = toDateMaybe(latest?.timestamp);

    return {
      id: d.id,
      name: x.sensorName ?? x.name ?? d.id,
      type: x.sensorType ?? "unknown",
      zone: x.zoneId ?? latest?.zoneId ?? "Unassigned",
      status: statusFromTs(ts),
      lastSeen: formatLastSeen(ts),
      latest: latest
        ? {
            soilMoisture: typeof latest.soilMoisture === "number" ? latest.soilMoisture : null,
            tempC: typeof latest.tempC === "number" ? latest.tempC : null,
            vMoist: typeof latest.vMoist === "number" ? latest.vMoist : null,
            vTemp: typeof latest.vTemp === "number" ? latest.vTemp : null,
            timestamp: ts,
            deviceId: latest.deviceId,
            farmId: latest.farmId,
            zoneId: latest.zoneId,
          }
        : undefined,
    };
  });
}

/**
 * REALTIME: Subscribe to sensors for a farm
 */
export function subscribeSensors(
  farmId: string,
  onData: (sensors: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!useFirestore) {
    DBG("subscribeSensors: useFirestore=false -> mock emit", { farmId });
    onData((sensorsByFarm as any)[farmId] ?? []);
    return () => {};
  }

  const user = currentUser();
  DBG("subscribeSensors: start", { farmId, hasUser: !!user, uid: user?.uid ?? null });

  if (!user) {
    onData([]);
    const err = Object.assign(new Error("Not signed in"), { code: "auth/not-signed-in" });
    DBG("subscribeSensors: no user -> error", err);
    onError?.(err);
    return () => {};
  }

  const qy = query(collection(db(), "sensors"), where("farmId", "==", farmId), limit(500));

  return onSnapshot(
    qy,
    (snap) => {
      DBG("subscribeSensors: snapshot", { farmId, size: snap.size, ids: snap.docs.map((d) => d.id) });

      const sensors = snap.docs.map((d) => {
        const x: any = d.data();
        const latest: any = x.latest ?? null;
        const ts = toDateMaybe(latest?.timestamp);

        return {
          id: d.id,
          name: x.sensorName ?? x.name ?? d.id,
          type: x.sensorType ?? "unknown",
          zone: x.zoneId ?? latest?.zoneId ?? "Unassigned",
          status: statusFromTs(ts),
          lastSeen: formatLastSeen(ts),
          latest: latest
            ? {
                soilMoisture: typeof latest.soilMoisture === "number" ? latest.soilMoisture : null,
                tempC: typeof latest.tempC === "number" ? latest.tempC : null,
                vMoist: typeof latest.vMoist === "number" ? latest.vMoist : null,
                vTemp: typeof latest.vTemp === "number" ? latest.vTemp : null,
                timestamp: ts,
                deviceId: latest.deviceId,
                farmId: latest.farmId,
                zoneId: latest.zoneId,
              }
            : undefined,
        };
      });

      onData(sensors);
    },
    (err) => {
      DBG("subscribeSensors: ERROR", { farmId, code: (err as any)?.code, message: (err as any)?.message, err });
      onData([]);
      if (onError) onError(err);
      else console.error(err);
    }
  );
}

/** READINGS */
export async function latestReadings(sensorId: string, n = 48) {
  if (!useFirestore) {
    DBG("latestReadings: useFirestore=false -> mock", { sensorId, n });
    const now = Date.now();
    return Array.from({ length: n }).map((_, i) => ({
      timestamp: new Date(now - (n - 1 - i) * 30 * 60 * 1000),
      soilMoisture: 20 + Math.round(Math.sin(i / 3) * 8) + (i % 3),
      tempC: 22 + Math.round(Math.cos(i / 5) * 2),
    }));
  }

  const user = currentUser();
  DBG("latestReadings: start", { sensorId, n, hasUser: !!user, uid: user?.uid ?? null });

  if (!user) return [];

  const qy = query(
    collection(db(), "sensors", sensorId, "readings"),
    orderBy("timestamp", "desc"),
    limit(n)
  );

  const snap = await getDocs(qy);
  DBG("latestReadings: query done", { sensorId, size: snap.size });

  return snap.docs.map((d) => d.data());
}

/**
 * REALTIME: Subscribe to readings for last ~24h (by count)
 */
export function subscribeSensorSeries24h(
  sensorId: string,
  onData: (points: ReadingPoint[]) => void,
  onError?: (err: any) => void,
  n = 48
): Unsubscribe {
  if (!useFirestore) {
    DBG("subscribeSensorSeries24h: useFirestore=false -> mock emit", { sensorId, n });

    const now = Date.now();
    const points: ReadingPoint[] = Array.from({ length: n }).map((_, i) => {
      const dt = new Date(now - (n - 1 - i) * 30 * 60 * 1000);
      return {
        label: `${String(dt.getHours()).padStart(2, "0")}:00`,
        moisture: 20 + Math.round(Math.sin(i / 3) * 8) + (i % 3),
        tempC: 22 + Math.round(Math.cos(i / 5) * 2),
        timestamp: dt,
      };
    });
    onData(points);
    return () => {};
  }

  const user = currentUser();
  DBG("subscribeSensorSeries24h: start", { sensorId, n, hasUser: !!user, uid: user?.uid ?? null });

  if (!user) {
    onData([]);
    const err = Object.assign(new Error("Not signed in"), { code: "auth/not-signed-in" });
    DBG("subscribeSensorSeries24h: no user -> error", err);
    onError?.(err);
    return () => {};
  }

  const qy = query(
    collection(db(), "sensors", sensorId, "readings"),
    orderBy("timestamp", "desc"),
    limit(n)
  );

  return onSnapshot(
    qy,
    (snap) => {
      DBG("subscribeSensorSeries24h: snapshot", { sensorId, size: snap.size });

      const rows = snap.docs.map((d) => d.data());

      const points: ReadingPoint[] = rows
        .slice()
        .reverse()
        .map((r: any) => {
          const dt = toDateMaybe(r.timestamp);
          const label = dt
            ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
            : "—";

          return {
            label,
            moisture: typeof r.soilMoisture === "number" ? r.soilMoisture : 0,
            tempC: typeof r.tempC === "number" ? r.tempC : 0,
            timestamp: dt,
          };
        });

      onData(points);
    },
    (err) => {
      DBG("subscribeSensorSeries24h: ERROR", { sensorId, code: (err as any)?.code, message: (err as any)?.message, err });
      onData([]);
      if (onError) onError(err);
      else console.error(err);
    }
  );
}

export async function sensorSeries24h(sensorId: string, n = 48): Promise<ReadingPoint[]> {
  if (!useFirestore) {
    DBG("sensorSeries24h: useFirestore=false -> mock", { sensorId, n });
    const now = Date.now();
    return Array.from({ length: n }).map((_, i) => {
      const dt = new Date(now - (n - 1 - i) * 30 * 60 * 1000);
      return {
        label: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
        moisture: 20 + Math.round(Math.sin(i / 3) * 8) + (i % 3),
        tempC: 22 + Math.round(Math.cos(i / 5) * 2),
        timestamp: dt,
      };
    });
  }

  const rows = await latestReadings(sensorId, n);
  return rows
    .slice()
    .reverse()
    .map((r: any) => {
      const dt = toDateMaybe(r.timestamp);
      return {
        label: dt
          ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
          : "—",
        moisture: typeof r.soilMoisture === "number" ? r.soilMoisture : 0,
        tempC: typeof r.tempC === "number" ? r.tempC : 0,
        timestamp: dt,
      };
    });
}

export async function getUserProfile(userId: string) {
  if (!useFirestore) return null;

  const u = currentUser();
  if (!u) return null;

  // Only allow fetching self profile from client
  if (u.uid !== userId) throw new Error("Not authorized");

  const ref = doc(db(), "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  return { id: snap.id, ...(snap.data() as any) };
}

export async function updateUserProfile(
  userId: string,
  input: {
    firstName: string;
    secondName: string;
    phone?: string;
    location?: string;
    interestedIn?: string;
  }
) {
  if (!useFirestore) return;

  const u = currentUserOrThrow();
  if (u.uid !== userId) throw new Error("Not authorized");

  const ref = doc(db(), "users", userId);

  await updateDoc(ref, {
    firstName: input.firstName ?? "",
    secondName: input.secondName ?? "",
    phone: input.phone ?? "",
    location: input.location ?? "",
    interestedIn: input.interestedIn ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function updateFarm(
  farmId: string,
  input: {
    farmName: string;
    location: string;
    sizeInSquareMeters: number;
    crops: string[];
  }
) {
  if (!useFirestore) return;

  const u = currentUserOrThrow();

  const ref = doc(db(), "farms", farmId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Farm not found");

  const x: any = snap.data();
  if (x.userId !== u.uid) throw new Error("Not authorized");

  // DO NOT touch userId or farmId here
  await updateDoc(ref, {
    farmName: input.farmName,
    location: input.location,
    sizeInSquareMeters: Math.round(input.sizeInSquareMeters),
    crops: input.crops ?? [],
    updatedAt: serverTimestamp(),
  });
}