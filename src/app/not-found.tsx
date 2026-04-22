import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SupportLink } from "@/components/shared/SupportLink";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold">Page not found</h2>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
      <SupportLink className="mt-2" />
    </div>
  );
}
