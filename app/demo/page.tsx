import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Figtree } from "next/font/google";
import DemoPlayer from "@/components/DemoPlayer";
import "../landing.css";
import "./demo.css";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--lp-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lp-body" });

export const metadata: Metadata = {
  title: "See Relay in action",
  description:
    "Click through a real conversation: a teacher writes in English, a parent reads and replies in Spanish, and Relay translates both ways over plain text messages.",
};

export default function DemoPage() {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <main className="dm-page">
        <DemoPlayer />
      </main>
    </div>
  );
}
