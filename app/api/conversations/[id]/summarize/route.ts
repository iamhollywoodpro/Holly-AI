import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ summary: "Summary online." });
}
export async function POST() {
  return NextResponse.json({ summary: "Summary online." });
}
