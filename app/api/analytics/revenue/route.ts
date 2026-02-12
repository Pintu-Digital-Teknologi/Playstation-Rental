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

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days") || "30";
    const days = parseInt(daysParam);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue by date
    // Revenue by date with Add-on split
    const revenueByDate = await db
      .collection("payments")
      .aggregate([
        {
          $match: {
            status: "paid",
            paidDate: { $gte: startDate },
          },
        },
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
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    // Top Selling Add-ons (Food & Beverage)
    const popularAddOns = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
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

    // TV utilization (Only completed rentals for accurate duration calculation)
    const tvUtilization = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: "completed",
          },
        },
        {
          $group: {
            _id: "$tvId",
            totalDurationMs: { $sum: "$durationMs" },
            rentalCount: { $sum: 1 },
            revenue: {
              $sum: "$totalPrice", // Revenue is tracked in rentals too, though payments is source of truth for "Paid" revenue.
            },
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
        {
          $unwind: "$tv",
        },
        {
          $project: {
            tvId: "$_id",
            tvName: "$tv.name",
            totalHours: { $divide: ["$totalDurationMs", 3600000] }, // Convert ms to hours
            rentalCount: 1,
            revenue: 1,
          },
        },
        {
          $sort: { revenue: -1 },
        },
      ])
      .toArray();

    // Peak Hours Analysis (0-23) - Include Active & Completed
    const peakHours = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
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
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    // Rental Type Distribution - Include Active & Completed
    const rentalTypes = await db
      .collection("rentals")
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ["active", "completed"] },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            revenue: { $sum: "$totalPrice" }, // Note: Active rentals might have provisional price, but for type distribution count is key.
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
      .countDocuments({ createdAt: { $gte: startDate } });

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalAddOnRevenue,
        totalRentals,
        averageRevenuePerDay: totalRevenue / days,
      },
      revenueByDate,
      tvUtilization,
      peakHours,
      rentalTypes,
      popularAddOns,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
