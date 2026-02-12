import type { Metadata } from "next";
import { CustomerStatus } from "@/components/customer/customer-status";

interface StatusPageProps {
  params: Promise<{
    accessKey: string;
  }>;
}

export async function generateMetadata({
  params,
}: StatusPageProps): Promise<Metadata> {
  return {
    title: "Rental Status - PlayStation Rental System",
    description: "Check your PlayStation rental status",
  };
}

export default async function StatusPage({ params }: StatusPageProps) {
  const resolvedParams = await params; // Memastikan params di-resolve sebelum dikirim

  return (
    <main className="min-h-screen bg-background">
      <CustomerStatus accessKey={resolvedParams.accessKey} />
    </main>
  );
}
