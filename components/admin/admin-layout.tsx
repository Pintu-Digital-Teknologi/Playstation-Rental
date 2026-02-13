"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LogOut,
  Monitor,
  DollarSign,
  BarChart3,
  Settings,
  Wifi,
  Clock,
  Home,
  Utensils,
  User,
  Maximize,
  Key,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsPopover } from "./notifications-popover";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  user: {
    _id: string;
    username: string;
    fullName: string;
    role: "admin" | "operator";
  };
}

import { UserProvider } from "./user-context";

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [activeShiftRole, setActiveShiftRole] = useState<string | null>(null);
  const userRole = user.role; // Still used for initial state or fallback

  useEffect(() => {
    checkActiveShift();
  }, [pathname]);

  const checkActiveShift = async () => {
    // Skip checks for public/home if appropriate
    if (pathname === "/") {
      setIsChecking(false);
      return;
    }

    try {
      const res = await fetch("/api/shift/active");
      if (res.ok) {
        const data = await res.json();

        if (data) {
          setHasActiveShift(true);
          const currentRole = data.operatorRole || "operator"; // Default to operator if missing
          setActiveShiftRole(currentRole);

          // Rule: If shift is active, PERMISSIONS ARE BASED ON ACTIVE SHIFT OPERATOR ROLE
          const restrictedRoutes = [
            "/admin/ip-management",
            "/admin/makanan",
            "/admin/users",
          ];
          const isRestricted = restrictedRoutes.some((route) =>
            pathname.startsWith(route),
          );

          if (isRestricted && currentRole !== "admin") {
            toast({
              title: "Restricted Access",
              description: `This page is restricted for ${currentRole}s during an active shift.`,
              variant: "destructive",
            });
            router.push("/admin/dashboard");
            setIsChecking(false);
            return;
          }
        } else {
          setHasActiveShift(false);
          setActiveShiftRole(null);

          // No active shift -> Redirect to Shift page to start one
          // Exception: We are already on shift page
          if (pathname !== "/admin/shift") {
            toast({
              title: "Shift Required",
              description: "You must start a shift to access this page.",
              variant: "destructive",
            });
            router.push("/admin/shift");
            setIsChecking(false);
            return;
          }
        }
      } else {
        console.error("Failed to check shift status");
      }
    } catch (error) {
      console.error("Error checking auth/shift:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const menuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Monitor },
    { href: "/admin/ip-management", label: "IP Management", icon: Wifi },
    { href: "/admin/rentals", label: "Rentals", icon: BarChart3 },
    { href: "/admin/makanan", label: "Menu / Add-ons", icon: Utensils },
    { href: "/admin/payments", label: "Payments", icon: DollarSign },
    { href: "/admin/settings/licenses", label: "Licenses", icon: Key },
    { href: "/admin/shift", label: "Manajemen Kasir", icon: Clock },
    { href: "/admin/users", label: "User Manajemen", icon: User },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/status", label: "Status", icon: Clock },
    { href: "/", label: "Home", icon: Home },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-accent">PS Rental</h1>
          <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
        </div>
        <div className="hidden md:block">
          <NotificationsPopover />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // Determine effective role: Active Shift Operator takes precedence
          // If no shift active, we fall back to userRole, but user is likely restricted to /shift anyway
          const effectiveRole = activeShiftRole || userRole;

          // Hide restricted items if not admin
          const restricted = [
            "/admin/ip-management",
            "/admin/makanan",
            "/admin/users",
          ];
          if (effectiveRole !== "admin" && restricted.includes(item.href)) {
            return null;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-md text-foreground hover:bg-secondary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent"
          onClick={toggleFullscreen}
        >
          <Maximize className="w-4 h-4" />
          Full Screen
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Pastikan w-64 dan z-index aman */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:border-border md:bg-card z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 border-b border-border bg-background z-30">
        <div className="flex items-center gap-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-accent">PS Rental</h1>
        </div>
        <NotificationsPopover />
      </div>

      {/* Main Content - Berikan margin-left (ml-64) agar tidak tertutup sidebar fixed */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <UserProvider user={user}>
          {isChecking && pathname !== "/admin/shift" && pathname !== "/" ? (
            <div className="flex h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            children
          )}
        </UserProvider>
      </main>
    </div>
  );
}
