"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { TVIPFormDialog } from "./tv-ip-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TVUnit } from "@/lib/types";
import { getTVsAction, deleteTVAction } from "@/lib/actions/tv";

export function IPManagementList() {
  const [tvs, setTvs] = useState<TVUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTV, setSelectedTV] = useState<TVUnit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tvToDelete, setTvToDelete] = useState<TVUnit | null>(null);

  useEffect(() => {
    loadTVs();
  }, []);

  const loadTVs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getTVsAction();

      if (result.error) {
        throw new Error(result.error);
      }

      setTvs((result.tvs as unknown as TVUnit[]) || []);
    } catch (err: any) {
      setError(err.message || "Failed to load TV list");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedTV(null);
    setOpenDialog(true);
  };

  const handleEdit = (tv: TVUnit) => {
    setSelectedTV(tv);
    setOpenDialog(true);
  };

  const handleDeleteClick = (tv: TVUnit) => {
    setTvToDelete(tv);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tvToDelete) return;

    try {
      const result = await deleteTVAction(tvToDelete._id!.toString());

      if (result.error) {
        setError(result.error);
        return;
      }

      setTvs(tvs.filter((tv) => tv._id !== tvToDelete._id));
      setDeleteDialogOpen(false);
      setTvToDelete(null);
    } catch (err) {
      setError("Failed to delete TV");
      console.error(err);
    }
  };

  const handleDialogSuccess = () => {
    loadTVs();
    setOpenDialog(false);
    setSelectedTV(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-500";
      case "in-use":
        return "text-blue-500";
      case "offline":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "available" || status === "offline") {
      return status === "available" ? CheckCircle2 : AlertCircle;
    }
    return CheckCircle2;
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>TV IP Management</CardTitle>
            <CardDescription>
              Manage static IP addresses for your PlayStation units
            </CardDescription>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New TV
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading TV list...
            </div>
          ) : tvs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No TVs configured yet
              </p>
              <Button onClick={handleAddNew} variant="outline">
                Add First TV
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-semibold">TV Name</TableHead>
                    <TableHead className="font-semibold">IP Address</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tvs.map((tv) => {
                    const StatusIcon = getStatusIcon(tv.status);
                    return (
                      <TableRow
                        key={tv._id?.toString()}
                        className="hover:bg-secondary/30"
                      >
                        <TableCell className="font-medium">{tv.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {tv.ipAddress}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`w-4 h-4 ${getStatusColor(tv.status)}`}
                            />
                            <span className="capitalize text-sm">
                              {tv.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tv)}
                            className="gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(tv)}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TVIPFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        tv={selectedTV}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TV Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{tvToDelete?.name}</strong> ({tvToDelete?.ipAddress})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
