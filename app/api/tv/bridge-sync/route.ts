import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) {
            return NextResponse.json({ error: "API Key required" }, { status: 401 });
        }

        const { statuses } = await request.json();
        if (!Array.isArray(statuses)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        const db = await getDatabase();

        // Validate API Key
        const license = await db.collection("licenses").findOne({
            key: apiKey,
            status: "active",
            expiresAt: { $gt: new Date() },
        });

        if (!license) {
            return NextResponse.json({ error: "Invalid or expired API Key" }, { status: 401 });
        }

        // Update license usage
        await db.collection("licenses").updateOne(
            { _id: license._id },
            { $set: { lastUsedAt: new Date() } }
        );

        // Bulk update TV statuses
        const operations = statuses.map((status: any) => ({
            updateOne: {
                filter: { ipAddress: status.ip },
                update: {
                    $set: {
                        isOnline: status.isOnline,
                        isReachable: status.isReachable,
                        lastChecked: new Date(),
                    },
                },
            },
        }));

        if (operations.length > 0) {
            await db.collection("tvs").bulkWrite(operations);
        }

        return NextResponse.json({ success: true, updated: operations.length });
    } catch (error) {
        console.error("Bridge sync error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
