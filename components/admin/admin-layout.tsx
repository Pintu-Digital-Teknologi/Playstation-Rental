"use client";

import React from "react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Key,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsPopover } from "./notifications-popover";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Monitor },
    { href: "/admin/ip-management", label: "IP Management", icon: Wifi },
    { href: "/admin/rentals", label: "Rentals", icon: BarChart3 },
    { href: "/admin/makanan", label: "Menu / Add-ons", icon: Utensils }, // Added menu item
    { href: "/admin/payments", label: "Payments", icon: DollarSign },
    { href: "/admin/settings/licenses", label: "API Keys", icon: Key },
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

      <div className="p-4 border-t border-border">
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

  // Perbaiki bagian render di admin-layout.tsx
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
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">{children}</main>
    </div>
  );
}
