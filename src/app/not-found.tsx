import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flame, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center bg-asador-bg">
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-asador-surface border border-asador-border">
          <Flame className="h-8 w-8 text-asador-copper" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-asador-ember">
            404 &bull; Page Not Found
          </span>
          <h2 className="font-serif text-3xl font-bold text-asador-parchment">
            Lost in the Smoke
          </h2>
          <p className="text-sm text-asador-silver leading-relaxed">
            The page or table you are searching for does not exist or has been
            relocated.
          </p>
        </div>

        <div className="flex justify-center">
          <Link href="/">
            <Button variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Hearth
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
