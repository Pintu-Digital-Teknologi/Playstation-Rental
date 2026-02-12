"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Power,
  Plus,
  ExternalLink,
  RefreshCw,
  Wifi,
  WifiOff,
  Circle,
  Utensils,
} from "lucide-react";
import { TVControlDialog } from "./tv-control-dialog";
import { AddOnDialog } from "./add-on-dialog";
import { NewRentalDialog } from "./new-rental-dialog";
import { formatTime } from "@/lib/function";
import { TimerDisplay } from "./timer-display";
import { getTVsAction } from "@/app/actions/tv";

interface TVUnit {
  _id: string;
  name: string;
  ipAddress: string;
  status: "available" | "in-use" | "offline";
  isOnline: boolean; // TV power status
  isReachable: boolean; // Network reachable
  currentRental?: {
    _id?: string;
    customerName: string;
    remainingMs?: number;
    elapsedMs?: number;
    startTime: string;
    durationMs?: number;
    type?: "hourly" | "regular";
    publicAccessKey?: string;
  };
  currentRentalId?: string;
  pricePerHour?: number;
}

export function TVManagementGrid() {
  const [tvs, setTvs] = useState<TVUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTV, setSelectedTV] = useState<TVUnit | null>(null);
  const [isControlOpen, setIsControlOpen] = useState(false);
  const [isNewRentalOpen, setIsNewRentalOpen] = useState(false);
  const [isAddOnOpen, setIsAddOnOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTVs();
    const interval = setInterval(fetchTVs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTVs = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const result = await getTVsAction(); // Call Server Action

      if (result.error) {
        throw new Error(result.error);
      }

      setTvs((result.tvs as unknown) as TVUnit[] || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load TV status");
      console.error(err);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchTVs(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "in-use":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "offline":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const getPowerStatusIcon = (tv: TVUnit) => {
    if (!tv.isReachable) {
      return <WifiOff className="w-4 h-4 text-red-400" />;
    }
    if (tv.isOnline) {
      return (
        <Circle className="w-4 h-4 text-green-400 fill-green-400 animate-pulse" />
      );
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  const getPowerStatusText = (tv: TVUnit) => {
    if (!tv.isReachable) return "Unreachable";
    if (tv.isOnline) return "Powered On";
    return "Powered Off";
  };

  if (loading) {
    return (
      <div className="text-center text-muted-foreground">
        Loading TV status...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">TV Management</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tvs.map((tv) => (
          <Card
            key={tv._id}
            className="border border-border hover:border-accent/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {tv.name}
                    {getPowerStatusIcon(tv)}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    {tv.ipAddress}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      className={`${getStatusColor(tv.status)} border text-xs`}
                    >
                      {tv.status === "in-use"
                        ? "In Use"
                        : tv.status === "available"
                          ? "Available"
                          : "Offline"}
                    </Badge>
                    <span
                      className={`text-xs ${tv.isOnline ? "text-green-400" : "text-gray-400"}`}
                    >
                      {getPowerStatusText(tv)}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tv.currentRental && tv.status === "in-use" ? (
                <div className="p-3 bg-secondary rounded-md space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-semibold text-foreground">
                        {tv.currentRental.customerName}
                      </p>
                    </div>
                    {tv.currentRental.publicAccessKey && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-accent"
                        title="Open Client View"
                        asChild
                      >
                        <a
                          href={`/status/${tv.currentRental.publicAccessKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {tv.currentRental.type === "regular"
                        ? "Time Elapsed"
                        : "Time Remaining"}
                    </p>
                    <p className="text-lg font-bold text-accent">
                      <TimerDisplay
                        startTime={tv.currentRental.startTime}
                        durationMs={tv.currentRental.durationMs}
                        type={tv.currentRental.type}
                        initialRemainingMs={tv.currentRental.remainingMs}
                        initialElapsedMs={tv.currentRental.elapsedMs}
                      />
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-secondary rounded-md">
                  <div className="text-center text-muted-foreground text-sm">
                    {!tv.isOnline ? (
                      <div className="space-y-1">
                        <WifiOff className="w-8 h-8 mx-auto text-red-400" />
                        <p className="font-medium">TV is powered off</p>
                        <p className="text-xs">Turn on TV to enable rental</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Circle className="w-8 h-8 mx-auto text-green-400 fill-green-400" />
                        <p className="font-medium">Ready for rental</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2 bg-transparent"
                  onClick={() => {
                    setSelectedTV(tv);
                    setIsControlOpen(true);
                  }}
                  disabled={!tv.isReachable}
                >
                  <Power className="w-4 h-4" />
                  Control
                </Button>

                {tv.status === "in-use" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="px-3"
                    onClick={() => {
                      setSelectedTV(tv);
                      setIsAddOnOpen(true);
                    }}
                    title="Order Food/Drinks"
                  >
                    <Utensils className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    setSelectedTV(tv);
                    setIsNewRentalOpen(true);
                  }}
                  disabled={tv.status !== "available" || !tv.isOnline}
                  title={
                    !tv.isOnline
                      ? "TV must be powered on to create rental"
                      : tv.status !== "available"
                        ? "TV is not available"
                        : "Create new rental"
                  }
                >
                  <Plus className="w-4 h-4" />
                  Rent
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTV && (
        <>
          <TVControlDialog
            tv={selectedTV}
            open={isControlOpen}
            onOpenChange={setIsControlOpen}
            onSuccess={() => {
              setIsControlOpen(false);
              fetchTVs();
            }}
          />
          <NewRentalDialog
            tv={selectedTV}
            open={isNewRentalOpen}
            onOpenChange={setIsNewRentalOpen}
            onSuccess={() => {
              setIsNewRentalOpen(false);
              fetchTVs();
            }}
          />
          <AddOnDialog
            rentalId={
              selectedTV.currentRental && selectedTV.currentRental._id
                ? String(selectedTV.currentRental._id)
                : selectedTV.currentRentalId
                  ? String(selectedTV.currentRentalId)
                  : ""
            }
            tvName={selectedTV.name}
            open={isAddOnOpen}
            onOpenChange={setIsAddOnOpen}
            onSuccess={() => {
              setIsAddOnOpen(false);
              fetchTVs();
            }}
          />
        </>
      )}
    </div>
  );
}
