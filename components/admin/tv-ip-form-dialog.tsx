"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import type { TVUnit } from "@/lib/types";
import { createTVAction, updateTVAction } from "@/app/actions/tv";

interface TVIPFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tv?: TVUnit | null;
  onSuccess: () => void;
}

export function TVIPFormDialog({
  open,
  onOpenChange,
  tv,
  onSuccess,
}: TVIPFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    ipAddress: "",
    macAddress: "",
    description: "",
    pricePerHour: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tv) {
      setFormData({
        name: tv.name,
        ipAddress: tv.ipAddress,
        macAddress: tv.macAddress || "",
        description: tv.description || "",
        pricePerHour: tv.pricePerHour ? tv.pricePerHour.toString() : "",
      });
    } else {
      setFormData({
        name: "",
        ipAddress: "",
        macAddress: "",
        description: "",
        pricePerHour: "",
      });
    }
    setError(null);
  }, [tv, open]);

  const validateIPAddress = (ip: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    // Validate each octet
    const octets = ip.split(".");
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  };

  const validateMACAddress = (mac: string): boolean => {
    // Basic validation format (XX:XX:XX:XX:XX:XX)
    return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("TV name is required");
      return;
    }

    if (!formData.ipAddress.trim()) {
      setError("IP address is required");
      return;
    }

    if (!validateIPAddress(formData.ipAddress)) {
      setError("Please enter a valid IP address (e.g., 192.168.1.100)");
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('ipAddress', formData.ipAddress);
      if (formData.macAddress) formDataToSend.append('macAddress', formData.macAddress);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.pricePerHour) formDataToSend.append('pricePerHour', formData.pricePerHour);

      let result;
      if (tv) {
        if (!tv._id) {
          setError("TV ID is missing");
          setIsLoading(false);
          return;
        }
        result = await updateTVAction(tv._id.toString(), formDataToSend);
      } else {
        result = await createTVAction(formDataToSend);
      }

      if (result.error) {
        // Just set the error as returned from the server (which includes details now)
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(`Failed to ${tv ? "update" : "create"} TV`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {tv ? "Edit TV IP Address" : "Add New TV Unit"}
          </DialogTitle>
          <DialogDescription>
            {tv
              ? "Update the TV name and IP address"
              : "Configure a new PlayStation TV unit with its static IP address"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">TV Name</Label>
            <Input
              id="name"
              placeholder="e.g., TV 1, PlayStation Console A"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip">Static IP Address</Label>
            <Input
              id="ip"
              placeholder="e.g., 192.168.1.100"
              value={formData.ipAddress}
              onChange={(e) =>
                setFormData({ ...formData, ipAddress: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Ensure the TV is configured with this static IP on your network
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac">MAC Address (Optional)</Label>
            <Input
              id="mac"
              placeholder="e.g., 00:1A:2B:3C:4D:5E"
              value={formData.macAddress}
              onChange={(e) =>
                setFormData({ ...formData, macAddress: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Required for Wake-on-LAN functionality
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Living Room TV, Premium Unit"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Description of the TV or location
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price Per Hour (Optional, Rp)</Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g., 50000"
              value={formData.pricePerHour}
              onChange={(e) =>
                setFormData({ ...formData, pricePerHour: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Default price per hour in Indonesian Rupiah
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tv ? "Update TV" : "Create TV"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
