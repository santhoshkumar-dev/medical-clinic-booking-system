"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/auth-client";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Services", href: "/admin/services" },
  { label: "Discounts", href: "/admin/discounts" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Logs", href: "/admin/logs" },
];

export function AdminHeader() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/admin/login";
  };

  return (
    <header className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-xl font-bold">
              🏥 Clinic Admin
            </Link>
            <nav className="flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm transition-colors ${
                    pathname === item.href
                      ? "text-white font-medium"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
