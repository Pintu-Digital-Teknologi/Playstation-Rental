import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Shift } from "@/lib/types";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    // Fetch completed shifts for history
    const shifts = await db
      .collection("shifts")
      .find({ status: "completed" })
      .sort({ endTime: -1 })
      .toArray();

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { operatorId, operatorName, password } = await request.json();

    if (!operatorId || !operatorName || !password) {
      return NextResponse.json(
        { error: "Operator details and password required" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // Verify operator password
    const operator = await db
      .collection("admins")
      .findOne({ _id: new ObjectId(operatorId) });
    if (!operator) {
      return NextResponse.json(
        { error: "Operator not found" },
        { status: 404 },
      );
    }

    // In database it might be stored as 'password' or 'passwordHash'.
    // Register route uses 'password'. Admin interface says 'passwordHash'.
    // I will check both for robustness, prioritizing what is likely in DB.
    // Register route: `password: hashedPassword`.
    const storedHash = operator.password || operator.passwordHash;

    if (!storedHash) {
      return NextResponse.json(
        { error: "Operator has no password set" },
        { status: 400 },
      );
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Check if there is already an active shift (global lock for now)
    const activeShift = await db
      .collection("shifts")
      .findOne({ status: "active" });

    if (activeShift) {
      return NextResponse.json(
        { error: "There is already an active shift. Please finish it first." },
        { status: 400 },
      );
    }

    const newShift: Shift = {
      operatorId: new ObjectId(operatorId),
      operatorName: operatorName,
      startTime: new Date(),
      status: "active",
      totalTransactions: 0,
      totalRevenue: 0,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("shifts").insertOne(newShift);

    return NextResponse.json({
      success: true,
      shiftId: result.insertedId,
    });
  } catch (error) {
    console.error("Error starting shift:", error);
    return NextResponse.json(
      { error: "Failed to start shift" },
      { status: 500 },
    );
  }
}
