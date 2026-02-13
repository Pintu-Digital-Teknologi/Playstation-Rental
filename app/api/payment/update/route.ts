import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getAdminFromSession } from "@/lib/auth";
import { ObjectId } from "mongodb";

interface UpdatePaymentRequest {
  paymentId: string;
  status: "pending" | "paid" | "overdue";
  paymentMethod?: "cash" | "qris" | "transfer";
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, status, notes, paymentMethod } =
      (await request.json()) as UpdatePaymentRequest;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // Verify Payment exists and fetch rentalId
    const payment = await db
      .collection("payments")
      .findOne({ _id: new ObjectId(paymentId) });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Check Rental Status
    const rental = await db
      .collection("rentals")
      .findOne({ _id: payment.rentalId });
    if (!rental) {
      return NextResponse.json(
        { error: "Associated rental not found" },
        { status: 404 },
      );
    }

    // Restriction: Cannot pay if rental is active (must be completed)
    if (rental.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Cannot process payment. Rental session is still active/ongoing.",
        },
        { status: 400 },
      );
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    if (status === "paid") {
      // Link to Active Shift
      const activeShift = await db
        .collection("shifts")
        .findOne({ status: "active" });
      if (activeShift) {
        updateData.shiftId = activeShift._id;
        updateData.cashierName = activeShift.operatorName; // Record the active cashier
      }
    }

    const result = await db
      .collection("payments")
      .updateOne({ _id: new ObjectId(paymentId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
