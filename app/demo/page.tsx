import type { Metadata } from "next";
import { DemoWelcome } from "@/components/DemoWelcome";

export const metadata: Metadata = {
  title: "Judge demo · Paidright",
};

export default function DemoPage() {
  return <DemoWelcome />;
}
