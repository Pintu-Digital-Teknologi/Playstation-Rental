import { NextRequest, NextResponse } from "next/server";
import { getAdminFromSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
    try {
        const admin = await getAdminFromSession();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, action, days } = await request.json();

        if (!id || !days) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const db = await getDatabase();
        const license = await db.collection("licenses").findOne({ _id: new ObjectId(id) });

        if (!license) {
            return NextResponse.json({ error: "License not found" }, { status: 404 });
        }

        let newExpiresAt = new Date(license.expiresAt);
        const daysNum = parseInt(days);

        if (action === "add") {
            newExpiresAt.setDate(newExpiresAt.getDate() + daysNum);
        } else if (action === "set") {
            // Logic if we wanted to set specific date, but for now we rely on 'add' (negative/positive)
            newExpiresAt.setDate(newExpiresAt.getDate() + daysNum);
        }

        await db.collection("licenses").updateOne(
            { _id: new ObjectId(id) },
            { $set: { expiresAt: newExpiresAt } }
        );

        return NextResponse.json({ success: true, newExpiresAt });
    } catch (error) {
        console.error("Error updating license:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
