// How code, visitors and media move through the homelab. Plain HTML instead of an SVG so the
// labels stay readable on a phone: each lane is a row on wide screens and a column on narrow ones.

type Node = { label: string; note: string };
type Lane = { name: string; nodes: Node[] };

const lanes: Lane[] = [
  {
    name: "deploys",
    nodes: [
      { label: "git push", note: "to main" },
      { label: "github actions", note: "builds the docker image" },
      { label: "ghcr.io", note: ":latest and a tag per commit" },
      { label: "portainer", note: "pulls, redeploys, prunes" },
    ],
  },
  {
    name: "visitors",
    nodes: [
      { label: "browser", note: "jkzhou.ca" },
      { label: "cloudflare", note: "dns" },
      { label: "nginx proxy manager", note: "ssl, routes by domain" },
      { label: "docker", note: "this site, opento" },
    ],
  },
  {
    name: "media",
    nodes: [
      { label: "samba share", note: "on the home server" },
      { label: "cloudflare r2", note: "storage bucket" },
      { label: "assets.jkzhou.ca", note: "photos and videos" },
    ],
  },
];

// The server is the one machine in the house; everything else is out on the internet
const atHome = new Set(["portainer", "nginx proxy manager", "docker", "samba share"]);

export default function HomelabDiagram({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // Card version: labels only, sized to fit the 3:2 card
    return (
      <div className="flex h-full w-full flex-col justify-center gap-4 px-5 py-6 sm:gap-5 sm:px-8" aria-hidden="true">
        {lanes.map((lane) => (
          <div key={lane.name}>
            <p className="text-[10px] font-medium tracking-wide text-neutral-400 uppercase">{lane.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm">
              {lane.nodes.map((node, i) => (
                <span key={node.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-neutral-400">→</span>}
                  <span
                    className={`rounded-md border px-2 py-0.5 ${
                      atHome.has(node.label)
                        ? "border-neutral-800 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-700"
                    }`}
                  >
                    {node.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <figure className="w-full">
      <div className="space-y-8">
        {lanes.map((lane) => (
          <section key={lane.name} aria-label={lane.name}>
            <h3 className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{lane.name}</h3>
            <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
              {lane.nodes.map((node, i) => (
                <li key={node.label} className="flex flex-col sm:flex-1 sm:flex-row sm:items-center">
                  {i > 0 && (
                    <span
                      className="self-center px-2 pb-2 text-neutral-400 sm:pb-0 sm:px-1.5"
                      aria-hidden="true"
                    >
                      <span className="sm:hidden">↓</span>
                      <span className="hidden sm:inline">→</span>
                    </span>
                  )}
                  <div
                    className={`flex-1 rounded-lg border px-3 py-2.5 ${
                      atHome.has(node.label)
                        ? "border-neutral-800 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-800"
                    }`}
                  >
                    <p className="text-sm font-medium">{node.label}</p>
                    <p
                      className={`mt-0.5 text-xs leading-snug ${
                        atHome.has(node.label) ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {node.note}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <figcaption className="mt-6 flex items-center gap-2 text-sm text-neutral-500">
        <span className="inline-block size-3 rounded-sm bg-neutral-900" aria-hidden="true" />
        runs on the server at home. everything else is a cloud service.
      </figcaption>
    </figure>
  );
}
