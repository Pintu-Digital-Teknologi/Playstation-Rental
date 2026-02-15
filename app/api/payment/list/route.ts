import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const data = await db
      .collection("payments")
      .aggregate([
        {
          $lookup: {
            from: "rentals",
            localField: "rentalId",
            foreignField: "_id",
            as: "rental",
          },
        },
        { $unwind: "$rental" },
        {
          $lookup: {
            from: "tvs",
            localField: "rental.tvId",
            foreignField: "_id",
            as: "tv",
          },
        },
        { $unwind: "$tv" },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            payments: [{ $skip: skip }, { $limit: limit }],
          },
        },
      ])
      .toArray();

    const result = data[0];
    const total = result.metadata[0]?.total || 0;
    const payments = result.payments;

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
