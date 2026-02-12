import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { Rental } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rentalId } = await request.json();

    if (!rentalId) {
      return NextResponse.json({ error: "Missing rental ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const rental = await db
      .collection<Rental>("rentals")
      .findOne({ _id: new ObjectId(rentalId) });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    if (rental.status !== "paused") {
      return NextResponse.json(
        { error: "Only paused rentals can be resumed" },
        { status: 400 },
      );
    }

    const now = new Date();
    const updates: any = {
      status: "active",
      pausedAt: null, // Clear pause timestamp
      updatedAt: now,
    };

    if (rental.type === "hourly") {
      // For hourly: Recalculate endTime based on preserved remainingMs
      // New EndTime = Now + RemainingMs
      const remainingMs = rental.remainingMs || 0;
      const newEndTime = new Date(now.getTime() + remainingMs);

      // We also need to shift startTime to maintain the math: (endTime - now) = remaining
      // But simpler is: endTime = now + remaining.
      // startTime is less critical for hourly logic except for records,
      // but to keep consistency (duration = endTime - startTime), we might need to shift startTime too?
      // Actually strictly: startTime = newEndTime - durationMs.

      updates.endTime = newEndTime;
      // updates.startTime = new Date(newEndTime.getTime() - rental.durationMs); // Optional: shift start time to make the "session" look continuous?
      // Let's NOT shift startTime, to keep record of when they actually arrived.
      // But implies "gap" in usage.

      // IMPORTANT: The sync logic uses (durationMs - (now - startTime)).
      // If we don't shift startTime, the sync logic will think time passed during pause.
      // So we MUST shift startTime effectively to ignore the pause gap.
      // Shifted StartTime = Now - (InitialDuration - Remaining)
      // i.e. Now - TimeAlreadyUsed.

      const timeAlreadyUsed = rental.durationMs - remainingMs;
      updates.startTime = new Date(now.getTime() - timeAlreadyUsed);
    } else {
      // For regular:
      // We stored accumulatedDuration (time used before).
      // Now we "reset" the clock starting from NOW, but conceptually knowing we already have X ms used.
      // Easiest implementation: Shift startTime to (Now - accumulatedDuration).
      // This makes "now - startTime" equal to "accumulatedDuration".
      // So the timer continues ticking up from that value.

      const accumulated = rental.accumulatedDuration || 0;
      updates.startTime = new Date(now.getTime() - accumulated);
      // We don't need to keep accumulatedDuration field populated necessarily, or we can keep it for history.
      // But the main logic relies on startTime.
    }

    // Update Rental
    await db
      .collection("rentals")
      .updateOne({ _id: new ObjectId(rentalId) }, { $set: updates });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Error resuming rental:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
