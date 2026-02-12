import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Rental, TVUnit } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Note: In a real app, you might want to protect this with admin auth
    // const admin = await getAdminFromSession();
    // if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDatabase();

    // 1. Get all TVs
    const tvs = await db.collection<TVUnit>("tvs").find({}).toArray();
    const results = [];

    for (const tv of tvs) {
      // 2. Check for an active rental associated with this TV
      const activeRental = await db.collection<Rental>("rentals").findOne({
        tvId: tv._id,
        status: "active",
      });

      if (activeRental) {
        // Calculate current remaining time
        const now = new Date();
        const startTime = new Date(activeRental.startTime);
        const elapsedMilliseconds = now.getTime() - startTime.getTime();
        const remainingMs = Math.max(
          0,
          activeRental.durationMs - elapsedMilliseconds,
        );

        if (remainingMs <= 0) {
          // Rental should be completed
          await db.collection("rentals").updateOne(
            { _id: activeRental._id },
            {
              $set: {
                status: "completed",
                remainingMs: 0,
                endTime: now,
                updatedAt: now,
              },
            },
          );

          // Set TV to available
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                status: "available",
                currentRentalId: null,
                timerId: 0,
                updatedAt: now,
              },
            },
          );
          results.push({ tv: tv.name, status: "completed_rental" });
        } else {
          // Rental still active, ensure TV is in-use
          if (
            tv.status !== "in-use" ||
            tv.currentRentalId?.toString() !== activeRental._id.toString()
          ) {
            await db.collection("tvs").updateOne(
              { _id: tv._id },
              {
                $set: {
                  status: "in-use",
                  currentRentalId: activeRental._id,
                  timerId: Math.floor(remainingMs),
                  updatedAt: now,
                },
              },
            );
            results.push({ tv: tv.name, status: "fixed_to_in-use" });
          } else {
            // Just sync timer
            await db.collection("tvs").updateOne(
              { _id: tv._id },
              {
                $set: {
                  timerId: Math.floor(remainingMs),
                  updatedAt: now,
                },
              },
            );
            results.push({ tv: tv.name, status: "timer_synced" });
          }
        }
      } else {
        // No active rental found for this TV
        // If TV is currently "in-use", fix it to "available"
        if (tv.status === "in-use") {
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                status: "available",
                currentRentalId: null,
                timerId: 0,
                updatedAt: new Date(),
              },
            },
          );
          results.push({ tv: tv.name, status: "fixed_to_available" });
        } else {
          results.push({ tv: tv.name, status: "ok" });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Error syncing all TVs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
