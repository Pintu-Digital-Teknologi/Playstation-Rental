// /api/tv/control/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { wakeTV, sendCommandToTV, getTVStatus } from "@/lib/tv-control";

interface TVControlRequest {
  tvId: string;
  action:
    | "power-on"
    | "power-off"
    | "set-timer"
    | "extend-timer"
    | "wake-up"
    | "check-status"
    | "volume-up"
    | "volume-down";
  timerMinutes?: number;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tvId, action, timerMinutes } =
      (await request.json()) as TVControlRequest;
    const db = await getDatabase();
    const tv = await db.collection("tvs").findOne({ _id: new ObjectId(tvId) });

    if (!tv) {
      return NextResponse.json({ error: "TV not found" }, { status: 404 });
    }

    let result = { success: true, message: "", data: {} as any };

    switch (action) {
      case "check-status": {
        // Cek status TV secara real-time
        const status = await getTVStatus(tv.ipAddress);

        // Update database
        await db.collection("tvs").updateOne(
          { _id: tv._id },
          {
            $set: {
              isOnline: status.isPoweredOn,
              lastChecked: new Date(),
            },
          },
        );

        result.message = "Status checked successfully";
        result.data = {
          isReachable: status.isReachable,
          isPoweredOn: status.isPoweredOn,
          screenState: status.screenState,
        };
        break;
      }

      case "power-on":
      case "wake-up": {
        // Cek status TV terlebih dahulu
        const status = await getTVStatus(tv.ipAddress);

        if (!status.isReachable) {
          // TV tidak terjangkau, coba WoL jika ada MAC address
          if (tv.macAddress) {
            await wakeTV(tv.macAddress);
            result.message =
              "Wake-on-LAN packet sent. Please wait for TV to boot.";
          } else {
            return NextResponse.json(
              { error: "TV is unreachable and no MAC address configured" },
              { status: 400 },
            );
          }
        } else if (status.isPoweredOn) {
          result.message = "TV is already powered on";
        } else {
          // TV reachable tapi dalam sleep mode
          try {
            await sendCommandToTV(tv.ipAddress, "WAKE_UP");

            // Update status
            await db.collection("tvs").updateOne(
              { _id: tv._id },
              {
                $set: {
                  isOnline: true,
                  lastChecked: new Date(),
                },
              },
            );

            result.message = "TV powered on successfully";
          } catch (error) {
            console.error("Power on failed:", error);
            return NextResponse.json(
              { error: "Failed to power on TV" },
              { status: 500 },
            );
          }
        }
        break;
      }

      case "power-off": {
        try {
          await sendCommandToTV(tv.ipAddress, "POWER_OFF");

          // Update status
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                isOnline: false,
                status: "available",
                lastChecked: new Date(),
              },
              $unset: { currentRentalId: "", timerId: "" },
            },
          );

          result.message = "TV powered off successfully";
        } catch (error) {
          console.error("Power off failed:", error);
          return NextResponse.json(
            { error: "Failed to power off TV" },
            { status: 500 },
          );
        }
        break;
      }

      case "volume-up": {
        try {
          await sendCommandToTV(tv.ipAddress, "VOLUME_UP");
          result.message = "Volume increased";
        } catch (error) {
          console.error("Volume up failed:", error);
          return NextResponse.json(
            { error: "Failed to increase volume" },
            { status: 500 },
          );
        }
        break;
      }

      case "volume-down": {
        try {
          await sendCommandToTV(tv.ipAddress, "VOLUME_DOWN");
          result.message = "Volume decreased";
        } catch (error) {
          console.error("Volume down failed:", error);
          return NextResponse.json(
            { error: "Failed to decrease volume" },
            { status: 500 },
          );
        }
        break;
      }

      case "set-timer": {
        if (!timerMinutes || timerMinutes <= 0) {
          return NextResponse.json(
            { error: "Invalid timer duration" },
            { status: 400 },
          );
        }

        try {
          // Set timer untuk auto-shutdown
          await sendCommandToTV(tv.ipAddress, "SLEEP_TIMER", timerMinutes);

          // Update status di database
          const timerMs = timerMinutes * 60000;
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                timerId: timerMs,
                updatedAt: new Date(),
              },
            },
          );

          result.message = `Sleep timer set for ${timerMinutes} minutes`;
        } catch (error) {
          console.error("Set timer failed:", error);
          return NextResponse.json(
            { error: "Failed to set timer" },
            { status: 500 },
          );
        }
        break;
      }

      case "extend-timer": {
        if (!timerMinutes || timerMinutes <= 0) {
          return NextResponse.json(
            { error: "Invalid extension duration" },
            { status: 400 },
          );
        }

        // Cek apakah ada rental aktif
        if (!tv.currentRentalId) {
          return NextResponse.json(
            { error: "No active rental to extend" },
            { status: 400 },
          );
        }

        const rental = await db.collection("rentals").findOne({
          _id: tv.currentRentalId,
        });

        if (!rental || rental.status !== "active") {
          return NextResponse.json(
            { error: "No active rental found" },
            { status: 400 },
          );
        }

        try {
          // Extend timer di TV
          await sendCommandToTV(tv.ipAddress, "SLEEP_TIMER", timerMinutes);

          // Update rental duration
          const extensionMs = timerMinutes * 60000;
          const newDurationMs = rental.durationMs + extensionMs;
          const newTotalPrice =
            (newDurationMs / 3600000) * (tv.pricePerHour || 50000);

          await db.collection("rentals").updateOne(
            { _id: rental._id },
            {
              $set: {
                durationMs: newDurationMs,
                remainingMs: rental.remainingMs + extensionMs,
                totalPrice: newTotalPrice,
                updatedAt: new Date(),
              },
            },
          );

          // Update TV timer
          await db.collection("tvs").updateOne(
            { _id: tv._id },
            {
              $set: {
                timerId: (tv.timerId || 0) + extensionMs,
                updatedAt: new Date(),
              },
            },
          );

          result.message = `Timer extended by ${timerMinutes} minutes`;
          result.data = {
            newDuration: newDurationMs,
            newPrice: newTotalPrice,
          };
        } catch (error) {
          console.error("Extend timer failed:", error);
          return NextResponse.json(
            { error: "Failed to extend timer" },
            { status: 500 },
          );
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error controlling TV:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
