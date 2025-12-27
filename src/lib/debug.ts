// src/lib/debug.ts (or /lib/debug.ts depending on your project)
export const DBG = (...args: any[]) => {
  if (process.env.NODE_ENV === "production") return;
  console.log("%c[SFDBG]", "color:#10b981;font-weight:700", ...args);
};