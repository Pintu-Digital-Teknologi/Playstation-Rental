import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tvId, name, ipAddress, macAddress, description, pricePerHour } = await req.json();

    if (!tvId || !name || !ipAddress) {
      return NextResponse.json(
        { error: "TV ID, name, and IP address are required" },
        { status: 400 },
      );
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { error: "Invalid IP address format" },
        { status: 400 },
      );
    }

    // Validate MAC Address if provided
    if (
      macAddress &&
      !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress)
    ) {
      return NextResponse.json(
        { error: "Invalid MAC address format (XX:XX:XX:XX:XX:XX)" },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();
    const tvCollection = db?.collection("tvs");

    // Check if IP already exists on another TV
    const existingTV = await tvCollection?.findOne({
      ipAddress,
      _id: { $ne: new ObjectId(tvId) },
    });
    if (existingTV) {
      return NextResponse.json(
        { error: "IP address already in use by another TV" },
        { status: 400 },
      );
    }

    const result = await tvCollection?.updateOne(
      { _id: new ObjectId(tvId) },
      {
        $set: {
          name,
          ipAddress,
          macAddress,
          description,
          pricePerHour,
          updatedAt: new Date(),
        },
      },
    );

    if (result?.matchedCount === 0) {
      return NextResponse.json({ error: "TV not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "TV updated successfully",
    });
  } catch (error) {
    console.error("Update TV error:", error);
    return NextResponse.json({ error: "Failed to update TV" }, { status: 500 });
  }
}
