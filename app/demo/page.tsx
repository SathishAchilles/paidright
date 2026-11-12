import type { Metadata } from "next";
import { DemoWelcome } from "@/components/DemoWelcome";

export const metadata: Metadata = {
  title: "Judge demo · PaidRight",
};

export default function DemoPage() {
  return <DemoWelcome />;
}
