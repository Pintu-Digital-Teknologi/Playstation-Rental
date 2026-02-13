import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check if id is valid ObjectId (or a string representing 'active' which shouldn't happen here as params is id)
    // If id is 'active', forward to active route logic? No, active route handles active.

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const shiftId = new ObjectId(id);

    const transactions = await db
      .collection("payments")
      .aggregate([
        { $match: { shiftId: shiftId } },
        {
          $lookup: {
            from: "rentals",
            localField: "rentalId",
            foreignField: "_id",
            as: "rental",
          },
        },
        { $unwind: { path: "$rental", preserveNullAndEmptyArrays: true } }, // Preserve payments without rental (e.g. direct sales if any)
        {
          $lookup: {
            from: "tvunits",
            localField: "rental.tvId",
            foreignField: "_id",
            as: "tv",
          },
        },
        { $unwind: { path: "$tv", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            paymentId: "$_id",
            startTime: "$rental.startTime",
            endTime: "$rental.endTime",
            tvName: "$tv.name", // If no rental/tv, this will be null
            description: "$rental.customerName", // Or "Payment"
            paymentMethod: "$paymentMethod",
            amount: "$amount",
            createdAt: "$createdAt",
          },
        },
      ])
      .toArray();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}
