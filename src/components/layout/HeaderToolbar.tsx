"use client";

import { HeaderAuth } from "@/components/layout/HeaderAuth";

export function HeaderToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
      {children}
      <div className="md:hidden shrink-0">
        <HeaderAuth variant="mobile" />
      </div>
    </div>
  );
}
