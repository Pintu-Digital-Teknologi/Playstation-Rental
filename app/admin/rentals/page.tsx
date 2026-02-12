import { getAdminFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { RentalsList } from "@/components/admin/rentals-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rentals - Admin Dashboard",
  description: "View all rental sessions",
};

export default async function RentalsPage() {
  const admin = await getAdminFromSession();

  if (!admin) {
    redirect("/auth/login");
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Rental Sessions
        </h1>
        <p className="text-muted-foreground">
          View and manage all PlayStation rental sessions
        </p>
      </div>

      <RentalsList />
    </div>
  );
}
