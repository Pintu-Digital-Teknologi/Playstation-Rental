import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Rental, TVUnit } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessKey: string }> },
) {
  try {
    const { accessKey } = await params;
    const db = await getDatabase();

    const rental = await db.collection<Rental>("rentals").findOne({
      publicAccessKey: accessKey,
    });

    if (!rental)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Jika sudah selesai, jangan lakukan apa-apa lagi
    if (rental.status !== "active") {
      return NextResponse.json({ status: rental.status, remainingMs: 0 });
    }

    const now = new Date();
    const startTime = new Date(rental.startTime);
    let remainingMs = 0;

    // Logic split based on rental type
    if (rental.type === "regular") {
      // Regular rentals are open-ended, so they don't have remaining time or auto-complete
      // We can track elapsed time if we want, but remaining is effectively infinite or 0
      remainingMs = 0;

      // Just update the heartbeat/updatedAt, do NOT auto-complete
    } else {
      // Hourly/Fixed rentals
      const elapsedMs = now.getTime() - startTime.getTime();
      remainingMs = Math.max(0, rental.durationMs - elapsedMs);
    }

    const updates: any = {
      remainingMs,
      updatedAt: now,
    };

    // Logika Auto-Complete: Hanya jika waktu habis DAN bukan tipe regular (redundant check but safe)
    if (rental.type !== "regular" && remainingMs <= 0) {
      updates.status = "completed";
      updates.endTime = now;

      // Bebaskan TV secara otomatis
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
    } else {
      // Update timer di TV agar admin melihat angka yang sinkron
      const timerValue =
        rental.type === "regular"
          ? Math.floor((now.getTime() - startTime.getTime()) / 1000) * 1000 // Send elapsed for regular
          : Math.floor(remainingMs); // Send remaining for hourly

      await db
        .collection("tvs")
        .updateOne(
          { _id: rental.tvId },
          { $set: { timerId: timerValue, updatedAt: now } },
        );
    }

    await db
      .collection("rentals")
      .updateOne({ _id: rental._id }, { $set: updates });

    return NextResponse.json({
      status: updates.status || rental.status,
      remainingMs,
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
