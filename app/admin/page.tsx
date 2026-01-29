"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatsCards } from "@/components/admin/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  quota: {
    limit: number;
    used: number;
    remaining: number;
  };
  bookings: {
    byStatus: Record<string, number>;
    today: number;
  };
  discounts: {
    today: number;
    history: Array<{ date: string; used: number; limit: number }>;
  };
  events: {
    lastHour: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error(data.error);
      }

      setStats(data.stats);
    } catch (err) {
      setError("Failed to load dashboard");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
            {error}
          </div>
        )}

        <StatsCards stats={stats} loading={loading} />

        {stats && stats.discounts.history.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Discount Usage - Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {stats.discounts.history.map((day) => (
                  <div
                    key={day.date}
                    className="text-center p-3 bg-slate-100 rounded-lg"
                  >
                    <div className="text-xs text-slate-500">{day.date}</div>
                    <div className="text-lg font-bold mt-1">
                      {day.used}/{day.limit}
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${Math.min((day.used / day.limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
