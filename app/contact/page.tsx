import type { Metadata } from "next";
import Contact from "../components/Contact";

export const metadata: Metadata = {
  title: "jackson zhou - contact",
  description: "Contact Me",
};

export default function Page() {
  return (
    <main className="px-4 sm:px-8 lg:px-28">
      <Contact />
    </main>
  );
}