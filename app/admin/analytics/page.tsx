import { getAdminFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics - Admin Dashboard",
  description: "Revenue and utilization analytics",
};

export default async function AnalyticsPage() {
  const admin = await getAdminFromSession();

  if (!admin) {
    redirect("/auth/login");
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Business Analytics
        </h1>
        <p className="text-muted-foreground">
          Revenue and TV utilization insights
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
