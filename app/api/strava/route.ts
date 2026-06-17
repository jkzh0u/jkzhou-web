export async function GET() {
  try {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: process.env.STRAVA_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });

    const token = await refreshRes.json();

    if (!token.access_token) {
      return Response.json(
        { error: "Failed to refresh token", details: token },
        { status: 400 }
      );
    }

    const activitiesRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );

    const activities = await activitiesRes.json();

    if (!Array.isArray(activities)) {
      return Response.json(
        { error: "Strava did not return activities", details: activities },
        { status: 400 }
      );
    }

    const formatted = activities.map((a: any) => {
      const paceSeconds =
        a.type === "Run" && a.average_speed > 0
          ? 1000 / a.average_speed
          : null;

      const pace =
        paceSeconds !== null
          ? `${Math.floor(paceSeconds / 60)}:${String(
              Math.round(paceSeconds % 60)
            ).padStart(2, "0")}`
          : null;

      return {
        id: a.id,
        name: a.name,
        description: a.description || null,
        type: a.type,
        sport_type: a.sport_type,
        start_date: a.start_date,
        distance_km: Number((a.distance / 1000).toFixed(2)),
        moving_time_seconds: a.moving_time,
        moving_time_min: Math.round(a.moving_time / 60),
        elevation_m: Math.round(a.total_elevation_gain || 0),
        speed_kmh: Number(((a.average_speed || 0) * 3.6).toFixed(1)),
        pace,
        avg_hr: a.average_heartrate || null,
        kudos: a.kudos_count || 0,
        calories: a.calories || null,
        watts: a.average_watts || null,
        cadence: a.average_cadence || null,
        map: a.map?.summary_polyline || null,
      };
    });

    function getMonday(date: Date) {
      const d = new Date(date);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const weeklyMap = new Map<
      string,
      {
        distance_km: number;
        runs: number;
      }
    >();

    for (const a of activities) {
      const monday = getMonday(new Date(a.start_date));
      const key = monday.toISOString().split("T")[0];

      const current = weeklyMap.get(key) || {
        distance_km: 0,
        runs: 0,
      };

      current.distance_km += a.distance / 1000;

      if (a.type === "Run") {
        current.runs += 1;
      }

      weeklyMap.set(key, current);
    }

    const keys = Array.from(weeklyMap.keys()).sort();

    if (keys.length === 0) {
      return Response.json({
        recent: formatted.slice(0, 10),
        weekly: [],
      });
    }

    const start = new Date(keys[0]);
    const end = new Date(keys[keys.length - 1]);

    const weekly = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const key = d.toISOString().split("T")[0];

      const data = weeklyMap.get(key) || {
        distance_km: 0,
        runs: 0,
      };

      weekly.push({
        week: key,
        distance_km: Number(data.distance_km.toFixed(1)),
        runs: data.runs,
      });
    }

    const recentWeekly = weekly.slice(-12);

    return Response.json({
      recent: formatted.slice(0, 10),
      weekly: recentWeekly,
    });
  } catch (err: any) {
    console.error("Strava API route failed:", err);

    return Response.json(
      {
        error: err.message || "Unknown server error",
      },
      {
        status: 500,
      }
    );
  }
}