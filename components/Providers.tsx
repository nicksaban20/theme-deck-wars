"use client";

import { ReactNode } from "react";
import { ArtStyleProvider } from "@/lib/ArtStyleContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ArtStyleProvider>
      {children}
    </ArtStyleProvider>
  );
}

