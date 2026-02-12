"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Clock,
  Zap,
  Wrench,
  Power,
  WifiOff,
  Gamepad2,
} from "lucide-react";

interface Tv {
  _id: string;
  name: string;
  description?: string;
  status: "available" | "in-use" | "maintenance" | "offline";
  isOnline: boolean;
  accessKey: string | null;
  timeRemaining: number | null;
}

export function TvGrid() {
  const [tvs, setTvs] = useState<Tv[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUpdates, setTimeUpdates] = useState(0);

  // Fetch TV status
  const fetchTvStatus = async () => {
    try {
      const response = await fetch("/api/tv/public-status");
      const data = await response.json();
      setTvs(data.tvs || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching TV status:", error);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTvStatus();
  }, []);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdates((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Refetch data every 10 seconds to sync with server
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTvStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate local time remaining
  const getLocalTimeRemaining = (initialTime: number | null): number | null => {
    if (initialTime === null) return null;
    const elapsed = timeUpdates;
    return Math.max(0, initialTime - elapsed);
  };

  // Get status color classes
  const getStatusColors = (status: string, isOnline: boolean) => {
    // Override colors jika TV mati
    if (!isOnline && status !== "maintenance") {
      return {
        border: "border-gray-500/40",
        bg: "bg-gradient-to-br from-gray-950/50 to-gray-900/30",
        glow: "shadow-gray-500/20",
        icon: "text-gray-400",
        badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      };
    }

    switch (status) {
      case "available":
        return {
          border: "border-emerald-500/40",
          bg: "bg-gradient-to-br from-emerald-950/50 to-emerald-900/30",
          glow: "shadow-emerald-500/20",
          icon: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        };
      case "in-use":
        return {
          border: "border-blue-500/40",
          bg: "bg-gradient-to-br from-blue-950/50 to-blue-900/30",
          glow: "shadow-blue-500/20",
          icon: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        };
      case "maintenance":
        return {
          border: "border-amber-500/40",
          bg: "bg-gradient-to-br from-amber-950/50 to-amber-900/30",
          glow: "shadow-amber-500/20",
          icon: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        };
      case "offline":
        return {
          border: "border-red-500/40",
          bg: "bg-gradient-to-br from-red-950/50 to-red-900/30",
          glow: "shadow-red-500/20",
          icon: "text-red-400",
          badge: "bg-red-500/20 text-red-300 border-red-500/30",
        };
      default:
        return {
          border: "border-slate-500/40",
          bg: "bg-gradient-to-br from-slate-950/50 to-slate-900/30",
          glow: "shadow-slate-500/20",
          icon: "text-slate-400",
          badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400">Loading units...</p>
      </div>
    );
  }

  if (tvs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Monitor className="w-16 h-16 text-slate-600" />
        <p className="text-slate-400">No units available</p>
      </div>
    );
  }

  // Group TVs by status
  const availableTvs = tvs.filter(
    (tv) => tv.status === "available" && tv.isOnline,
  );
  const inUseTvs = tvs.filter((tv) => tv.status === "in-use" && tv.isOnline);
  const offlineTvs = tvs.filter(
    (tv) => !tv.isOnline || tv.status === "offline",
  );
  const maintenanceTvs = tvs.filter((tv) => tv.status === "maintenance");

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-950/40 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-400 font-medium mb-1">
                  Available
                </p>
                <p className="text-3xl font-bold text-emerald-300">
                  {availableTvs.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-950/40 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400 font-medium mb-1">In Use</p>
                <p className="text-3xl font-bold text-blue-300">
                  {inUseTvs.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-gradient-to-br from-red-950/40 to-slate-950/40 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-400 font-medium mb-1">Offline</p>
                <p className="text-3xl font-bold text-red-300">
                  {offlineTvs.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Power className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-950/40 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-400 font-medium mb-1">
                  Maintenance
                </p>
                <p className="text-3xl font-bold text-amber-300">
                  {maintenanceTvs.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TV Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tvs.map((tv) => {
          const localTimeRemaining = getLocalTimeRemaining(tv.timeRemaining);
          const colors = getStatusColors(tv.status, tv.isOnline);
          const displayStatus =
            !tv.isOnline && tv.status !== "maintenance" ? "offline" : tv.status;

          return (
            <Card
              key={tv._id}
              className={`relative border-2 ${colors.border} ${colors.bg} backdrop-blur-sm transition-all duration-200 hover:border-opacity-80 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <CardContent className="p-6 relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shadow-lg`}
                    >
                      <Monitor className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {tv.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {tv.description ||
                          `Unit #${tv._id.slice(-6).toUpperCase()}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <Badge
                  className={`${colors.badge} border px-3 py-1 mb-4 font-medium`}
                >
                  {displayStatus === "available" && "Ready"}
                  {displayStatus === "in-use" && "Active"}
                  {displayStatus === "maintenance" && "Maintenance"}
                  {displayStatus === "offline" && "Offline"}
                </Badge>

                {/* Content based on status */}
                {displayStatus === "in-use" && localTimeRemaining !== null ? (
                  <div className="space-y-4">
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className={`w-4 h-4 ${colors.icon}`} />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">
                          Time Remaining
                        </span>
                      </div>
                      <div className="text-4xl font-bold font-mono text-white tabular-nums tracking-tight">
                        {formatTime(localTimeRemaining)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span>Session active</span>
                    </div>
                  </div>
                ) : displayStatus === "available" ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-950/30 rounded-xl p-6 border border-emerald-500/20 text-center">
                      <Zap className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-emerald-300">
                        Ready for rental
                      </p>
                      <p className="text-xs text-emerald-400/60 mt-1">
                        Unit is powered and available
                      </p>
                    </div>
                  </div>
                ) : displayStatus === "offline" ? (
                  <div className="space-y-3">
                    <div className="bg-red-950/30 rounded-xl p-6 border border-red-500/20 text-center">
                      <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-red-300">
                        Unit is offline
                      </p>
                      <p className="text-xs text-red-400/60 mt-1">
                        TV is powered off or unreachable
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-950/30 rounded-xl p-6 border border-amber-500/20 text-center">
                      <Gamepad2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-amber-300">
                        Under Playing
                      </p>
                      <p className="text-xs text-amber-400/60 mt-1">
                        TV is under playing
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
