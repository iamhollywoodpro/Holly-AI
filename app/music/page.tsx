import { Metadata } from "next";
import ARDashboard from "@/components/ar/ARDashboard";

export const metadata: Metadata = {
  title: "A&R Suite - HOLLY",
  description: "Professional music analysis powered by HOLLY AI",
};

export default function MusicPage() {
  return (
    <div className="h-screen">
      <ARDashboard />
    </div>
  );
}
