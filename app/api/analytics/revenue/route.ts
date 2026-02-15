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

    // Date Filtering Logic
    let startDate: Date;
    let endDate: Date = new Date(); // Default to now

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const daysParam = searchParams.get("days");

    if (fromParam) {
      startDate = new Date(fromParam);
      if (toParam) {
        endDate = new Date(toParam);
        // Set end date to end of day if it's the same or effectively the "to" date
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      const days = parseInt(daysParam || "30");
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Ensure startDate is at start of day
    startDate.setHours(0, 0, 0, 0);

    const dateMatch = {
      status: "paid",
      paidDate: { $gte: startDate, $lte: endDate },
    };

    // Revenue by date
    const revenueByDate = await db
      .collection("payments")
      .aggregate([
        { $match: dateMatch },
        {
          $lookup: {
            from: "rentals",
            localField: "rentalId",
            foreignField: "_id",
            as: "rental",
          },
        },
        {
          $unwind: { path: "$rental", preserveNullAndEmptyArrays: true },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$paidDate" },
            },
            revenue: { $sum: "$amount" },
            addOnRevenue: { $sum: { $ifNull: ["$rental.addOnsCost", 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Payment Method Analysis
    const paymentMethods = await db
      .collection("payments")
      .aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $ifNull: ["$paymentMethod", "unknown"] },
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
        { $sort: { revenue: -1 } },
      ])
      .toArray();

    // Top Selling Add-ons
    const popularAddOns = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: "completed",
            addOns: { $exists: true, $ne: [] },
          },
        },
        { $unwind: "$addOns" },
        {
          $group: {
            _id: "$addOns.name",
            quantity: { $sum: "$addOns.quantity" },
            revenue: { $sum: "$addOns.total" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    // TV utilization
    const tvUtilization = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$tvId",
            totalDurationMs: { $sum: "$durationMs" },
            rentalCount: { $sum: 1 },
            revenue: { $sum: "$totalPrice" },
          },
        },
        {
          $lookup: {
            from: "tvs",
            localField: "_id",
            foreignField: "_id",
            as: "tv",
          },
        },
        { $unwind: "$tv" },
        {
          $project: {
            tvId: "$_id",
            tvName: "$tv.name",
            totalHours: { $divide: ["$totalDurationMs", 3600000] },
            rentalCount: 1,
            revenue: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ])
      .toArray();

    // Peak Hours Analysis
    const peakHours = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ["active", "completed"] },
          },
        },
        {
          $project: {
            hour: { $hour: { date: "$startTime", timezone: "Asia/Jakarta" } },
          },
        },
        {
          $group: {
            _id: "$hour",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Rental Type Distribution
    const rentalTypes = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ["active", "completed"] },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            revenue: { $sum: "$totalPrice" },
          },
        },
      ])
      .toArray();

    // Total summary
    const totalRevenue = revenueByDate.reduce(
      (sum, day) => sum + day.revenue,
      0,
    );
    const totalAddOnRevenue = revenueByDate.reduce(
      (sum, day) => sum + (day.addOnRevenue || 0),
      0,
    );
    const totalRentals = await db
      .collection("rentals")
      .countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });

    // Calculate days diff for average
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalAddOnRevenue,
        totalRentals,
        averageRevenuePerDay: totalRevenue / diffDays,
      },
      revenueByDate,
      tvUtilization,
      peakHours,
      rentalTypes,
      popularAddOns,
      paymentMethods,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
