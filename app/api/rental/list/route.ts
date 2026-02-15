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
    const status = searchParams.get("status");

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const totalRentals = await db.collection("rentals").countDocuments(query);
    const totalPages = Math.ceil(totalRentals / limit);

    const rentals = await db
      .collection("rentals")
      .aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "tvs",
            localField: "tvId",
            foreignField: "_id",
            as: "tv",
          },
        },
        {
          $unwind: "$tv",
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return NextResponse.json({ rentals, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching rentals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
