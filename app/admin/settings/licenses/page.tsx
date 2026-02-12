"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash, Copy, Key, Edit, RefreshCw } from "lucide-react";
import { License } from "@/lib/types";
import { toast } from "sonner";
import { format, differenceInSeconds } from "date-fns";
import { EditLicenseDialog } from "../../../../components/admin/edit-license-dialog";

export default function LicensePage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [duration, setDuration] = useState("30");
    const [editingLicense, setEditingLicense] = useState<License | null>(null);

    useEffect(() => {
        fetchLicenses();
        // Auto-refresh status every 30s
        const interval = setInterval(fetchLicenses, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchLicenses() {
        try {
            const res = await fetch("/api/licenses/list");
            const data = await res.json();
            if (data.licenses) {
                setLicenses(data.licenses);
            }
        } catch (error) {
            toast.error("Failed to fetch licenses");
        } finally {
            setLoading(false);
        }
    }

    async function createLicense() {
        if (!newName) return toast.error("Name is required");

        try {
            const res = await fetch("/api/licenses/create", {
                method: "POST",
                body: JSON.stringify({
                    name: newName,
                    durationDays: parseInt(duration),
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("License created");
                fetchLicenses();
                setNewName("");
                setDuration("30");
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error("Failed to create license");
        }
    }

    async function deleteLicense(id: string) {
        if (!confirm("Are you sure you want to revoke this license?")) return;

        try {
            const res = await fetch("/api/licenses/delete", {
                method: "POST",
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("License revoked");
                fetchLicenses();
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error("Failed to revoke license");
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">License Keys</h1>
                    <p className="text-muted-foreground">
                        Manage API keys for local bridge connections
                    </p>
                </div>
                <Button variant="outline" onClick={fetchLicenses}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create New License</CardTitle>
                    <CardDescription>
                        Generate a new API key for a client PC
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4 items-end">
                            <div className="grid gap-2 flex-1">
                                <label>Name / Location</label>
                                <Input
                                    placeholder="e.g. Server Rental 1"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2 w-48">
                                <label>Duration (Days)</label>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                />
                            </div>
                            <Button onClick={createLicense}>
                                <Plus className="w-4 h-4 mr-2" />
                                Generate
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-sm text-muted-foreground self-center">Presets:</span>
                            <Button variant="outline" size="sm" onClick={() => setDuration("30")}>30 Days</Button>
                            <Button variant="outline" size="sm" onClick={() => setDuration("180")}>6 Months</Button>
                            <Button variant="outline" size="sm" onClick={() => setDuration("365")}>1 Year</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Active Licenses</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>Connection</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires At</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {licenses.map((license) => {
                                    const isExpired = new Date(license.expiresAt) < new Date();
                                    const isOnline = license.lastUsedAt && differenceInSeconds(new Date(), new Date(license.lastUsedAt)) < 60;

                                    return (
                                        <TableRow key={license._id?.toString()}>
                                            <TableCell className="font-medium">{license.name}</TableCell>
                                            <TableCell className="font-mono bg-muted p-1 rounded text-xs select-all">
                                                {license.key}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 ml-2"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(license.key);
                                                        toast.success("Copied to clipboard");
                                                    }}
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${isOnline
                                                        ? "bg-green-100 text-green-800 animate-pulse"
                                                        : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {isOnline ? "ONLINE" : "OFFLINE"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${!isExpired
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {!isExpired ? "Active" : "Expired"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(license.expiresAt), "dd MMM yyyy")}
                                            </TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingLicense(license)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteLicense(license._id?.toString()!)}
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <EditLicenseDialog
                license={editingLicense}
                open={!!editingLicense}
                onOpenChange={(open) => !open && setEditingLicense(null)}
                onSuccess={fetchLicenses}
            />
        </div>
    );
}
