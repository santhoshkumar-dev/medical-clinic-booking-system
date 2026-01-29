"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
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
  } | null;
  loading?: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-slate-500">Failed to load stats</div>;
  }

  const confirmedBookings = stats.bookings.byStatus.confirmed || 0;
  const failedBookings = stats.bookings.byStatus.failed || 0;
  const pendingBookings = stats.bookings.byStatus.pending || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Quota Usage Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.quota.used}/{stats.quota.limit}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {stats.quota.remaining} remaining
          </p>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${Math.min((stats.quota.used / stats.quota.limit) * 100, 100)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Bookings Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.bookings.today}</div>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="text-emerald-600">✓ {confirmedBookings}</span>
            <span className="text-red-600">✗ {failedBookings}</span>
            <span className="text-amber-600">⏳ {pendingBookings}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Discounts Granted Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.discounts.today}</div>
          <p className="text-xs text-slate-500 mt-1">12% discount applied</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            Events (Last Hour)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.events.lastHour}</div>
          <p className="text-xs text-slate-500 mt-1">Audit log entries</p>
        </CardContent>
      </Card>
    </div>
  );
}
