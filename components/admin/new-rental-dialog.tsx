"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Copy, Check, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TVUnit {
  _id: string;
  name: string;
  pricePerHour?: number;
}

interface NewRentalDialogProps {
  tv: TVUnit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewRentalDialog({
  tv,
  open,
  onOpenChange,
  onSuccess,
}: NewRentalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successData, setSuccessData] = useState<{
    publicAccessKey: string;
    totalPrice: number;
    customerName: string;
    durationMinutes: number;
  } | null>(null);

  const [rentalType, setRentalType] = useState<"hourly" | "regular">("hourly");

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    durationMinutes: "60",
    pricePerHour: tv?.pricePerHour?.toString() || "50000", // Indonesian Rupiah
  });

  // Update pricePerHour when tv changes
  React.useEffect(() => {
    if (open && tv?.pricePerHour) {
      setFormData((prev) => ({
        ...prev,
        pricePerHour: tv.pricePerHour?.toString() || "50000",
      }));
    }
  }, [open, tv]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/rental/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvId: tv._id,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          durationMinutes:
            rentalType === "hourly"
              ? parseInt(formData.durationMinutes)
              : undefined,
          pricePerHour: parseInt(formData.pricePerHour),
          type: rentalType,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create rental");
        return;
      }

      // Show success modal
      setSuccessData({
        publicAccessKey: data.rental.publicAccessKey,
        totalPrice: data.rental.totalPrice,
        customerName: data.rental.customerName,
        durationMinutes: data.rental.durationMinutes || 0,
      });
      setShowSuccessModal(true);

      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        durationMinutes: "60",
        pricePerHour: "50000",
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAccessKey = async () => {
    if (successData?.publicAccessKey) {
      try {
        await navigator.clipboard.writeText(successData.publicAccessKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCopied(false);
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Add preset durations
  const presetDurations = [60, 120, 180, 240, 300];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Rental - {tv.name}</DialogTitle>
            <DialogDescription>
              Select rental type and enter details
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="hourly"
            value={rentalType}
            onValueChange={(v) => setRentalType(v as "hourly" | "regular")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hourly">Hourly Package</TabsTrigger>
              <TabsTrigger value="regular">Regular (Open)</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <Alert className="border-destructive bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <TabsContent value="hourly" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Package</Label>
                  <div className="flex flex-wrap gap-2">
                    {presetDurations.map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant={
                          parseInt(formData.durationMinutes) === mins
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            durationMinutes: mins.toString(),
                          })
                        }
                        className="flex-1 min-w-12"
                      >
                        {mins / 60} Hr
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Custom Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMinutes: e.target.value,
                      })
                    }
                    required={rentalType === "hourly"}
                    disabled={loading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="regular" className="space-y-4">
                <div className="p-4 border rounded-md bg-blue-50/50 dark:bg-blue-900/10 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium">
                    Time will be tracked automatically
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Timer starts when you create the rental
                  </p>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="price">Price per Hour (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.pricePerHour}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerHour: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="p-3 bg-secondary rounded-md">
                <p className="text-sm text-muted-foreground">
                  Estimated Total:
                </p>
                <p className="text-lg font-bold text-foreground">
                  Rp{" "}
                  {rentalType === "hourly"
                    ? (
                      (parseInt(formData.durationMinutes || "0") / 60) *
                      parseInt(formData.pricePerHour || "0")
                    ).toLocaleString("id-ID")
                    : "Calculated at end"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Start Rental"}
                </Button>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={handleModalClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Rental Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Here are the details for the rental
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Access Key */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                Access Key
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 text-lg font-mono font-bold tracking-wider">
                  {successData?.publicAccessKey}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyAccessKey}
                  className="h-9 w-9 shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this key with the customer
              </p>
            </div>

            {/* Customer Name */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">
                {successData?.customerName}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-sm font-medium">
                {successData?.durationMinutes} minutes
              </span>
            </div>

            {/* Total Price */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Total Price</span>
              <span className="text-lg font-bold text-foreground">
                {successData && formatPrice(successData.totalPrice)}
              </span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleModalClose}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
