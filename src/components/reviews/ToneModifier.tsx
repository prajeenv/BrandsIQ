"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Briefcase, Smile, Heart } from "lucide-react";

type ToneOption = "professional" | "friendly" | "empathetic";

interface ToneModifierProps {
  onRegenerate: (_tone: ToneOption) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  currentTone?: string;
  creditsNeeded?: number;
}

const toneOptions: Array<{
  value: ToneOption;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "professional",
    label: "More Professional",
    description: "Business-like, courteous, and formal tone",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: "friendly",
    label: "More Friendly",
    description: "Warm, personable, and approachable tone",
    icon: <Smile className="h-4 w-4" />,
  },
  {
    value: "empathetic",
    label: "More Empathetic",
    description: "Understanding and compassionate tone",
    icon: <Heart className="h-4 w-4" />,
  },
];

export function ToneModifier({
  onRegenerate,
  isLoading = false,
  disabled = false,
  currentTone,
  creditsNeeded = 1.0,
}: ToneModifierProps) {
  const [open, setOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneOption>("professional");

  const handleRegenerate = async () => {
    await onRegenerate(selectedTone);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoading ? "Regenerating..." : "Regenerate"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Response</DialogTitle>
          <DialogDescription>
            Select a tone modifier to regenerate the response with a different style.
            {currentTone && currentTone !== "default" && (
              <span className="block mt-1">
                Current tone: <strong>{currentTone}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedTone}
            onValueChange={(value) => setSelectedTone(value as ToneOption)}
            className="space-y-3"
          >
            {toneOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                  selectedTone === option.value
                    ? "border-primary bg-accent/50"
                    : "border-border"
                }`}
                onClick={() => setSelectedTone(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 cursor-pointer font-medium"
                  >
                    {option.icon}
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-xs text-muted-foreground mr-auto">
            This will use {creditsNeeded} credit{creditsNeeded !== 1 ? "s" : ""}
          </p>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={isLoading}>
            {isLoading ? "Regenerating..." : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
