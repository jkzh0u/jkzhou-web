import type { Metadata } from "next";
import Contact from "../components/MailClient";
import MailClient from "../components/MailClient";

export const metadata: Metadata = {
  title: "jackson zhou - mail",
  description: "mail",
};

export default function Page() {
  return <MailClient />;
}