"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { License } from "@/lib/types";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditLicenseDialogProps {
    license: License | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditLicenseDialog({
    license,
    open,
    onOpenChange,
    onSuccess,
}: EditLicenseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [daysToAdd, setDaysToAdd] = useState("30");

    if (!license) return null;

    const currentExpiry = new Date(license.expiresAt);
    const newExpiry = addDays(currentExpiry, parseInt(daysToAdd) || 0);

    async function handleUpdate() {
        setLoading(true);
        try {
            const res = await fetch("/api/licenses/update", {
                method: "POST",
                body: JSON.stringify({
                    id: license?._id,
                    action: "add",
                    days: parseInt(daysToAdd),
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success("License updated successfully");
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || "Failed to update license");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit License Duration</DialogTitle>
                    <DialogDescription>
                        Modify expectation date for <strong>{license.name}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Current Expiry</Label>
                        <div className="col-span-3 font-mono">
                            {format(currentExpiry, "dd MMM yyyy HH:mm")}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Add Days</Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                type="number"
                                value={daysToAdd}
                                onChange={(e) => setDaysToAdd(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">New Expiry</Label>
                        <div className="col-span-3 font-bold text-green-600">
                            {isValidDate(newExpiry)
                                ? format(newExpiry, "dd MMM yyyy HH:mm")
                                : "Invalid Date"}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <div className="text-xs text-muted-foreground self-center">Presets:</div>
                        <Button variant="outline" size="sm" onClick={() => setDaysToAdd("30")}>+30d</Button>
                        <Button variant="outline" size="sm" onClick={() => setDaysToAdd("-30")}>-30d</Button>
                        <Button variant="outline" size="sm" onClick={() => setDaysToAdd("180")}>+6mo</Button>
                        <Button variant="outline" size="sm" onClick={() => setDaysToAdd("365")}>+1yr</Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function isValidDate(d: Date | number) {
    return d instanceof Date && !isNaN(d.getTime());
}
