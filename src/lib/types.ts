export type Role = "owner" | "manager" | "technician" | "worker" | "viewer";

export type Farm = {
  id: string;
  name: string;
  location?: string;
  crop?: string;
};

export type SensorLatest = {
  soilMoisture: number;
  tempC: number;
  vMoist?: number | null;
  vTemp?: number | null;
  timestamp?: Date | null;
  deviceId?: string;
  farmId?: string;
  zoneId?: string;
};

export type Sensor = {
  id: string;
  name: string;
  type: string;         // allow "soil-temp" etc
  zone?: string;
  status: "online" | "offline" | "warning";
  lastSeen: string;
  latest?: SensorLatest;
};

export type Worker = {
  id: string;
  name: string;
  phone?: string;
  role: Role;
  zone?: string;
};