import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { publishTVAction } from "@/lib/mqtt";

interface EndRentalRequest {
  rentalId: string;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rentalId } = (await request.json()) as EndRentalRequest;

    if (!rentalId) {
      return NextResponse.json({ error: "Missing rental ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const rental = await db
      .collection("rentals")
      .findOne({ _id: new ObjectId(rentalId) });

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    // Check if it's a regular rental that needs price calculation
    let updateData: any = {
      status: "completed",
      endTime: new Date(),
      updatedAt: new Date(),
    };

    if (rental.type === "regular" && rental.status === "active") {
      const tv = await db.collection("tvs").findOne({ _id: rental.tvId });

      if (tv && tv.pricePerHour) {
        const endTime = new Date();
        const startTime = new Date(rental.startTime);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        // Round to nearest 1000 or something? Or just raw calculation.
        // Usually we charge per minute or partial hour.
        // Let's use simple math: (minutes / 60) * price

        // Calculate PURE Rental Cost
        const rentalCost = Math.ceil(durationHours * tv.pricePerHour);

        // Get existing add-ons cost
        const addOnsCost = rental.addOnsCost || 0;

        // Calculate Grand Total
        const grandTotal = rentalCost + addOnsCost;

        updateData.rentalCost = rentalCost;
        updateData.grandTotal = grandTotal;
        updateData.totalPrice = grandTotal; // Legacy support

        updateData.durationMs = durationMs;
        updateData.remainingMs = 0;

        // Update Payment Record
        await db
          .collection("payments")
          .updateOne(
            { rentalId: new ObjectId(rentalId) },
            { $set: { amount: grandTotal, status: "pending" } },
          );
      }
    }

    // Update rental status
    await db.collection("rentals").updateOne(
      { _id: new ObjectId(rentalId) },
      {
        $set: updateData,
      },
    );

    // Update TV status back to available
    await db.collection("tvs").updateOne(
      { _id: rental.tvId },
      {
        $set: {
          status: "available",
          currentRentalId: null,
          timerId: null,
          updatedAt: new Date(),
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending rental:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
