import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Rental, TVUnit } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessKey: string }> },
) {
  try {
    const { accessKey } = await params;
    const db = await getDatabase();

    // Find rental by access key
    const rental = await db.collection<Rental>("rentals").findOne({
      publicAccessKey: accessKey,
    });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // Get TV info
    const tv = await db.collection<TVUnit>("tvs").findOne({
      _id: rental.tvId,
    });

    // Transform to match CustomerStatus expectation and ensure serialization
    const serializedRental = {
      ...rental,
      _id: rental._id.toString(),
      tvId: rental.tvId.toString(),
      startTime: rental.startTime.toISOString(),
      endTime: rental.endTime ? rental.endTime.toISOString() : undefined,
      createdAt: rental.createdAt.toISOString(),
      updatedAt: rental.updatedAt.toISOString(),
    };

    const serializedTv = tv
      ? {
          ...tv,
          _id: tv._id.toString(),
          lastChecked: tv.lastChecked.toISOString(),
          createdAt: tv.createdAt.toISOString(),
          updatedAt: tv.updatedAt.toISOString(),
        }
      : null;

    return NextResponse.json({ rental: serializedRental, tv: serializedTv });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
