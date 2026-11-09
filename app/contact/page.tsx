import type { Metadata } from "next";
import ContactSection from "../components/ContactSection";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "contact",
  description: "get in touch with jackson zhou for shoots, projects and collabs.",
  path: "/contact",
});

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <ContactSection />
    </main>
  );
}
