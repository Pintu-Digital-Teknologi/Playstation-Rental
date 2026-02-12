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
      ])
      .toArray();

    return NextResponse.json({ rentals });
  } catch (error) {
    console.error("Error fetching rentals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
