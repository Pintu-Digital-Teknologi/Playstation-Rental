"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

interface TVUnit {
  _id: string;
  name: string;
  status: "available" | "in-use" | "offline";
  accessKey?: string;
}

export default function StatusPage() {
  const [tvs, setTvs] = useState<TVUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTVs();
    const interval = setInterval(fetchTVs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTVs = async () => {
    try {
      const response = await fetch("/api/tv/public-status");
      if (response.ok) {
        const data = await response.json();
        setTvs(data.tvs);
      }
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "in-use":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "offline":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };
  console.log("Status Page", tvs);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              TV Status Board
            </h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading status...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tvs.map((tv) => {
              const CardContentWrapper = ({
                children,
              }: {
                children: React.ReactNode;
              }) => (
                <Card className="border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors h-full">
                  {children}
                </Card>
              );

              const content = (
                <CardContentWrapper>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-medium">
                        {tv.name}
                      </CardTitle>
                      <Badge className={getStatusColor(tv.status)}>
                        {tv.status === "in-use"
                          ? "In Use"
                          : tv.status === "available"
                            ? "Available"
                            : "Offline"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={
                          tv.status === "available"
                            ? "text-green-400"
                            : "text-foreground"
                        }
                      >
                        {tv.status === "available"
                          ? "Ready to Rent"
                          : tv.status === "in-use"
                            ? "Occupied"
                            : "Unavailable"}
                      </span>
                    </div>
                  </CardContent>
                </CardContentWrapper>
              );

              return tv.status === "in-use" && tv.accessKey ? (
                <Link
                  href={`/status/${tv.accessKey}`}
                  key={tv._id}
                  className="block h-full"
                >
                  {content}
                </Link>
              ) : (
                <div key={tv._id} className="h-full cursor-default">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
