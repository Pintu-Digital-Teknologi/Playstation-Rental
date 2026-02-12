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

        // Check actual TV power status
        const tvStatus = await getTVStatus(tv.ipAddress);
        const isOnline = tvStatus.isPoweredOn;

        // Update database jika status berubah
        if (tv.isOnline !== isOnline) {
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                isOnline,
                lastChecked: new Date(),
              },
            },
          );
        }

        // Override status jika TV mati
        if (!isOnline && status !== "maintenance") {
          status = "offline";
        }

        // Check active rental
        if (tv.currentRentalId && status === "in-use") {
          const rental = await db
            .collection("rentals")
            .findOne({ _id: tv.currentRentalId });

          if (rental && rental.status === "active") {
            const now = new Date();
            const startTime = new Date(rental.startTime);
            const endTime = new Date(startTime.getTime() + rental.durationMs);

            if (now < endTime) {
              const remainingMs = endTime.getTime() - now.getTime();
              timeRemaining = Math.floor(remainingMs / 1000); // in seconds
              accessKey = rental.publicAccessKey;
            }
          }
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
