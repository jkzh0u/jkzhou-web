import Sidebar from "../components/strava/Sidebar";
import StravaDashboard from "../components/strava/StravaDashboard";
import dynamic from "next/dynamic"


export default function StravaPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <Sidebar />
        

        <section className="flex-1">
          <StravaDashboard />
        </section>
      </div>
    </main>
  );
}