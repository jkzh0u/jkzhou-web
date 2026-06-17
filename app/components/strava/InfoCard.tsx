import { Card, CardContent } from "../ui/card";
import type { LucideIcon } from "lucide-react";

export default function InfoCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="relative p-5">
        {Icon && (
          <div className="absolute right-4 top-4 rounded-md bg-orange-500/10 p-1.5 text-orange-500">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-3 text-3xl font-bold">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}