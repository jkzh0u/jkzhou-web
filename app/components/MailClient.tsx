"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface InboxMessage {
  uid: number;
  subject: string;
  from: string;
  fromAddress: string;
  date: string;
  unread: boolean;
}

interface MessageDetail extends InboxMessage {
  html: string | null;
  text: string | null;
  messageId: string | null;
  references: string[];
  to: string;
}

export default function MailClient() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/mail/inbox?limit=30")
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoadingList(false));
  }, []);

  async function openMessage(uid: number) {
    setLoadingDetail(true);
    setSelected(null);
    setSent(false);
    setReplyText("");
    try {
      const res = await fetch(`/api/mail/message/${uid}`);
      const data = await res.json();
      setSelected(data);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/mail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selected.fromAddress,
          subject: selected.subject,
          bodyHtml: `<p>${replyText.replace(/\n/g, "<br/>")}</p>`,
          inReplyTo: selected.messageId,
          references: [...selected.references, selected.messageId].filter(
            Boolean
          ),
        }),
      });
      if (!res.ok) throw new Error("failed");
      setSent(true);
      setReplyText("");
    } catch {
      alert("failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid h-screen w-full max-w-5xl grid-cols-1 md:grid-cols-[320px_1fr]">
      {/* message list */}
      <div
        className={`border-r border-foreground/10 overflow-y-auto ${
          selected ? "hidden md:block" : ""
        }`}
      >
        {loadingList ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : messages.length === 0 ? (
          <p className="p-6 text-sm text-foreground/40">no messages</p>
        ) : (
          messages.map((m) => (
            <button
              key={m.uid}
              onClick={() => openMessage(m.uid)}
              className="block w-full border-b border-foreground/5 px-5 py-4 text-left transition hover:bg-foreground/[0.03]"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate text-sm ${
                    m.unread ? "font-semibold" : "text-foreground/70"
                  }`}
                >
                  {m.from}
                </span>
                <span className="shrink-0 text-xs text-foreground/35">
                  {m.date ? new Date(m.date).toLocaleDateString() : ""}
                </span>
              </div>
              <p
                className={`mt-1 truncate text-sm ${
                  m.unread ? "text-foreground" : "text-foreground/50"
                }`}
              >
                {m.subject}
              </p>
            </button>
          ))
        )}
      </div>

      {/* message detail + reply */}
      <div className="flex flex-col overflow-y-auto">
        {!selected && !loadingDetail && (
          <div className="flex h-full items-center justify-center text-sm text-foreground/35">
            select a message
          </div>
        )}

        {loadingDetail && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        )}

        {selected && (
          <div className="flex flex-1 flex-col">
            <div className="border-b border-foreground/10 px-6 py-5">
              <button
                onClick={() => setSelected(null)}
                className="mb-3 flex items-center gap-1 text-sm text-foreground/45 md:hidden"
              >
                <ChevronLeft className="h-4 w-4" /> back
              </button>
              <h2 className="text-lg font-semibold">{selected.subject}</h2>
              <p className="mt-1 text-sm text-foreground/45">
                {selected.from} &lt;{selected.fromAddress}&gt;
              </p>
            </div>

            <div className="flex-1 px-6 py-5">
              {selected.html ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selected.html }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.text}
                </p>
              )}
            </div>

            <div className="border-t border-foreground/10 px-6 py-5">
              {sent ? (
                <p className="text-sm text-foreground/50">reply sent.</p>
              ) : (
                <>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="write a reply..."
                    className="min-h-[120px] resize-none rounded-xl border-foreground/10 bg-background/40 p-3 text-sm"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="mt-3 rounded-xl"
                  >
                    {sending ? (
                      <>
                        sending
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        send reply
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}