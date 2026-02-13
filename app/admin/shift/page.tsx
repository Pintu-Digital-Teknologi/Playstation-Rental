"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  PlayCircle,
  StopCircle,
  Receipt,
  Eye,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useUser } from "@/components/admin/user-context";

interface Shift {
  _id: string;
  operatorName: string;
  startTime: string;
  endTime?: string;
  status: "active" | "completed";
  totalRevenue: number;
  totalTransactions: number;
  transactions?: any[]; // For active reports
}

interface Transaction {
  _id: string;
  paymentId: string;
  startTime?: string;
  endTime?: string;
  tvName?: string;
  description?: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  fullName: string;
  role: "admin" | "operator";
}

export default function ShiftManagementPage() {
  const { toast } = useToast();
  const currentUser = useUser();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>(
    [],
  );
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Password Dialog State
  const [password, setPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchActiveShift(), fetchHistory(), fetchUsers()]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load shift data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShift = async () => {
    const res = await fetch("/api/shifts/active");
    if (res.ok) {
      const data = await res.json();
      setActiveShift(data); // data is Shift object or null
    }
  };

  const fetchHistory = async () => {
    const res = await fetch("/api/shifts");
    if (res.ok) {
      const data = await res.json();
      setShiftsHistory(data);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      // Filter operators only? The requirement says "pilihan user sesi dimana user tersebut memiliki role operator"
      const operators = data.filter(
        (u: User) => u.role === "operator" || u.role === "admin",
      ); // Allow admin too for flexibility
      setUsers(operators);
    }
  };

  const openPasswordDialog = () => {
    if (!selectedUser) {
      toast({
        title: "Select Operator",
        description: "Please select an operator to start the shift.",
        variant: "destructive",
      });
      return;
    }
    setPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleStartShift = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedUser || !password) {
      return;
    }

    setProcessing(true);
    try {
      const selectedUserData = users.find((u) => u._id === selectedUser);
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: selectedUser,
          operatorName: selectedUserData?.fullName || "Unknown",
          password: password,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start shift");
      }

      toast({
        title: "Shift Started",
        description: "New shift session has begun.",
      });
      setIsPasswordDialogOpen(false);
      setPassword("");
      await fetchActiveShift(); // Refresh active state
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/shifts/${activeShift._id}/end`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to end shift");
      }

      toast({
        title: "Shift Ended",
        description: "Shift session closed successfully.",
      });
      setActiveShift(null);
      await fetchHistory(); // Add to history list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = async (shift: Shift) => {
    setDetailShift(shift);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/shifts/${shift._id}/transactions`);
      if (res.ok) {
        const data = await res.json();
        setDetailTransactions(data);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full bg-gradient-to-r from-background to-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {activeShift ? "Shift Active" : "Shift Management"}
              </CardTitle>
              <CardDescription>
                {activeShift
                  ? `Session is currently running.`
                  : `Start a new shift session below.`}
              </CardDescription>
            </div>

            {activeShift ? (
              <div className="flex items-center gap-3 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Cashier
                  </p>
                  <p className="font-bold text-lg leading-none text-green-700">
                    {activeShift.operatorName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Current Admin
                  </p>
                  <p className="font-bold text-lg leading-none">
                    {currentUser.fullName}
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Session Control */}
      <Card>
        <CardHeader>
          <CardTitle>Session Control (Kontrol Sesi)</CardTitle>
          <CardDescription>Start or stop cashier shifts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium">Select Operator</label>
              <Select
                value={activeShift ? activeShift.operatorName : selectedUser}
                onValueChange={setSelectedUser}
                disabled={!!activeShift}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      activeShift ? activeShift.operatorName : "Select Operator"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.fullName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={openPasswordDialog}
                disabled={!!activeShift || processing || !selectedUser}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Mulai (Start)
              </Button>
              <Button
                onClick={handleEndShift}
                disabled={!activeShift || processing}
                variant="destructive"
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-4 w-4" />
                )}
                Selesai (Stop/Finish)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Report (Laporan Aktif) */}
      {activeShift && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Active Report (Laporan Aktif)
            </CardTitle>
            <CardDescription>
              Transactions for current shift started at{" "}
              {new Date(activeShift.startTime).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>TV Unit</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeShift.transactions &&
                activeShift.transactions.length > 0 ? (
                  activeShift.transactions.map((tx: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {tx.startTime
                          ? new Date(tx.startTime).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {tx.endTime
                          ? new Date(tx.endTime).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>{tx.tvName || "-"}</TableCell>
                      <TableCell className="capitalize">
                        {tx.paymentMethod}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tx.cashierName || activeShift.operatorName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        Rp {tx.amount?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground h-24"
                    >
                      No transactions yet in this shift.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Shift History (Riwayat Shift Selesai) */}
      <Card>
        <CardHeader>
          <CardTitle>Shift History (Riwayat Shift Selesai)</CardTitle>
          <CardDescription>Past completed shifts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Close Time</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Total Transactions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftsHistory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No history found.
                  </TableCell>
                </TableRow>
              ) : (
                shiftsHistory.map((shift) => (
                  <TableRow key={shift._id}>
                    <TableCell>
                      {shift.endTime
                        ? new Date(shift.endTime).toLocaleString()
                        : "Active"}
                    </TableCell>
                    <TableCell>{shift.operatorName}</TableCell>
                    <TableCell>{shift.totalTransactions}</TableCell>
                    <TableCell className="text-right font-medium">
                      Rp {shift.totalRevenue?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(shift)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={!!detailShift}
        onOpenChange={(open) => !open && setDetailShift(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              Transaction history for shift by {detailShift?.operatorName}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {loadingDetails ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailTransactions.map((tx: any, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {tx.description || tx.tvName || "Payment"}
                          {tx.tvName && (
                            <span className="text-xs text-muted-foreground block">
                              {tx.tvName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {tx.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right">
                          Rp {tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
            <DialogDescription>
              Please enter the password for the selected operator to start the
              shift.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartShift} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shift-password">Password</Label>
              <Input
                id="shift-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter operator password"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={processing}>
                {processing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
