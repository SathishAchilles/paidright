"use client";

import { use } from "react";
import { browser } from "react-dom";

export function BrowserOnly({ children }: { children: React.ReactNode }) {
  use(browser("Deals are stored in this browser's localStorage."));
  return <>{children}</>;
}
