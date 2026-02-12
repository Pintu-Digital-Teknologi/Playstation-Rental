import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type { TVUnit } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, ipAddress, macAddress, description, pricePerHour } = await req.json();

    // Validate input
    if (!name || !ipAddress) {
      return NextResponse.json(
        { error: "Name and IP address are required" },
        { status: 400 },
      );
    }

    // Validate IP address format (basic validation)
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

    // Check if IP already exists
    const existingTV = await tvCollection?.findOne({ ipAddress });
    if (existingTV) {
      return NextResponse.json(
        { error: "IP address already in use" },
        { status: 400 },
      );
    }

    const newTV: TVUnit = {
      name,
      ipAddress,
      macAddress,
      description,
      pricePerHour,
      status: "available",
      lastChecked: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tvCollection?.insertOne(newTV);

    return NextResponse.json({
      success: true,
      tv: { _id: result?.insertedId, ...newTV },
    });
  } catch (error) {
    console.error("Create TV error:", error);
    return NextResponse.json({ error: "Failed to create TV" }, { status: 500 });
  }
}
