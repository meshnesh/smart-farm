// src/lib/mock.ts
// Demo/mock data used when NEXT_PUBLIC_USE_FIRESTORE !== "true"

export const farms = [
  {
    id: "FARM123",
    farmId: "FARM123",
    farmName: "Demo Farm (Mock)",
    name: "Demo Farm (Mock)",
    location: "Nyandarua, Kenya",
    crops: ["Potatoes", "Cabbage"],
    zones: 3,
    sizeInSquareMeters: 25000,
    userId: "MOCK_USER",
  },
  {
    id: "FARM456",
    farmId: "FARM456",
    farmName: "Green Valley (Mock)",
    name: "Green Valley (Mock)",
    location: "Nakuru, Kenya",
    crops: ["Tomatoes", "Onions"],
    zones: 2,
    sizeInSquareMeters: 12000,
    userId: "MOCK_USER",
  },
];

// Sensors grouped by farmId.
// IMPORTANT: Must match the shape your UI expects: { id, name, type, zone, status, lastSeen, latest }
const now = Date.now();

function minutesAgo(min: number) {
  return new Date(now - min * 60 * 1000);
}

export const sensorsByFarm: Record<string, any[]> = {
  FARM123: [
    {
      id: "S-1001",
      name: "Moisture Sensor A",
      type: "moisture-temp",
      zone: "Zone 1",
      status: "online",
      lastSeen: "2 min ago",
      latest: {
        soilMoisture: 31,
        tempC: 22,
        vMoist: 3.1,
        vTemp: 0.22,
        timestamp: minutesAgo(2),
        deviceId: "DEV-001",
        farmId: "FARM123",
        zoneId: "Zone 1",
      },
    },
    {
      id: "S-1002",
      name: "Moisture Sensor B",
      type: "moisture-temp",
      zone: "Zone 2",
      status: "warning",
      lastSeen: "18 min ago",
      latest: {
        soilMoisture: 24,
        tempC: 23,
        vMoist: 2.4,
        vTemp: 0.23,
        timestamp: minutesAgo(18),
        deviceId: "DEV-002",
        farmId: "FARM123",
        zoneId: "Zone 2",
      },
    },
    {
      id: "S-1003",
      name: "Moisture Sensor C",
      type: "moisture-temp",
      zone: "Zone 3",
      status: "offline",
      lastSeen: "3 hr ago",
      latest: {
        soilMoisture: 19,
        tempC: 21,
        vMoist: 1.9,
        vTemp: 0.21,
        timestamp: minutesAgo(180),
        deviceId: "DEV-003",
        farmId: "FARM123",
        zoneId: "Zone 3",
      },
    },
  ],

  FARM456: [
    {
      id: "S-2001",
      name: "Tomato Bed Sensor",
      type: "moisture-temp",
      zone: "Zone 1",
      status: "online",
      lastSeen: "just now",
      latest: {
        soilMoisture: 46,
        tempC: 24,
        vMoist: 4.6,
        vTemp: 0.24,
        timestamp: minutesAgo(0),
        deviceId: "DEV-004",
        farmId: "FARM456",
        zoneId: "Zone 1",
      },
    },
    {
      id: "S-2002",
      name: "Onion Row Sensor",
      type: "moisture-temp",
      zone: "Zone 2",
      status: "online",
      lastSeen: "6 min ago",
      latest: {
        soilMoisture: 41,
        tempC: 23,
        vMoist: 4.1,
        vTemp: 0.23,
        timestamp: minutesAgo(6),
        deviceId: "DEV-005",
        farmId: "FARM456",
        zoneId: "Zone 2",
      },
    },
  ],
};