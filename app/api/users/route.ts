import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Admin } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDatabase();
    const users = await db.collection("admins").find({}).toArray();

    // Remove password from response
    const safeUsers = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role || "operator", // Default to operator if not set
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, fullName, role } = await request.json();

    if (!username || !email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // Check if user exists
    const existingUser = await db.collection("admins").findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username or email already exists" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: Admin = {
      username,
      email,
      passwordHash: hashedPassword, // Storing as passwordHash locally but usually just 'password' in this mismatched codebase, let's follow the register route pattern if needed but type says passwordHash
      fullName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // The register route used `password: hashedPassword`. I should check if I should follow that or the type definition.
    // The type `Admin` has `passwordHash: string`.
    // The register route `app/api/auth/register/route.ts` line 76: `password: hashedPassword`.
    // This is an inconsistency. I will use `password` to match the existing schema from register route, even if type says `passwordHash`.
    // Adding `as any` to avoid type error or just using the object.

    const result = await db.collection("admins").insertOne({
      ...newUser,
      password: hashedPassword, // Override/add password field to match DB schema
    });

    return NextResponse.json({ success: true, userId: result.insertedId });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
