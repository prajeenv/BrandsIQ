import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { paginationSchema } from "@/lib/validations";
import { FOUNDER_INQUIRY_TYPES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/founder-inquiries
 *
 * Founder-only list of inquiries with pagination and optional filters.
 * See MVP.md Section 13.4. Non-founders get 404 (no route disclosure).
 *
 * Query params:
 *  - page (default 1), limit (default 20, max 100)
 *  - type — filter by inquiry type
 *  - resolved — "true" | "false" | omit for "all"
 *
 * Returns paginated list with submitter info, message, resolved status, and
 * the linked user (if known) so the admin UI can render context without a
 * second round trip.
 */
function notFound() {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!isFounder(session)) {
    return notFound();
  }

  const url = new URL(request.url);
  const paginationParsed = paginationSchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!paginationParsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid pagination",
          details: paginationParsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  const { page, limit } = paginationParsed.data;
  const skip = (page - 1) * limit;

  const typeFilter = url.searchParams.get("type");
  const resolvedFilter = url.searchParams.get("resolved");

  const where: Prisma.FounderInquiryWhereInput = {};
  if (typeFilter && FOUNDER_INQUIRY_TYPES.includes(typeFilter as (typeof FOUNDER_INQUIRY_TYPES)[number])) {
    where.type = typeFilter;
  }
  if (resolvedFilter === "true") {
    where.resolvedAt = { not: null };
  } else if (resolvedFilter === "false") {
    where.resolvedAt = null;
  }

  const [inquiries, totalCount] = await Promise.all([
    prisma.founderInquiry.findMany({
      where,
      orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, name: true, isBetaUser: true, tier: true },
        },
      },
    }),
    prisma.founderInquiry.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      inquiries: inquiries.map((inquiry) => ({
        id: inquiry.id,
        type: inquiry.type,
        source: inquiry.source,
        submitterName: inquiry.submitterName,
        submitterEmail: inquiry.submitterEmail,
        businessName: inquiry.businessName,
        message: inquiry.message,
        createdAt: inquiry.createdAt,
        resolvedAt: inquiry.resolvedAt,
        founderNotes: inquiry.founderNotes,
        user: inquiry.user,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    },
  });
}
