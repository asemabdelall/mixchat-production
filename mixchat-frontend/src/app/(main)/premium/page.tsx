import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";

export default function PremiumPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 pb-12 pt-4">
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <Card className="glass-panel space-y-4 border-white/10 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
          <Clock3 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          MixChat Plus is not available yet
        </h1>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
          Paid plans and checkout are still being prepared. MixChat will not ask
          for payment details until billing is connected and ready for use.
        </p>
      </Card>
    </div>
  );
}
