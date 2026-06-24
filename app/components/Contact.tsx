"use client";

import { useState, useRef, type FormEvent } from "react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type Status = "idle" | "submitting" | "sent" | "error";

const FIELD_CLASS =
  "h-12 rounded-xl border-foreground/10 bg-background/40 px-4 text-base placeholder:text-foreground/35";

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !email || !message) {
      setError("fill in your name, email, and a message before sending.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("that email doesn't look right — double check it.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: String(data.get("subject") || ""),
          message,
        }),
      });

      if (!res.ok) throw new Error("request failed");

      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
      setError("something went wrong on my end — try again, or just email me directly at hello@jkzhou.ca.");
    }
  }

  const sent = status === "sent";
  const submitting = status === "submitting";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-28">
      <section className="grid w-full grid-cols-1 gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.45em] text-foreground/35">
            contact
          </p>

          <h1 className="text-6xl font-bold leading-[0.92] tracking-tight md:text-8xl">
            let's make
            <br />
            something
            <br />
            cool.
          </h1>

          <p className="mt-8 max-w-md text-lg leading-relaxed text-foreground/50">
            got an idea, shoot, project, or collab? send a message and I will
            get back to you as soon as I can
          </p>

          <div className="mt-9 flex flex-wrap gap-3 text-sm text-foreground/45">
            <a
              href="mailto:hello@jkzhou.ca"
              className="group flex items-center gap-1.5 rounded-full border border-foreground/10 px-4 py-2 transition hover:border-foreground/25 hover:text-foreground"
            >
              hello@jkzhou.ca
              
            </a>

            <a
              href="https://instagram.com/jkz.mov"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-1.5 rounded-full border border-foreground/10 px-4 py-2 transition hover:border-foreground/25 hover:text-foreground"
            >
              @jkz.mov
              
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-foreground/10 bg-foreground/[0.025] p-6 md:p-8">
          {sent ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5">
                <Check className="h-5 w-5" />
              </div>
              <p className="text-xl font-medium">message sent.</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground/50">
                thanks for reaching out — i'll get back to you soon.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-7 text-sm text-foreground/45 underline-offset-4 transition hover:text-foreground hover:underline"
              >
                send another message
              </button>
            </div>
          ) : (
            <form ref={formRef} className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="sr-only">
                    name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="name"
                    autoComplete="name"
                    disabled={submitting}
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="sr-only">
                    email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email"
                    autoComplete="email"
                    disabled={submitting}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="sr-only">
                  subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="subject"
                  disabled={submitting}
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label htmlFor="message" className="sr-only">
                  message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="message"
                  disabled={submitting}
                  className="min-h-[220px] resize-none rounded-xl border-foreground/10 bg-background/40 p-4 text-base placeholder:text-foreground/35"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-500/90">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-xl text-base font-medium"
              >
                {submitting ? (
                  <>
                    sending
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    send message
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}