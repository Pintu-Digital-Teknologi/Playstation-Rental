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
import { Plus, Trash, Copy, Key } from "lucide-react";
import { License } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LicensePage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [duration, setDuration] = useState("30");

    useEffect(() => {
        fetchLicenses();
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
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create New License</CardTitle>
                    <CardDescription>
                        Generate a new API key for a client PC
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label>Name / Location</label>
                            <Input
                                placeholder="e.g. Server Rental 1"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2 w-32">
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires At</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {licenses.map((license) => (
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
                                                className={`px-2 py-1 rounded text-xs ${new Date(license.expiresAt) > new Date()
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {new Date(license.expiresAt) > new Date()
                                                    ? "Active"
                                                    : "Expired"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(license.expiresAt), "dd MMM yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteLicense(license._id?.toString()!)}
                                            >
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
