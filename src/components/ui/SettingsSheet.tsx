"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/database";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (data: { name: string; emoji: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function SettingsSheet({
  open,
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
}: SettingsSheetProps) {
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await onAddCategory({ name: newName.trim(), emoji: newEmoji.trim() });
      setNewName("");
      setNewEmoji("");
    } catch {
      // Toast is shown by parent handler
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteCategory(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      {/* Categories Section */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Categories
        </h3>

        {/* Category list */}
        <div className="space-y-1">
          {categories.length === 0 && (
            <p className="text-sm text-text-tertiary py-3">
              No categories yet. Add one below.
            </p>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-xl bg-bg-secondary px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                {cat.emoji && (
                  <span className="text-lg">{cat.emoji}</span>
                )}
                <span className="text-sm font-medium text-text-primary">
                  {cat.name}
                </span>
                {cat.is_default && (
                  <span className="text-[11px] text-text-tertiary">
                    default
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  deletingId === cat.id
                    ? "opacity-40"
                    : "text-text-tertiary active:bg-bg-tertiary hover:text-expense"
                )}
                aria-label={`Delete ${cat.name}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add category form */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="😀"
            maxLength={10}
            className="w-12 rounded-xl border border-border bg-bg-secondary px-2 py-2.5 text-center text-lg outline-none placeholder:text-text-tertiary focus:border-accent transition-colors"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || isAdding}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150",
              newName.trim() && !isAdding
                ? "bg-btn-primary-bg text-btn-primary-text active:bg-btn-primary-hover"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            )}
          >
            {isAdding ? "..." : "Add"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
