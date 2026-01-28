"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Clock } from "lucide-react";
import type { Status } from "@/app/api/status/route";

interface StatusFeedProps {
  statuses: Status[];
  primaryColor: string;
  isOwner?: boolean;
  onStatusDeleted?: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

export function StatusFeed({ statuses, primaryColor, isOwner, onStatusDeleted }: StatusFeedProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/status?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok && onStatusDeleted) {
        onStatusDeleted();
      }
    } catch (error) {
      console.error("Failed to delete status:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (statuses.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border/50">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No status updates yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {statuses.map((status) => (
        <Card key={status.id} className="border border-border/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div
                className="w-2 h-2 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground whitespace-pre-wrap break-words">
                  {status.content}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {status.mood && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {status.mood}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(status.createdAt)}
                  </span>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-muted-foreground hover:text-destructive ml-auto"
                      onClick={() => handleDelete(status.id)}
                      disabled={deletingId === status.id}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
