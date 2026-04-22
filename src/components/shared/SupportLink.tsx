import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SupportLinkProps {
  prefix?: string;
  className?: string;
}

/**
 * Renders a standard "Having trouble? Contact support@brandsiq.app" line
 * with a mailto link. Used on error pages and the 404 page.
 *
 * @param prefix - Leading text shown before the mailto link. Defaults to
 *   "Having trouble?". Override for non-error contexts, e.g. "Questions?".
 * @param className - Additional Tailwind classes for the wrapper paragraph,
 *   e.g. "mt-4 text-center" for centered placement under a button.
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
