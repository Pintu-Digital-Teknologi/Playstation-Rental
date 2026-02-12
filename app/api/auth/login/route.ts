import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 },
      );
    }

    // Get database connection
    const db = await getDatabase();

    // Find admin by username (case-insensitive)
    const admin = await db.collection("admins").findOne({
      username: { $regex: `^${username}$`, $options: "i" },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid username" }, { status: 401 });
    }

    // Compare password with bcryptjs
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create session
    const token = await createSession(admin._id.toString());
    const { SESSION_DURATION } = await import("@/lib/auth");

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
      },
    });

    response.cookies.set({
      name: "admin-session",
      value: token,
      httpOnly: false, // Allow client inspection
      secure: false, // Lan access
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      // No sameSite -> Browser default
    });

    console.log("Login Route: Cookie set on response with relaxed settings");
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
