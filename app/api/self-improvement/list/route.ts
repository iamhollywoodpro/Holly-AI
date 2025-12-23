import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all self-improvements for this user
    const improvements = await prisma.selfImprovement.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      improvements,
      count: improvements.length,
    });
  } catch (error) {
    console.error("Error fetching improvements:", error);
    return NextResponse.json(
      { error: "Failed to fetch improvements" },
      { status: 500 }
    );
  }
}
