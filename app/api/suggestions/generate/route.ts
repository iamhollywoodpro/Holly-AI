import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ suggestions: ["Tell me about your features", "Analyze my music", "Show me your vision"] });
}
