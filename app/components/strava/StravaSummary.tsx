import { Card, CardContent } from "../ui/card";

export default function StravaSummary({ activities }: { activities: any[] }) {
  const totalKm = activities.reduce((sum, a) => sum + a.distance_km, 0);
  const totalTime = activities.reduce((sum, a) => sum + a.moving_time_min, 0);
  const totalElevation = activities.reduce((sum, a) => sum + a.elevation_m, 0);

  const avgKm = totalKm / activities.length || 0;

  return (
    <Card>
      <CardContent className="space-y-5 p-6 text-lg leading-relaxed">
        <p>
          Since your recent Strava sync, you’ve logged{" "}
          <Badge>{activities.length}</Badge> activities.
        </p>

        <p>
          In that time, you’ve covered <Badge>{totalKm.toFixed(1)} km</Badge>{" "}
          and climbed <Badge>{Math.round(totalElevation)} m</Badge> of
          elevation.
        </p>

        <p>
          That works out to an average of{" "}
          <Badge>{avgKm.toFixed(1)} km</Badge> per activity, with{" "}
          <Badge>{Math.round(totalTime)} min</Badge> of moving time.
        </p>
      </CardContent>
    </Card>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">
      {children}
    </span>
  );
}