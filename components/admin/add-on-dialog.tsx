"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MenuItem } from "@/lib/types";
import { Minus, Plus, ShoppingCart, Utensils } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddOnDialogProps {
  rentalId: string;
  tvName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export function AddOnDialog({
  rentalId,
  tvName,
  open,
  onOpenChange,
  onSuccess,
}: AddOnDialogProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMenu();
      setCart({});
    }
  }, [open]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/menu", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setMenuItems(json.data.filter((i: MenuItem) => i.isAvailable));
      }
    } catch (error) {
      toast.error("Gagal memuat menu");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[item._id!.toString()] || 0;
      const newQty = Math.max(0, currentQty + delta);

      const newCart = { ...prev };
      if (newQty === 0) {
        delete newCart[item._id!.toString()];
      } else {
        newCart[item._id!.toString()] = newQty;
      }
      return newCart;
    });
  };

  const calculateTotal = () => {
    let total = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = menuItems.find((m) => m._id?.toString() === id);
      if (item) {
        total += item.price * qty;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    const items = Object.entries(cart).map(([id, qty]) => ({
      menuItemId: id,
      quantity: qty,
    }));

    if (!rentalId) {
      toast.error("Rental ID tidak valid. Mohon refresh halaman.");
      return;
    }

    if (items.length === 0) {
      toast.error("Pilih menu terlebih dahulu");
      return;
    }

    try {
      console.log("Submitting Add-on for Rental ID:", rentalId);
      setSubmitting(true);
      const res = await fetch("/api/rental/addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalId,
          items,
        }),
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Pesanan berhasil ditambahkan");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(json.error || "Gagal menambahkan pesanan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ["food", "drink", "snack", "other"];

  const renderMenuGrid = (categoryFilter: string) => {
    const items = menuItems.filter(
      (m) => categoryFilter === "all" || m.category === categoryFilter,
    );

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Tidak ada menu di kategori ini.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => {
          const qty = cart[item._id!.toString()] || 0;
          return (
            <div
              key={item._id?.toString()}
              className={`p-3 border rounded-lg flex justify-between items-center transition-colors ${qty > 0 ? "border-accent bg-accent/5" : "border-border"}`}
            >
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {qty > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full bg-secondary"
                    onClick={() => updateQuantity(item, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
                {qty > 0 && (
                  <span className="text-sm w-4 text-center">{qty}</span>
                )}
                <Button
                  size="icon"
                  variant={qty > 0 ? "default" : "outline"}
                  className="h-6 w-6 rounded-full"
                  onClick={() => updateQuantity(item, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-accent" />
            Tambah Pesanan - {tvName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Menu Area */}
          <div className="flex-1 flex flex-col border-r border-border">
            <Tabs
              defaultValue="food"
              className="flex flex-col h-full bg-background"
              orientation="vertical"
            >
              <div className="px-6 py-2 border-b border-border bg-background z-10">
                <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-2 mb-2 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="capitalize data-[state=active]:bg-accent data-[state=active]:text-accent-foreground border border-input px-4 py-1.5 h-auto rounded-full text-xs"
                    >
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="flex-1 p-6 pt-2">
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-0">
                    {renderMenuGrid(cat)}
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </div>

          {/* Cart Summary Side */}
          <div className="w-80 flex flex-col bg-secondary/30 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Ringkasan Pesanan
            </h3>

            <ScrollArea className="flex-1 -mr-4 pr-4">
              {Object.keys(cart).length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  Belum ada item dipilih
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = menuItems.find(
                      (m) => m._id?.toString() === id,
                    );
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-start text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {qty} x Rp {item.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <p className="font-medium">
                          Rp {(qty * item.price).toLocaleString("id-ID")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="pt-4 border-t border-border mt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-accent">
                  Rp {calculateTotal().toLocaleString("id-ID")}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={Object.keys(cart).length === 0 || submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan Pesanan"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
