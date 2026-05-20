"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Personalization section of the V2 brand voice form (iter 6).
 *
 * Spec §6: two toggles that encode response-policy decisions ("what we
 * acknowledge") that are structurally different from voice decisions
 * ("how we sound"):
 *
 *   §6.1 Acknowledge staff named in the review
 *   §6.2 Acknowledge special occasions
 *
 * Both default ON — most hospitality brands want this behaviour. The
 * iter-4 prompt builder injects the corresponding conditional fragment
 * only when the toggle is true.
 */
interface PersonalizationSectionProps {
  acknowledgeNamedStaff: boolean;
  acknowledgeOccasions: boolean;
  onAcknowledgeNamedStaffChange: (_value: boolean) => void;
  onAcknowledgeOccasionsChange: (_value: boolean) => void;
  disabled?: boolean;
}

export function PersonalizationSection({
  acknowledgeNamedStaff,
  acknowledgeOccasions,
  onAcknowledgeNamedStaffChange,
  onAcknowledgeOccasionsChange,
  disabled,
}: PersonalizationSectionProps) {
  return (
    <div className="space-y-4">
      <ToggleRow
        id="acknowledge-named-staff"
        label="Acknowledge staff named in the review"
        description="When a reviewer mentions a staff member by name, our AI will thank them specifically and promise to share the feedback with that person."
        checked={acknowledgeNamedStaff}
        onCheckedChange={onAcknowledgeNamedStaffChange}
        disabled={disabled}
      />

      <ToggleRow
        id="acknowledge-occasions"
        label="Acknowledge special occasions"
        description="When a reviewer mentions a birthday, anniversary, first visit, or other special occasion, our AI will acknowledge it specifically."
        checked={acknowledgeOccasions}
        onCheckedChange={onAcknowledgeOccasionsChange}
        disabled={disabled}
      />
    </div>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (_value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ id, label, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-card p-4">
      <div className="flex-1 space-y-1">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
