import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { Rental } from "@/lib/types";
import { publishTVAction } from "@/lib/mqtt";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { rentalId, accessKey } = json;

    if (!rentalId) {
      return NextResponse.json({ error: "Missing rental ID" }, { status: 400 });
    }

    const db = await getDatabase();

    // Auth Check
    let isAdmin = false;
    let authorizedByAccessKey = false;

    if (accessKey) {
      // If access key is provided, we verify it later against the fetched rental
      authorizedByAccessKey = true;
    } else {
      // Fallback to Admin Check if no access key
      const admin = await getAdminFromSession();
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      isAdmin = true;
    }

    const rental = await db
      .collection<Rental>("rentals")
      .findOne({ _id: new ObjectId(rentalId) });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // Verify Access Key if not Admin
    if (!isAdmin && authorizedByAccessKey) {
      if (rental.publicAccessKey !== accessKey) {
        return NextResponse.json(
          { error: "Invalid Access Key" },
          { status: 403 },
        );
      }
    }

    if (rental.status === "completed") {
      return NextResponse.json(
        { error: "Rental already completed" },
        { status: 400 },
      );
    }

    const now = new Date();
    let rentalCost = 0;
    const addOnsCost = rental.addOnsCost || 0;
    let finalDurationMs = rental.durationMs;

    // Calculate final price logic
    if (rental.type === "regular") {
      // For regular: calculate price up to NOW (or accumulated if paused)
      // If Active: Duration = Now - StartTime
      // If Paused: Duration = AccumulatedDuration
      let durationMs = 0;

      if (rental.status === "paused" && rental.accumulatedDuration) {
        durationMs = rental.accumulatedDuration;
      } else {
        const startTime = new Date(rental.startTime);
        durationMs = now.getTime() - startTime.getTime();
      }

      finalDurationMs = durationMs;

      // Calculate price
      const tv = await db.collection("tvs").findOne({ _id: rental.tvId });
      if (tv && tv.pricePerHour) {
        const hours = durationMs / (1000 * 60 * 60);
        rentalCost = Math.ceil(hours * tv.pricePerHour);
      }
    } else {
      // For Hourly:
      // Current totalPrice in DB = (Initial Price) + (AddOns Added so far via API)
      // So Initial Price (Rental Cost) = Current Total - AddOns
      // But we can also look if rentalCost field exists.
      if (rental.rentalCost !== undefined) {
        rentalCost = rental.rentalCost;
      } else {
        // Fallback legacy logic
        // If we never separated them, assuming totalPrice was just rental before addons.
        // But since we use increment in addon route, totalPrice includes addons.
        // So rentalCost = totalPrice - addOnsCost
        rentalCost = (rental.totalPrice || 0) - addOnsCost;
      }
    }

    const finalGrandTotal = rentalCost + addOnsCost;

    const updateData: any = {
      status: "completed",
      endTime: now,
      rentalCost: rentalCost,
      grandTotal: finalGrandTotal,
      totalPrice: finalGrandTotal, // Compatible with old UI
      durationMs: finalDurationMs, // Update actual duration used
      remainingMs: 0,
      updatedAt: now,
    };

    // Update Rental
    await db
      .collection("rentals")
      .updateOne({ _id: new ObjectId(rentalId) }, { $set: updateData });

    // Update Payment
    await db.collection("payments").updateOne(
      { rentalId: new ObjectId(rentalId) },
      {
        $set: {
          amount: finalGrandTotal,
          // status: "pending" // Keep pending until paid manually? Or assume cash?
          // Usually force finish -> go to payment.
        },
      },
    );

    // Free TV
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
      console.error("Failed to publish OFF action:", e);
    }

    return NextResponse.json({ success: true, totalPrice: finalGrandTotal });
  } catch (error) {
    console.error("Error force finishing rental:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
