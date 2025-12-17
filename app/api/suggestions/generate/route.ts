import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ suggestions: ["How are you feeling?", "Analyze my music", "Fix my code"] });
}
