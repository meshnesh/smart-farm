"use client";

const FARM_KEY = "sf.currentFarmId";

export function getCurrentFarmId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FARM_KEY);
  } catch {
    return null;
  }
}

export function setCurrentFarmId(farmId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FARM_KEY, farmId);
}

export function clearCurrentFarmId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FARM_KEY);
}