"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Cpu, Users, User, Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/quick-actions", label: "Quick Actions", icon: Zap },
  { href: "/sensors", label: "Sensors", icon: Cpu },
  { href: "/workers", label: "Workers", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:sticky md:top-0 md:h-screen md:border-r bg-white">
      <div className="px-4 py-4 flex items-center gap-2 border-b">
        <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-soft">
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">SmartFarm</div>
          <div className="text-xs text-gray-500">Farm Dashboard</div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-2xl border border-transparent hover:bg-gray-50",
                active && "bg-emerald-50 border-emerald-100 text-emerald-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <Link href="/select-farm" className="block text-sm text-gray-600 hover:text-gray-900">
          Switch farm
        </Link>
      </div>
    </aside>
  );
}
