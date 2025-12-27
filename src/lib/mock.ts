import { Farm, Sensor, Worker } from "./types";

export const farms: Farm[] = [
  { id: "farm-001", name: "Mavuno Farm", location: "Nyandarua", crop: "Potatoes" },
  { id: "farm-002", name: "Green Valley", location: "Naivasha", crop: "Tomatoes" },
];

export const sensorsByFarm: Record<string, Sensor[]> = {
  "farm-001": [
    {
      id: "S-1001",
      name: "Soil Probe A1",
      type: "soil",
      zone: "Block A",
      status: "online",
      lastSeen: "2 min ago",
      metrics: { moisture: 31, temp: 22, ec: 1.7 },
    },
    {
      id: "S-1002",
      name: "Weather Station",
      type: "weather",
      zone: "HQ",
      status: "warning",
      lastSeen: "12 min ago",
      metrics: { humidity: 58, temp: 24, rain: 0 },
    },
    {
      id: "S-1003",
      name: "Tank Level Sensor",
      type: "water",
      zone: "Pump House",
      status: "offline",
      lastSeen: "3 days ago",
      metrics: { level: 18 },
    },
  ],
  "farm-002": [
    {
      id: "S-2001",
      name: "Soil Probe B2",
      type: "soil",
      zone: "Block B",
      status: "online",
      lastSeen: "5 min ago",
      metrics: { moisture: 28, temp: 23, ec: 1.2 },
    },
  ],
};

export const workersByFarm: Record<string, Worker[]> = {
  "farm-001": [
    { id: "W-1", name: "Grace Wanjiku", phone: "+2547XX XXX XXX", role: "manager", zone: "All" },
    { id: "W-2", name: "Peter Mwangi", phone: "+2547XX XXX XXX", role: "technician", zone: "Block A" },
    { id: "W-3", name: "Amina Hassan", phone: "+2547XX XXX XXX", role: "worker", zone: "Block B" },
  ],
  "farm-002": [
    { id: "W-9", name: "David Otieno", phone: "+2547XX XXX XXX", role: "manager", zone: "All" },
  ],
};

export function kpiFromSensors(sensors: any[]) {
  // rough example KPIs for UI
  const online = sensors.filter((s) => s.status === "online").length;
  const warning = sensors.filter((s) => s.status === "warning").length;
  const offline = sensors.filter((s) => s.status === "offline").length;
  const moistureVals = sensors.map((s) => s.metrics?.moisture).filter((v) => typeof v === "number") as number[];
  const avgMoisture = moistureVals.length ? Math.round(moistureVals.reduce((a,b)=>a+b,0)/moistureVals.length) : null;
  return { online, warning, offline, avgMoisture };
}
