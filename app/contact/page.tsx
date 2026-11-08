import type { Metadata } from "next";
import ContactSection from "../components/ContactSection";

export const metadata: Metadata = {
  title: "contact",
  description: "get in touch with jackson zhou for shoots, projects and collabs.",
};

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <ContactSection />
    </main>
  );
}
