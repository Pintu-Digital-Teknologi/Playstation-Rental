"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Loader2,
  Square,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatTime } from "@/lib/function";

interface Rental {
  _id: string;
  customerName: string;
  customerPhone: string;
  status: "active" | "completed" | "paused";
  durationMs: number;
  remainingMs: number;
  totalPrice: number;
  startTime: string;
  tv: {
    name: string;
  };
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

export function RentalsList() {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "paused">(
    "active",
  );
  const [processing, setProcessing] = useState<string | null>(null);
  const [rentalToFinish, setRentalToFinish] = useState<string | null>(null);

  useEffect(() => {
    fetchRentals();
    const interval = setInterval(fetchRentals, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRentals = async () => {
    try {
      const response = await fetch(`/api/rental/list?status=${filter}`);
      if (!response.ok) throw new Error("Failed to fetch rentals");
      const data = await response.json();
      setRentals(data.rentals);
      setError("");
    } catch (err) {
      setError("Failed to load rentals");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (rentalId: string) => {
    setProcessing(rentalId);
    try {
      const res = await fetch("/api/rental/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId }),
      });
      if (!res.ok) throw new Error("Failed to pause");
      toast({
        title: "Rental Paused",
        description: "The rental session has been paused.",
      });
      fetchRentals();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to pause rental",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleResume = async (rentalId: string) => {
    setProcessing(rentalId);
    try {
      const res = await fetch("/api/rental/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId }),
      });
      if (!res.ok) throw new Error("Failed to resume");
      toast({
        title: "Rental Resumed",
        description: "The rental session is active again.",
      });
      fetchRentals();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resume rental",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleForceFinish = (rentalId: string) => {
    setRentalToFinish(rentalId);
  };

  const confirmFinish = async () => {
    if (!rentalToFinish) return;

    setProcessing(rentalToFinish);
    try {
      const res = await fetch("/api/rental/force-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId: rentalToFinish }),
      });
      if (!res.ok) throw new Error("Failed to finish");
      toast({
        title: "Rental Finished",
        description: "The rental has been stopped and marked as completed.",
      });
      fetchRentals();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to finish rental",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
      setRentalToFinish(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center text-muted-foreground">
        Loading rentals...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rental Sessions</CardTitle>
          <CardDescription>
            Monitor all PlayStation rental sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              {rentals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {filter} rentals
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Customer</TableHead>
                        <TableHead>TV</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time Remaining</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentals.map((rental) => (
                        <TableRow key={rental._id} className="border-border">
                          <TableCell className="font-medium">
                            {rental.customerName}
                          </TableCell>
                          <TableCell>{rental.tv.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rental.customerPhone}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                rental.status === "active"
                                  ? "default"
                                  : rental.status === "completed"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {rental.status === "active"
                                ? "In Progress"
                                : rental.status === "completed"
                                  ? "Completed"
                                  : "Paused"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-accent font-semibold">
                            {formatTime(rental.remainingMs)}
                          </TableCell>
                          <TableCell>
                            Rp {rental.totalPrice.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(rental.startTime)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  {processing === rental._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {rental.status === "active" && (
                                  <DropdownMenuItem
                                    onClick={() => handlePause(rental._id)}
                                    className="text-yellow-600 focus:text-yellow-600"
                                  >
                                    <PauseCircle className="mr-2 h-4 w-4" />
                                    Pause Rental
                                  </DropdownMenuItem>
                                )}
                                {rental.status === "paused" && (
                                  <DropdownMenuItem
                                    onClick={() => handleResume(rental._id)}
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Resume Rental
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleForceFinish(rental._id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Square className="mr-2 h-4 w-4 fill-current" />
                                  Stop & Finish
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!rentalToFinish}
        onOpenChange={(open) => !open && setRentalToFinish(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop and Finish Rental?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately stop the rental session and calculate the
              final price based on the current usage. The TV status will be set
              to available. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFinish}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Stop & Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
