// app/api/cron/sync-rentals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Rental } from "@/lib/types";
import { publishTVAction } from "@/lib/mqtt";

export async function GET(request: NextRequest) {
  try {
    // Verifikasi authorization (gunakan secret key)
    // const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_KEY;

    if (!expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const now = new Date();

    // Ambil semua rental yang masih aktif
    const activeRentals = await db
      .collection<Rental>("rentals")
      .find({ status: "active" })
      .toArray();

    let completedCount = 0;
    let updatedCount = 0;

    // Sync setiap rental
    for (const rental of activeRentals) {
      const startTime = new Date(rental.startTime);
      let remainingMs = 0;

      if (rental.type === "regular") {
        // Regular rentals don't expire automatically
        remainingMs = 0;
      } else {
        const elapsedMs = now.getTime() - startTime.getTime();
        remainingMs = Math.max(0, rental.durationMs - elapsedMs);
      }

      const updates: any = {
        remainingMs,
        updatedAt: now,
      };

      // Jika waktu habis dan bukan regular
      if (rental.type !== "regular" && remainingMs <= 0) {
        updates.status = "completed";
        updates.endTime = now;
        completedCount++;

        // Bebaskan TV
        await db.collection("tvs").updateOne(
          { _id: rental.tvId },
          {
            $set: {
              status: "available",
              currentRentalId: null,
              timerId: 0,
              updatedAt: now,
            },
          },
        );

        // Turn off TV via MQTT
        try {
          const tvData = await db.collection("tvs").findOne({ _id: rental.tvId });
          if (tvData && tvData.ipAddress) {
            publishTVAction(tvData.ipAddress, "OFF");
          }
        } catch (e) {
          console.error("Failed to publish OFF action in cron:", e);
        }
      } else {
        // Update timer di TV
        const timerValue =
          rental.type === "regular"
            ? Math.floor(now.getTime() - startTime.getTime())
            : Math.floor(remainingMs);

        await db
          .collection("tvs")
          .updateOne(
            { _id: rental.tvId },
            { $set: { timerId: timerValue, updatedAt: now } },
          );
        updatedCount++;
      }

      // Update rental
      await db
        .collection("rentals")
        .updateOne({ _id: rental._id }, { $set: updates });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalProcessed: activeRentals.length,
      completed: completedCount,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
