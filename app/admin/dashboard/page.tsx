import type { Metadata } from "next";
import { TVManagementGrid } from "@/components/admin/tv-management-grid";

export const metadata: Metadata = {
  title: "TV Management - Admin Dashboard",
  description: "Manage PlayStation TV units",
};

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          TV Management
        </h1>
        <p className="text-muted-foreground">
          Monitor and control your PlayStation units
        </p>
      </div>

      <TVManagementGrid />
    </div>
  );
}
