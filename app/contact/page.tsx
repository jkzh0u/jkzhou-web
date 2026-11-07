import type { Metadata } from "next";
import Contact from "../components/Contact";

export const metadata: Metadata = {
  title: "jackson zhou: contact",
  description: "get in touch with jackson zhou for shoots, projects and collabs.",
};

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Contact />
    </main>
  );
}
