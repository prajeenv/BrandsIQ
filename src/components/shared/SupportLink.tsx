import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SupportLinkProps {
  prefix?: string;
  className?: string;
}

/**
 * Renders a standard "Having trouble? Contact support@brandsiq.app" line
 * with a mailto link. Used on error pages and the 404 page.
 */
export function SupportLink({
  prefix = "Having trouble?",
  className,
}: SupportLinkProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {prefix}{" "}
      <a
        href={SUPPORT_MAILTO}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        Contact {SUPPORT_EMAIL}
      </a>
    </p>
  );
}
