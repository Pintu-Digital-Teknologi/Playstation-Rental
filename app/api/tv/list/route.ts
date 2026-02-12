// /api/tv/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { sendCommandToTV, getTVStatus } from "@/lib/tv-control";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const db = await getDatabase();

    // 1. API Key Authentication (for Bridge)
    if (apiKey) {
      const license = await db.collection("licenses").findOne({
        key: apiKey,
        status: "active",
        expiresAt: { $gt: new Date() },
      });

      if (license) {
        // Update lastUsedAt
        await db
          .collection("licenses")
          .updateOne({ _id: license._id }, { $set: { lastUsedAt: new Date() } });

        // Just return the list of TVs (Bridge will check status)
        const tvs = await db.collection("tvs").find({}).toArray();
        return NextResponse.json({
          tvs: tvs.map(tv => ({
            ...tv,
            _id: tv._id.toString(),
            currentRentalId: tv.currentRentalId?.toString(),
          }))
        });
      }
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    // 2. Admin Session Authentication (for Dashboard)
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // const db = await getDatabase(); // Already defined above
    const tvs = await db.collection("tvs").find({}).toArray();

    // Enrich with current rental info and check for expiration
    const enrichedTvs = await Promise.all(
      tvs.map(async (tv) => {
        let currentRental = null;

        // 1. Cek status TV (online/offline dan power state)
        const tvStatus = await getTVStatus(tv.ipAddress);

        // Update isOnline based on actual power state
        const isOnline = tvStatus.isPoweredOn;
        const isReachable = tvStatus.isReachable;

        // Update status di database jika berbeda
        if (tv.isOnline !== isOnline) {
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                isOnline,
                lastChecked: new Date(),
              },
            },
          );
        }

        // 2. Cek rental yang sedang aktif
        if (tv.currentRentalId) {
          currentRental = await db
            .collection("rentals")
            .findOne({ _id: tv.currentRentalId });

          if (
            currentRental &&
            currentRental.status === "active" &&
            currentRental.startTime
          ) {
            const now = new Date();
            const startTime = new Date(currentRental.startTime);

            // Handle Regular Rental (No Expiration)
            if (currentRental.type === "regular") {
              const elapsedMs = now.getTime() - startTime.getTime();
              currentRental = {
                ...currentRental,
                elapsedMs,
                remainingMs: null,
                endTime: null,
              };
            }
            // Handle Hourly Rental
            else if (currentRental.durationMs) {
              const endTime = new Date(
                startTime.getTime() + currentRental.durationMs,
              );

              // Cek apakah rental sudah expired
              if (now > endTime) {
                console.log(
                  `Rental expired for ${tv.name}. Sending Power Off.`,
                );

                // 1. Update Rental Status
                await db.collection("rentals").updateOne(
                  { _id: currentRental._id },
                  {
                    $set: {
                      status: "completed",
                      endTime: endTime,
                      updatedAt: new Date(),
                    },
                  },
                );

                // 2. Update TV Status
                await db.collection("tvs").updateOne(
                  { _id: tv._id },
                  {
                    $set: {
                      status: "available",
                      lastChecked: new Date(),
                    },
                    $unset: { currentRentalId: "", timerId: "" },
                  },
                );

                // 3. Send Power Off (hanya jika TV masih online)
                if (isOnline) {
                  sendCommandToTV(tv.ipAddress, "POWER_OFF").catch((err: any) =>
                    console.error(`Failed to auto-power off ${tv.name}:`, err),
                  );
                }

                // Return updated state
                return {
                  ...tv,
                  status: "available",
                  isOnline,
                  isReachable,
                  currentRental: null,
                  currentRentalId: undefined,
                };
              } else {
                // Calculate accurate remaining time
                const remainingMs = endTime.getTime() - now.getTime();
                const remainingMinutes = Math.ceil(remainingMs / 60000);

                // Update rental info dengan remaining time
                currentRental = {
                  ...currentRental,
                  remainingMs,
                  remainingMinutes,
                  endTime,
                };
              }
            }
          }
        }

        // Ensure we serialize ObjectIds to strings to avoid frontend ambiguity
        const serializedTV = {
          ...tv,
          _id: tv._id.toString(),
          currentRentalId: tv.currentRentalId
            ? tv.currentRentalId.toString()
            : undefined,
          currentRental: currentRental
            ? {
              ...currentRental,
              _id: currentRental._id
                ? currentRental._id.toString()
                : undefined,
              tvId: currentRental.tvId
                ? currentRental.tvId.toString()
                : undefined,
            }
            : null,
          isOnline,
          isReachable,
        };

        return serializedTV;
      }),
    );

    return NextResponse.json({ tvs: enrichedTvs });
  } catch (error) {
    console.error("Error fetching TVs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
