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
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { db, auth } from "./firebaseClient";
import { farms as mockFarms, sensorsByFarm } from "./mock";

const useFirestore = process.env.NEXT_PUBLIC_USE_FIRESTORE === "true";

function currentUser() {
  return auth().currentUser ?? null;
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
  label: string; // "13:00"
  moisture: number;
  tempC: number;
  timestamp?: Date | null;
};

/** FARMS */
export async function listFarms() {
  if (!useFirestore) return mockFarms;

  const user = currentUser();
  if (!user) return []; // avoid crashes; UI should redirect to login

  const qy = query(collection(db(), "farms"), where("userId", "==", user.uid), limit(100));
  const snap = await getDocs(qy);

  return snap.docs.map((d) => {
    const x: any = d.data();
    return {
      id: d.id,
      farmId: x.farmId ?? d.id,
      farmName: x.farmName ?? x.name ?? d.id,
      name: x.farmName ?? x.name ?? d.id,
      location: x.location ?? "",
      crop: x.crop ?? "",
      crops: Array.isArray(x.crops) ? x.crops : undefined,
      sizeInSquareMeters: typeof x.sizeInSquareMeters === "number" ? x.sizeInSquareMeters : undefined,
      zones: x.zones ?? undefined,
      userId: x.userId ?? undefined,
    };
  });
}

export async function getFarm(farmId: string) {
  if (!useFirestore) return null;

  const user = currentUser();
  if (!user) return null;

  const ref = doc(db(), "farms", farmId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const x: any = snap.data();
  return {
    id: snap.id,
    farmId: x.farmId ?? snap.id,
    farmName: x.farmName ?? x.name ?? snap.id,
    name: x.farmName ?? x.name ?? snap.id,
    location: x.location ?? "",
    crops: Array.isArray(x.crops) ? x.crops : [],
    sizeInSquareMeters: typeof x.sizeInSquareMeters === "number" ? x.sizeInSquareMeters : null,
    zones: x.zones ?? null,
    userId: x.userId ?? null,
  };
}

export async function createFarm(input: {
  farmName: string;
  location: string;
  sizeInSquareMeters: number;
  crops: string[];
  zones: number;
}): Promise<{ farmId: string }> {
  if (!useFirestore) {
    // mock mode
    return { farmId: "FARM_LOCAL" };
  }

  const user = currentUser();
  if (!user) throw new Error("Not signed in");

  // Your rules require request.resource.data.farmId == document id.
  // Generate doc id first, then setDoc with farmId = that id.
  const farmsCol = collection(db(), "farms");
  const farmRef = doc(farmsCol);
  const farmId = farmRef.id;

  const payload = {
    farmId,
    farmName: input.farmName,
    location: input.location,
    sizeInSquareMeters: input.sizeInSquareMeters,
    crops: input.crops ?? [],
    zones: String(input.zones), // keep compatible with your existing data (string)
    userId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(farmRef, payload, { merge: false });
  return { farmId };
}

/** SENSORS */
export async function listSensors(farmId: string) {
  if (!useFirestore) return (sensorsByFarm as any)[farmId] ?? [];

  const user = currentUser();
  if (!user) return [];

  const qy = query(collection(db(), "sensors"), where("farmId", "==", farmId), limit(500));
  const snap = await getDocs(qy);

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
    onData((sensorsByFarm as any)[farmId] ?? []);
    return () => {};
  }

  const user = currentUser();
  if (!user) {
    onData([]);
    onError?.(Object.assign(new Error("Not signed in"), { code: "auth/not-signed-in" }));
    return () => {};
  }

  const qy = query(collection(db(), "sensors"), where("farmId", "==", farmId), limit(500));

  return onSnapshot(
    qy,
    (snap) => {
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
      onData([]);
      if (onError) onError(err);
      else console.error(err);
    }
  );
}

/** READINGS */
export async function latestReadings(sensorId: string, n = 48) {
  if (!useFirestore) {
    const now = Date.now();
    return Array.from({ length: n }).map((_, i) => ({
      timestamp: new Date(now - (n - 1 - i) * 30 * 60 * 1000),
      soilMoisture: 20 + Math.round(Math.sin(i / 3) * 8) + (i % 3),
      tempC: 22 + Math.round(Math.cos(i / 5) * 2),
    }));
  }

  const user = currentUser();
  if (!user) return [];

  const qy = query(collection(db(), "sensors", sensorId, "readings"), orderBy("timestamp", "desc"), limit(n));
  const snap = await getDocs(qy);

  return snap.docs.map((d) => d.data());
}

/**
 * REALTIME: Subscribe to readings for last ~24h (by count, not strict time window).
 */
export function subscribeSensorSeries24h(
  sensorId: string,
  onData: (points: ReadingPoint[]) => void,
  onError?: (err: any) => void,
  n = 48
): Unsubscribe {
  if (!useFirestore) {
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
  if (!user) {
    onData([]);
    onError?.(Object.assign(new Error("Not signed in"), { code: "auth/not-signed-in" }));
    return () => {};
  }

  const qy = query(collection(db(), "sensors", sensorId, "readings"), orderBy("timestamp", "desc"), limit(n));

  return onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => d.data());

      // oldest -> newest for charts
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
      onData([]);
      if (onError) onError(err);
      else console.error(err);
    }
  );
}

// Backwards compatible (non-realtime fetch)
export async function sensorSeries24h(sensorId: string, n = 48): Promise<ReadingPoint[]> {
  if (!useFirestore) {
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