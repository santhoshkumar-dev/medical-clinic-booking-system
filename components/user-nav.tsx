"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth/auth-client";

export function UserNav() {
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until hydration is complete
  if (!mounted || isPending) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/auth/signup">
          <Button size="sm">Sign Up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/history">
        <Button variant="ghost" size="sm">
          My Bookings
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
