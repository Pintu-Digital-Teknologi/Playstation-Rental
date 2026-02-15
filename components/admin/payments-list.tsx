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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
  Utensils,
  Monitor,
  CreditCard,
} from "lucide-react";
import { Rental } from "@/lib/types";
import { formatTime } from "@/lib/function";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Interface extending the basic structure to include nested objects
interface Payment {
  _id: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paymentMethod?: "cash" | "qris" | "transfer";
  dueDate: string;
  paidDate?: string;
  notes?: string;
  // We use Partial<Rental> because the lookup populates it, but IDs are strings in JSON
  rental: Omit<Rental, "_id"> & { _id: string };
  tv: {
    name: string;
  };
}

export function PaymentsList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for Update Dialog
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateNote, setUpdateNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "qris" | "transfer"
  >("cash");

  // State for Detail Dialog
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payment/list");
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data.payments);
      setError("");
    } catch (err) {
      setError("Failed to load payments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (status: string) => {
    if (!selectedPayment) return;

    try {
      const response = await fetch("/api/payment/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPayment._id,
          status,
          notes: updateNote,
          paymentMethod: status === "paid" ? paymentMethod : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to update payment");

      setIsUpdateOpen(false);
      setUpdateNote("");
      setPaymentMethod("cash"); // Reset to default
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Failed to update payment");
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("id-ID", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <Check className="w-4 h-4 text-green-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "overdue":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="text-center text-muted-foreground">
        Loading payments...
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
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            Track all rental payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Customer</TableHead>
                    <TableHead>TV</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.rental.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.rental.customerPhone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.tv.name}</TableCell>
                      <TableCell className="font-semibold">
                        Rp {payment.amount.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <Badge
                            className={`${getStatusColor(payment.status)} border capitalize`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        {payment.paymentMethod && (
                          <div className="text-xs text-muted-foreground mt-1 capitalize flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />{" "}
                            {payment.paymentMethod}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(payment.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-accent/10 hover:bg-accent/20 text-accent gap-2"
                            onClick={() => {
                              setDetailPayment(payment);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            Detail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(payment);
                              // If already paid, prefer keeping its existing method or fallback to cash
                              if (payment.paymentMethod) {
                                setPaymentMethod(payment.paymentMethod);
                              } else {
                                setPaymentMethod("cash");
                              }
                              setUpdateNote(payment.notes || "");
                              setIsUpdateOpen(true);
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      {selectedPayment && (
        <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Payment</DialogTitle>
              <DialogDescription>
                Update payment status for {selectedPayment.rental.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-md">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">
                  Rp {selectedPayment.amount.toLocaleString("id-ID")}
                </p>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup
                  defaultValue="cash"
                  value={paymentMethod}
                  onValueChange={(val) => setPaymentMethod(val as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="qris" id="qris" />
                    <Label htmlFor="qris">QRIS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer">Transfer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add payment notes..."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleUpdatePayment("pending")}
                >
                  Pending
                </Button>
                <Button
                  onClick={() => handleUpdatePayment("paid")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Paid
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdatePayment("overdue")}
                >
                  Overdue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      {detailPayment && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-accent" />
                Payment Details
              </DialogTitle>
              <DialogDescription>
                Complete transaction breakdown for{" "}
                {detailPayment.rental.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* 1. Status & Basic Info */}
              <div className="flex justify-between items-start bg-secondary/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex gap-2 mt-1">
                    <Badge
                      className={`capitalize ${getStatusColor(detailPayment.status)}`}
                    >
                      {detailPayment.status}
                    </Badge>
                    {detailPayment.paymentMethod && (
                      <Badge variant="outline" className="capitalize">
                        {detailPayment.paymentMethod}
                      </Badge>
                    )}
                  </div>

                  {detailPayment.paidDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Paid on: {formatDate(detailPayment.paidDate)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-accent">
                    Rp {detailPayment.amount.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* 2. Rental Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Rental Session
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    {detailPayment.tv.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(detailPayment.rental.startTime)} -{" "}
                    {detailPayment.rental.endTime
                      ? formatDate(detailPayment.rental.endTime)
                      : "Running..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Duration: {formatTime(detailPayment.rental.durationMs)}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Customer
                  </p>
                  <p className="font-medium">
                    {detailPayment.rental.customerName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detailPayment.rental.customerPhone}
                  </p>
                  {/* Using logic from rental data if available, otherwise fallback */}
                  <p className="text-xs text-muted-foreground">
                    Key: {detailPayment.rental.publicAccessKey?.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <hr className="border-border" />

              {/* 3. Cost Breakdown */}
              <div className="space-y-3">
                <p className="font-semibold flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Cost Breakdown
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Base Rental Cost
                    </span>
                    <span>
                      Rp{" "}
                      {(detailPayment.rental.rentalCost || 0).toLocaleString(
                        "id-ID",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons / F&B</span>
                    <span>
                      Rp{" "}
                      {(detailPayment.rental.addOnsCost || 0).toLocaleString(
                        "id-ID",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-border mt-2">
                    <span>Total</span>
                    <span>
                      Rp{" "}
                      {(
                        detailPayment.rental.grandTotal || detailPayment.amount
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Add-ons Detail List */}
              {detailPayment.rental.addOns &&
                detailPayment.rental.addOns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Ordered Items
                    </p>
                    <div className="bg-secondary/30 rounded-md p-3 max-h-40 overflow-y-auto space-y-2 text-sm">
                      {detailPayment.rental.addOns.map(
                        (item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                          >
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-muted-foreground ml-2">
                                x{item.quantity}
                              </span>
                            </div>
                            <span>Rp {item.total.toLocaleString("id-ID")}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
