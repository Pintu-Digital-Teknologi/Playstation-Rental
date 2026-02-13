import { getAdminFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminFromSession();

  if (!admin) {
    redirect("/auth/login");
  }

  return (
    <AdminLayout
      user={{
        _id: admin._id.toString(),
        username: admin.username,
        fullName: admin.fullName || admin.username,
        role: admin.role,
      }}
    >
      {children}
    </AdminLayout>
  );
}
