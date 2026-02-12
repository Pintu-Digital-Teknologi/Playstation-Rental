import { getAdminFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentsList } from "@/components/admin/payments-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments - Admin Dashboard",
  description: "Manage payment records",
};

export default async function PaymentsPage() {
  const admin = await getAdminFromSession();

  if (!admin) {
    redirect("/auth/login");
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Payment Tracking
        </h1>
        <p className="text-muted-foreground">
          Track and manage customer payments
        </p>
      </div>

      <PaymentsList />
    </div>
  );
}
