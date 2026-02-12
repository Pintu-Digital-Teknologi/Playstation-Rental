import { IPManagementList } from "@/components/admin/ip-management-list";
import { Metadata } from "next";

// Hapus import AdminLayout karena sudah ada di layout.tsx utama

export const metadata: Metadata = {
  title: "IP Management - PlayStation Rental",
  description: "Manage TV unit IP addresses",
};

export default function IPManagementPage() {
  // Langsung return div content, jangan dibungkus AdminLayout lagi
  return (
    <>
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          IP Management
        </h1>
        <p className="text-muted-foreground">
          Configure and manage static IP addresses for your PlayStation TV units
        </p>
      </div>

      <IPManagementList />
    </div>
    </>
  );
}
