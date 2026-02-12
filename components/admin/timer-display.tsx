"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/function";

interface TimerDisplayProps {
  startTime: string | Date;
  durationMs?: number;
  type?: "hourly" | "regular";
  initialRemainingMs?: number;
  initialElapsedMs?: number;
}

export function TimerDisplay({
  startTime,
  durationMs,
  type = "hourly",
  initialRemainingMs,
  initialElapsedMs,
}: TimerDisplayProps) {
  const [displayTime, setDisplayTime] = useState<string>("Loading...");

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const start = new Date(startTime).getTime();

      if (type === "regular") {
        const elapsed = Math.floor(now - start); // ms
        setDisplayTime(formatTime(elapsed));
      } else {
        if (!durationMs) {
          // Fallback if missing data
          setDisplayTime(
            initialRemainingMs ? formatTime(initialRemainingMs) : "0m",
          );
          return;
        }
        const end = start + durationMs;
        const remaining = Math.max(0, end - now);
        setDisplayTime(formatTime(remaining));
      }
    };

    updateTimer(); // Initial
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMs, type, initialRemainingMs, initialElapsedMs]);

  return <span className="font-mono">{displayTime}</span>;
}
