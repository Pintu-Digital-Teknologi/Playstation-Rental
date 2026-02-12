// /api/rental/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendCommandToTV, showRentalInfo, getTVStatus } from "@/lib/tv-control";

interface CreateRentalRequest {
  tvId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  durationMinutes?: number; // Optional for regular
  pricePerHour: number;
  type: "hourly" | "regular";
}

function formatPublicAccessKey(rawKey: string): string {
  return rawKey.toUpperCase().replace(/\s+/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      tvId,
      customerName,
      customerPhone,
      customerEmail,
      durationMinutes,
      pricePerHour,
      type = "hourly", // default to hourly
    } = (await request.json()) as CreateRentalRequest;

    if (!tvId || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (type === "hourly" && !durationMinutes) {
      return NextResponse.json(
        { error: "Duration is required for hourly packages" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // Check if TV exists and is available
    const tv = await db.collection("tvs").findOne({ _id: new ObjectId(tvId) });

    if (!tv) {
      return NextResponse.json({ error: "TV not found" }, { status: 404 });
    }

    if (tv.status !== "available") {
      return NextResponse.json(
        { error: "TV is not available" },
        { status: 400 },
      );
    }

    // Cek status TV - pastikan TV hidup
    const tvStatus = await getTVStatus(tv.ipAddress);
    if (!tvStatus.isPoweredOn) {
      return NextResponse.json(
        { error: "TV is not powered on. Please turn on the TV first." },
        { status: 400 },
      );
    }

    const startTime = new Date();
    let durationMs = 0;
    let endTime = null;
    let totalPrice = 0;

    if (type === "hourly" && durationMinutes) {
      durationMs = durationMinutes * 60000;
      endTime = new Date(startTime.getTime() + durationMs);
      totalPrice = (durationMinutes / 60) * pricePerHour;
    }

    // Create rental
    const rentalResult = await db.collection("rentals").insertOne({
      tvId: new ObjectId(tvId),
      customerName,
      customerPhone,
      customerEmail,
      startTime,
      endTime,
      durationMs,
      remainingMs: durationMs, // 0 for regular
      totalPrice,
      type,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate public access key
    const objectId = rentalResult.insertedId.toString();
    const last5Chars = objectId.slice(-5);
    const rawPublicAccessKey = `${last5Chars}-${customerName}-${tv.name}`;
    const publicAccessKey = formatPublicAccessKey(rawPublicAccessKey);

    // Update rental with publicAccessKey
    await db
      .collection("rentals")
      .updateOne(
        { _id: rentalResult.insertedId },
        { $set: { publicAccessKey } },
      );

    // Update TV status
    await db.collection("tvs").updateOne(
      { _id: new ObjectId(tvId) },
      {
        $set: {
          status: "in-use",
          currentRentalId: rentalResult.insertedId,
          timerId: type === "hourly" ? durationMs : null, // Only for hourly
          updatedAt: new Date(),
        },
      },
    );

    // Create payment record (initial 0 for regular)
    const dueDate = endTime
      ? new Date(endTime.getTime() + 24 * 60 * 60000)
      : new Date(startTime.getTime() + 24 * 60 * 60000);
    await db.collection("payments").insertOne({
      rentalId: rentalResult.insertedId,
      amount: totalPrice,
      status: "pending",
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ===== INTEGRASI BARU: AUTO TIMER & NOTIFIKASI DI TV =====

    try {
      if (type === "hourly" && durationMinutes) {
        // 1. Set auto-shutdown timer di TV ONLY for hourly
        console.log(
          `Setting auto-shutdown timer for ${durationMinutes} minutes on ${tv.name}`,
        );
        await sendCommandToTV(tv.ipAddress, "SLEEP_TIMER", durationMinutes);
      }

      // 2. Tampilkan informasi rental di layar TV selama 3 detik
      console.log(`Displaying rental info on ${tv.name}`);
      await showRentalInfo(
        tv.ipAddress,
        customerName,
        tv.name,
        type === "hourly" ? durationMinutes || 0 : 0, // 0 means regular/open
      );

      console.log(`Rental setup completed successfully for ${tv.name}`);
    } catch (controlError) {
      // Jika gagal mengontrol TV, log error tapi tetap lanjutkan
      console.error(
        `Failed to setup TV controls for ${tv.name}:`,
        controlError,
      );
      // Rental tetap dibuat, hanya kontrol TV yang gagal
    }

    return NextResponse.json({
      success: true,
      rental: {
        id: rentalResult.insertedId,
        publicAccessKey,
        totalPrice,
        durationMinutes,
        startTime,
        endTime,
      },
    });
  } catch (error) {
    console.error("Error creating rental:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
