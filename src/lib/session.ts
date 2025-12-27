"use client";

const FARM_KEY = "sf.currentFarmId";

export function getCurrentFarmId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(FARM_KEY);
}

export function setCurrentFarmId(farmId: string) {
  window.localStorage.setItem(FARM_KEY, farmId);
}

export function clearCurrentFarmId() {
  window.localStorage.removeItem(FARM_KEY);
}
