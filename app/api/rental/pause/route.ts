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

    if (rental.status !== "active") {
      return NextResponse.json(
        { error: "Only active rentals can be paused" },
        { status: 400 },
      );
    }

    const now = new Date();
    const updates: any = {
      status: "paused",
      pausedAt: now,
      updatedAt: now,
    };

    if (rental.type === "hourly") {
      // For hourly, calculate remaining time strictly at this moment and freeze it
      const startTime = new Date(rental.startTime);
      const elapsedMs = now.getTime() - startTime.getTime();
      const remainingMs = Math.max(0, rental.durationMs - elapsedMs);

      // Store the frozen remaining time in accumulatedDuration (reusing this field to imply "saved time")
      // Or we can just rely on remainingMs being frozen.
      // Plan said: "Calculate strict remainingMs at this moment and store it in DB"
      updates.remainingMs = remainingMs;
    } else {
      // For regular, calculate accumulated duration and price up to now
      const startTime = new Date(rental.startTime);
      // If there was previous accumulated duration (unlikely for first pause but good for robustness if we support multiple pauses logic differently later)
      // Ideally for regular: accumulatedDuration = (now - startTime) + (previous_accumulation || 0)
      // But standard way: just track total duration used so far.

      const currentSessionDuration = now.getTime() - startTime.getTime();
      const totalAccumulated =
        (rental.accumulatedDuration || 0) + currentSessionDuration;

      updates.accumulatedDuration = totalAccumulated;
      updates.remainingMs = 0;

      // Calculate provisional price
      const tv = await db.collection("tvs").findOne({ _id: rental.tvId });
      if (tv && tv.pricePerHour) {
        const hours = totalAccumulated / (1000 * 60 * 60);
        const currentPrice = Math.ceil(hours * tv.pricePerHour);
        updates.totalPrice = currentPrice;
      }
    }

    // Update Rental
    await db
      .collection("rentals")
      .updateOne({ _id: new ObjectId(rentalId) }, { $set: updates });

    // Update TV status to indicate "Paused" or keep it "in-use" but maybe with a flag?
    // User requested "electricity off". So technically TV usage stops.
    // Let's keep status 'in-use' but maybe update the timer to show PAUSED?
    // We'll update the timerId to -1 or a special code to indicate pause on the hardware/frontend if supported.
    // For now, let's just leave it 'in-use' but update updatedAt.

    await db
      .collection("tvs")
      .updateOne({ _id: rental.tvId }, { $set: { updatedAt: now } });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Error pausing rental:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
