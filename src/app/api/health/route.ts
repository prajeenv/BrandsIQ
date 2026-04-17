import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health - Database health check
 *
 * Pings the database with a simple SELECT 1 query to prevent
 * Supabase from pausing the DB due to inactivity.
 *
 * No authentication required.
 * Called daily by Vercel cron (production) and GitHub Actions (staging).
 */
export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[HEALTH] Database health check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database connection failed",
        },
      },
      { status: 503 }
    );
  }
}
