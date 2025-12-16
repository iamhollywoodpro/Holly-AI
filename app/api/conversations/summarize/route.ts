import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ summary: "Summary temporarily disabled during brain recovery." });
}
