import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const shiftId = new ObjectId(id);

    // Verify shift exists and is active
    const shift = await db.collection("shifts").findOne({ _id: shiftId });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.status !== "active") {
      return NextResponse.json(
        { error: "Shift is not active" },
        { status: 400 },
      );
    }

    // Calculate final totals from paid payments
    // This ensures accuracy even if incremental updates missed something
    const aggregation = await db
      .collection("payments")
      .aggregate([
        {
          $match: {
            shiftId: shiftId,
            status: "paid", // Only count paid transactions for revenue
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalTransactions: { $count: {} },
          },
        },
      ])
      .toArray();

    const totals = aggregation[0] || { totalRevenue: 0, totalTransactions: 0 };

    // Update shift to completed
    await db.collection("shifts").updateOne(
      { _id: shiftId },
      {
        $set: {
          status: "completed",
          endTime: new Date(),
          totalRevenue: totals.totalRevenue,
          totalTransactions: totals.totalTransactions,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        ...shift,
        status: "completed",
        endTime: new Date(),
        totalRevenue: totals.totalRevenue,
        totalTransactions: totals.totalTransactions,
      },
    });
  } catch (error) {
    console.error("Error ending shift:", error);
    return NextResponse.json({ error: "Failed to end shift" }, { status: 500 });
  }
}
