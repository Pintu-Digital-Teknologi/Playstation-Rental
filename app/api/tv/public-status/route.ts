// /api/tv/public-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getTVStatus } from "@/lib/tv-control";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const tvs = await db.collection("tvs").find({}).toArray();

    // Map TVs untuk public view dengan status check
    const publicTvs = await Promise.all(
      tvs.map(async (tv) => {
        let timeRemaining = null;
        let accessKey = null;
        let status = tv.status;
        let isOnline = tv.isOnline;

        // 1. Liveness Check (Synced with admin logic)
        if (tv.lastChecked) {
          const lastCheckedTime = new Date(tv.lastChecked).getTime();
          const now = new Date().getTime();
          if (now - lastCheckedTime > 30000) {
            // 30 seconds threshold
            isOnline = false;
          }
        } else {
          isOnline = false;
        }

        // 2. Check active rental and handle expiry
        if (tv.currentRentalId && status === "in-use") {
          const rental = await db
            .collection("rentals")
            .findOne({ _id: tv.currentRentalId });

          if (rental && rental.status === "active") {
            const now = new Date();
            const startTime = new Date(rental.startTime);

            if (rental.type === "hourly" && rental.durationMs) {
              const endTime = new Date(startTime.getTime() + rental.durationMs);

              if (now > endTime) {
                // Rental Expired - Update DB (Side-effect to keep sync)
                await db.collection("rentals").updateOne(
                  { _id: rental._id },
                  {
                    $set: {
                      status: "completed",
                      endTime,
                      updatedAt: new Date(),
                    },
                  },
                );

                await db.collection("tvs").updateOne(
                  { _id: tv._id },
                  {
                    $set: { status: "available", lastChecked: new Date() },
                    $unset: { currentRentalId: "", timerId: "" },
                  },
                );

                // Update local state for response
                status = "available";
              } else {
                // Active Hourly Rental
                const remainingMs = endTime.getTime() - now.getTime();
                timeRemaining = Math.floor(remainingMs / 1000); // in seconds
                accessKey = rental.publicAccessKey;
              }
            } else if (rental.type === "regular") {
              // Regular rental (count up) - always active until manually stopped
              // accessKey might be needed?
              accessKey = rental.publicAccessKey;
            }
          }
        }

        // Override status if TV is offline (and not maintenance which might be intentional)
        if (!isOnline && status !== "maintenance") {
          status = "offline";
        }

        return {
          _id: tv._id.toString(),
          name: tv.name,
          description: tv.description,
          status,
          isOnline,
          accessKey,
          timeRemaining,
        };
      }),
    );

    return NextResponse.json({ tvs: publicTvs });
  } catch (error) {
    console.error("Error fetching public TV status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
