import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // Find active shift
    const activeShift = await db
      .collection("shifts")
      .findOne({ status: "active" });

    if (!activeShift) {
      return NextResponse.json(null); // No active shift
    }

    // Get operator role for permission checks
    let operatorRole = "operator"; // Default fallback
    if (activeShift.operatorId) {
      const operator = await db
        .collection("admins")
        .findOne({ _id: activeShift.operatorId });
      if (operator && operator.role) {
        operatorRole = operator.role;
      }
    }

    // Improve: Aggregate payments/rentals for this shift to get the report data
    // "Laporan aktif berisi laporan data waktu mulai, waktu selesai, Unit atau nama tv, Metode pembayaran dan total biaya."
    // We need to join payments with rentals -> tvs

    // Simplification: We query payments with shiftId = activeShift._id
    // But since I might not have updated payment creation yet, this might be empty.
    // I will try to fetch payments that have shiftId OR (if none) maybe recent payments?
    // Proper way: Payments must have shiftId. I will update payment logic later if needed.

    const transactions = await db
      .collection("payments")
      .aggregate([
        { $match: { shiftId: activeShift._id } },
        {
          $lookup: {
            from: "rentals",
            localField: "rentalId",
            foreignField: "_id",
            as: "rental",
          },
        },
        { $unwind: { path: "$rental", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "tvs",
            localField: "rental.tvId",
            foreignField: "_id",
            as: "tv",
          },
        },
        { $unwind: { path: "$tv", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            startTime: "$rental.startTime",
            endTime: "$rental.endTime",
            tvName: "$tv.name",
            paymentMethod: "$paymentMethod",
            amount: "$amount",
            cashierName: "$cashierName", // Include cashier name
            _id: 1, // payment id
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      ...activeShift,
      operatorRole, // Add this
      transactions,
    });
  } catch (error) {
    console.error("Error fetching active shift:", error);
    return NextResponse.json(
      { error: "Failed to fetch active shift" },
      { status: 500 },
    );
  }
}
