"use client";

import dynamic from "next/dynamic";
import { X, Route, Clock, Gauge, Mountain } from "lucide-react";
import InfoCard from "./InfoCard";

const ActivityMap = dynamic(() => import("./ActivityMap"), {
  ssr: false,
});

function formatTime(minutes: number) {
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActivityDialog({
  selected,
  onClose,
}: {
  selected: any;
  onClose: () => void;
}) {
  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-x-[8vw] top-[4vh] max-h-[92vh] overflow-y-auto rounded-2xl border bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full border bg-background p-2 hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="border-b px-7 py-6">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight">
            {selected.name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(selected.start_date).toLocaleDateString()} · Strava activity details
          </p>

          {selected.description && (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
              {selected.description}
            </p>
          )}
        </header>

        <div className="space-y-6 px-7 py-6">
          <div className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={Route} label="Distance" value={selected.distance_km} unit="km" />
            <InfoCard icon={Clock} label="Moving Time" value={formatTime(selected.moving_time_min)} />
            <InfoCard
              icon={Gauge}
              label={selected.type === "Run" ? "Pace" : "Avg Speed"}
              value={selected.type === "Run" ? selected.pace ?? "—" : selected.speed_kmh}
              unit={selected.type === "Run" ? "/km" : "km/h"}
            />
            <InfoCard icon={Mountain} label="Elevation" value={selected.elevation_m} unit="m" />
          </div>

          <ActivityMap polyline={selected.map} />
        </div>
      </div>
    </div>
  );
}