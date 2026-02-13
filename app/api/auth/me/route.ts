import { NextRequest, NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      _id: admin._id,
      username: admin.username,
      fullName: admin.fullName,
      role: admin.role,
      email: admin.email,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
