import { NextRequest, NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { License } from "@/lib/types";

export async function GET(request: NextRequest) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDatabase();
        const licenses = await db
            .collection<License>("licenses")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ licenses });
    } catch (error) {
        console.error("Error listing licenses:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
