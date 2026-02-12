import { NextRequest, NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { License } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, durationDays } = await request.json();

        if (!name || !durationDays) {
            return NextResponse.json(
                { error: "Name and duration are required" },
                { status: 400 },
            );
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        const newLicense: License = {
            key: randomUUID(),
            name,
            status: "active",
            expiresAt,
            createdAt: now,
        };

        const db = await getDatabase();
        const result = await db.collection("licenses").insertOne(newLicense);

        return NextResponse.json({
            success: true,
            license: { ...newLicense, _id: result.insertedId },
        });
    } catch (error) {
        console.error("Error creating license:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
