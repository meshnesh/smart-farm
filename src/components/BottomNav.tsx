"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Cpu, Users, User } from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/quick-actions", label: "Actions", icon: Zap },
  { href: "/sensors", label: "Sensors", icon: Cpu },
  { href: "/workers", label: "Workers", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl",
                active ? "text-emerald-700" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
