"use client";

import { useState } from "react";
import { Volume2, Volume1 } from "lucide-react";
import { controlTVAction } from "@/lib/actions/tv";
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

interface TVUnit {
  _id: string;
  name: string;
}

interface TVControlDialogProps {
  tv: TVUnit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TVControlDialog({
  tv,
  open,
  onOpenChange,
  onSuccess,
}: TVControlDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("60");
  const [successMessage, setSuccessMessage] = useState("");

  const handleAction = async (action: string) => {
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const result = await controlTVAction(tv._id, action, {
        timerMinutes: parseInt(timerMinutes),
      });

      if (result.error) {
        setError(result.error || "Action failed");
        return;
      }

      setSuccessMessage(result.message || "Action successful");
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Control {tv.name}</DialogTitle>
          <DialogDescription>
            Manage power, timer, and other settings for this TV unit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-500/20 bg-green-500/10">
              <AlertDescription className="text-green-400">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="timer">Timer Duration (minutes)</Label>
            <Input
              id="timer"
              type="number"
              min="1"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction("power-on")}
              disabled={loading}
            >
              Power On
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("power-off")}
              disabled={loading}
            >
              Power Off
            </Button>

            {/* Volume Controls */}
            <Button
              variant="outline"
              onClick={() => handleAction("volume-up")}
              disabled={loading}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Vol +
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("volume-down")}
              disabled={loading}
              className="gap-2"
            >
              <Volume1 className="h-4 w-4" />
              Vol -
            </Button>

            <Button
              onClick={() => handleAction("set-timer")}
              disabled={loading}
            >
              Set Timer
            </Button>
            <Button
              onClick={() => handleAction("extend-timer")}
              disabled={loading}
            >
              Extend Timer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
