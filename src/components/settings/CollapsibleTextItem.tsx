"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Pencil, Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface CollapsibleTextItemProps {
  value: string;
  onChange: (_value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  maxLength?: number;
  index: number;
  totalCount: number;
  placeholder?: string;
  /** Maximum lines to show when collapsed (default: 3) */
  maxCollapsedLines?: number;
  /** Label for the item type (e.g., "guideline", "sample") */
  itemLabel?: string;
}

export function CollapsibleTextItem({
  value,
  onChange,
  onRemove,
  disabled,
  maxLength = 200,
  index,
  totalCount,
  placeholder = "Enter text...",
  maxCollapsedLines = 3,
  itemLabel = "item",
}: CollapsibleTextItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate line height and check if content needs expansion
  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight) || 20;
      const maxHeight = lineHeight * maxCollapsedLines;
      const actualHeight = textRef.current.scrollHeight;
      setNeedsExpansion(actualHeight > maxHeight);
    }
  }, [value, maxCollapsedLines]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [isEditing, editValue.length]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleCancelEdit();
    }
    // Allow Ctrl+Enter or Cmd+Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const toggleExpand = () => {
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  // Calculate dynamic rows for textarea: min 3, max 10, based on content lines
  const calculateRows = (text: string): number => {
    const lineCount = text.split("\n").length;
    return Math.max(3, Math.min(10, lineCount));
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false);
    onRemove();
  };

  // Delete button component (just the button, dialog is separate)
  const DeleteButton = ({ size = "sm" }: { size?: "sm" | "md" }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className={cn(
        "text-muted-foreground hover:text-destructive",
        size === "sm" ? "h-6 w-6" : "h-7 w-7"
      )}
      title="Delete"
      onClick={handleDeleteClick}
    >
      <Trash2 className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
    </Button>
  );

  if (isEditing) {
    return (
      <>
        <Card className="p-3 border-primary/50 bg-accent/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary font-medium">
                Editing {itemLabel} {index + 1} of {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveEdit}
                  className="h-7 w-7"
                  title="Save (Ctrl+Enter)"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelEdit}
                  className="h-7 w-7"
                  title="Cancel (Escape)"
                >
                  <X className="h-4 w-4" />
                </Button>
                <DeleteButton size="md" />
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={calculateRows(editValue)}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ctrl+Enter to save • Escape to cancel</span>
              <span>{editValue.length} / {maxLength}</span>
            </div>
          </div>
        </Card>

        {/* Delete confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this {itemLabel}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "p-3 transition-all",
          !disabled && "cursor-pointer hover:bg-accent/50"
        )}
        onClick={needsExpansion ? toggleExpand : handleStartEdit}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {index + 1}/{totalCount}
              </span>
              <div className="flex items-center gap-1">
                {needsExpansion && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand();
                    }}
                    className="h-6 w-6"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  disabled={disabled}
                  className="h-6 w-6"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <DeleteButton size="sm" />
              </div>
            </div>
            <div
              ref={textRef}
              className={cn(
                "text-sm whitespace-pre-wrap break-words overflow-hidden transition-all",
                !isExpanded && needsExpansion && "line-clamp-3"
              )}
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: isExpanded ? "unset" : maxCollapsedLines,
              }}
            >
              {value}
            </div>
            {needsExpansion && !isExpanded && (
              <span className="text-xs text-muted-foreground mt-1 block">
                Click to expand...
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {itemLabel}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
