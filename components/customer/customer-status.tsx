"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Clock,
  DollarSign,
  Loader2,
  Utensils,
  Receipt,
  ShoppingBag,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AddOn {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  addedAt: string;
}

interface Rental {
  _id: string;
  customerName: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  remainingMs: number;

  // Costs
  rentalCost: number;
  addOnsCost: number;
  grandTotal: number;
  totalPrice: number; // kept for compatibility alias

  addOns?: AddOn[];

  status: string;
  type?: "hourly" | "regular";
  accumulatedDuration?: number;
}

export function CustomerStatus({ accessKey }: { accessKey: string }) {
  const [rental, setRental] = useState<Rental | null>(null);
  const [tv, setTv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);

  // Ref untuk menyimpan status terbaru agar bisa diakses di dalam interval tanpa stale closure
  const statusRef = useRef("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/status/${accessKey}`);
      if (!res.ok) throw new Error("Gagal memuat status");
      const data = await res.json();
      setRental(data.rental);
      setTv(data.tv);
      statusRef.current = data.rental.status;
    } catch (err) {
      setError("Informasi rental tidak ditemukan");
    } finally {
      setLoading(false);
    }
  }, [accessKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // LOGIKA 1: Sinkronisasi ke Server (Background Sync)
  useEffect(() => {
    if (!rental || statusRef.current !== "active") return;

    const syncWithServer = async () => {
      try {
        const res = await fetch(`/api/status/${accessKey}/sync`, {
          method: "POST",
        });
        const data = await res.json();

        if (data.status === "completed" && statusRef.current !== "completed") {
          statusRef.current = "completed";
          fetchData(); // Refresh data penuh jika sudah selesai
        }
      } catch (e) {
        console.error("Sync error:", e);
      }
    };

    // Sinkronisasi setiap 30 detik
    const syncInterval = setInterval(syncWithServer, 30000);
    return () => clearInterval(syncInterval);
  }, [rental, accessKey, fetchData]);

  // LOGIKA 2: Visual Timer (Berbasis Waktu Absolut)
  useEffect(() => {
    if (!rental || rental.status !== "active") {
      setTimerSeconds(0);
      return;
    }

    const updateTimer = () => {
      if (rental.status === "paused") {
        if (
          rental.type === "regular" &&
          rental.accumulatedDuration !== undefined
        ) {
          setTimerSeconds(Math.floor(rental.accumulatedDuration / 1000));
        } else if (rental.type === "hourly") {
          setTimerSeconds(Math.floor(rental.remainingMs / 1000));
        }
        return;
      }

      const now = Date.now();

      if (rental.type === "regular") {
        // Count UP
        const startTime = new Date(rental.startTime).getTime();
        const diff = Math.floor((now - startTime) / 1000);
        setTimerSeconds(diff);

        if (rental.status === "paused") {
          return;
        }
      } else {
        // Count DOWN
        const endTime =
          new Date(rental.startTime).getTime() + rental.durationMs;
        const diff = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimerSeconds(diff);

        if (rental.status === "paused") {
          setTimerSeconds(Math.floor(rental.remainingMs / 1000));
        }

        if (diff <= 0 && statusRef.current === "active") {
          statusRef.current = "completed";
          fetchData(); // Ambil status final dari server
        }
      }
    };

    updateTimer(); // Jalankan langsung
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [rental, fetchData, tv]);

  const handleFinishClick = () => {
    setIsFinishDialogOpen(true);
  };

  const confirmFinishRental = async () => {
    if (!rental) return;

    try {
      setIsFinishing(true);
      const res = await fetch("/api/rental/force-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId: rental._id, accessKey }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Session finished successfully");
        setIsFinishDialogOpen(false);
        fetchData();
      } else {
        toast.error(json.error || "Failed to finish session");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsFinishing(false);
    }
  };

  const calculateRegularRentalCost = () => {
    if (rental?.type !== "regular" || !tv?.pricePerHour)
      return rental?.rentalCost || 0;
    // Calculate based on elapsed time (in hours)
    const hours = timerSeconds / 3600;
    return Math.ceil(hours * tv.pricePerHour);
  };

  const computedRentalCost =
    rental?.type === "regular"
      ? calculateRegularRentalCost()
      : rental?.rentalCost || 0;

  const currentAddOnsCost = rental?.addOnsCost || 0;
  const currentGrandTotal = computedRentalCost + currentAddOnsCost;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading rental status...</p>
        </div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="text-muted-foreground">{error || "Rental not found"}</p>
        </div>
      </div>
    );
  }

  const totalSeconds = Math.floor(rental.durationMs / 1000);
  const timePercentage =
    rental?.type === "regular"
      ? 100
      : (timerSeconds / (totalSeconds || 1)) * 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            PlayStation Rental
          </h1>
          <p className="text-muted-foreground">
            Check your rental status in real-time
          </p>
        </div>

        {/* Main Status Card */}
        <Card className="border border-accent/20 bg-gradient-to-br from-card to-secondary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-6 h-6 text-accent" />
                  {tv?.name || "PlayStation Unit"}
                </CardTitle>
                <CardDescription>
                  Rental ID: {rental._id.slice(-8)}
                  {rental.type === "regular" && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                      Regular
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge className={`${getStatusColor(rental.status)} border`}>
                {rental.status === "active"
                  ? "In Progress"
                  : rental.status === "completed"
                    ? "Completed"
                    : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time Timer - Main Focus */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {rental.type === "regular" ? "Time Elapsed" : "Time Remaining"}
              </p>
              <p className="text-5xl font-bold text-accent font-mono">
                {rental.status === "paused" ? (
                  <span className="text-yellow-500 animate-pulse">PAUSED</span>
                ) : (
                  formatTime(timerSeconds)
                )}
              </p>
              {rental.status === "paused" && (
                <p className="text-sm text-yellow-500 font-medium">
                  {rental.type === "regular"
                    ? `Stopped at: ${formatTime(rental.accumulatedDuration ? Math.floor(rental.accumulatedDuration / 1000) : timerSeconds)}`
                    : `Time Saved: ${formatTime(Math.floor(rental.remainingMs / 1000))}`}
                </p>
              )}

              {rental.type !== "regular" && timerSeconds <= 0 && (
                <p className="text-sm text-red-400 font-semibold">
                  Time is up!
                </p>
              )}
            </div>

            {/* Progress Bar (Only for hourly) */}
            {rental.type !== "regular" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(timePercentage)}%</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-accent transition-all duration-1000"
                    style={{ width: `${Math.max(0, timePercentage)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Price Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Rental Cost */}
              <div className="col-span-1 p-3 bg-card rounded-lg border border-border space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> Rental Cost
                </p>
                <p className="font-semibold text-foreground">
                  Rp {computedRentalCost.toLocaleString("id-ID")}
                </p>
              </div>

              {/* Add-ons Cost */}
              <div className="col-span-1 p-3 bg-card rounded-lg border border-border space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Utensils className="w-3 h-3" /> F&B / Add-ons
                </p>
                <p className="font-semibold text-foreground">
                  Rp {currentAddOnsCost.toLocaleString("id-ID")}
                </p>
              </div>

              {/* Total Price - Full Width */}
              <div className="col-span-2 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-1 flex justify-between items-center">
                <div>
                  <p className="text-xs text-primary/80 flex items-center gap-1 font-medium">
                    <Receipt className="w-3 h-3" /> Grand Total
                  </p>
                  <p className="text-xl font-bold text-primary">
                    Rp {currentGrandTotal.toLocaleString("id-ID")}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* F&B Orders List */}
        {rental.addOns && rental.addOns.length > 0 && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent" />
                Your Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rental.addOns.map((item, index) => (
                  <div
                    key={`${item.menuItemId}-${index}`}
                    className="flex justify-between items-center pb-3 last:pb-0 last:border-0 border-b border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.addedAt).split(",")[1]}{" "}
                        {/* Time only */}
                      </p>
                    </div>
                    <p className="font-medium text-foreground text-sm">
                      Rp {item.total.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total F&B
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    Rp {currentAddOnsCost.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rental Details Card */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Rental Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Customer Name</span>
                <span className="font-medium text-foreground">
                  {rental.customerName}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Start Time</span>
                <span className="font-medium text-foreground">
                  {formatDate(rental.startTime)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Duration Info</span>
                <span className="font-medium text-foreground">
                  {rental.type === "regular"
                    ? "Open Ended"
                    : `${Math.floor(rental.durationMs / (3600 * 1000))}h ${Math.floor((rental.durationMs % (3600 * 1000)) / 60000)}m`}
                </span>
              </div>
              {rental.endTime && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">End Time</span>
                  <span className="font-medium text-foreground">
                    {formatDate(rental.endTime)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        {rental.status !== "completed" && (
          <div className="pt-4">
            <Button
              className="w-full h-12 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
              onClick={handleFinishClick}
              disabled={isFinishing}
            >
              {isFinishing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Finishing Session...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-5 w-5 fill-current" />
                  Finish Rental Session
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Clicking this will end your session immediately. Please proceed to
              payment.
            </p>
          </div>
        )}

        {/* Footer Message */}
        {rental.status === "completed" && (
          <div className="text-center text-sm text-muted-foreground p-4 rounded-lg bg-secondary border border-border">
            <p>Session ended. Please proceed to the cashier for payment.</p>
          </div>
        )}

        <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finish Rental Session?</DialogTitle>
              <DialogDescription>
                Are you sure you want to end your rental session now? The timer
                will stop, and your final bill will be calculated.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Total</span>
                <span className="font-bold text-lg">
                  Rp {currentGrandTotal.toLocaleString("id-ID")}
                </span>
              </div>
              {rental.type === "regular" && (
                <div className="p-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded border border-yellow-500/20">
                  For regular rentals, price is calculated based on time used so
                  far.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsFinishDialogOpen(false)}
                disabled={isFinishing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmFinishRental}
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  "Yes, Finish Session"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
