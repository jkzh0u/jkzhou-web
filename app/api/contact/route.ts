import { Resend } from "resend";
import { NextResponse } from "next/server";
import ContactEmail from "../../components/ContactEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// Set this to an address on a domain you've verified in Resend.
// "onboarding@resend.dev" only works for sending to your own account email
// while testing — replace it once your domain is verified.
const FROM_ADDRESS = "Portfolio <hello@jkzhou.ca>";
const TO_ADDRESS = "hello@jkzhou.ca";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !message.trim()
    ) {
      return NextResponse.json(
        { error: "name, email, and message are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "invalid email address" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: TO_ADDRESS,
      replyTo: email,
      subject: subject?.trim()
        ? `Contact form: ${subject.trim()}`
        : `New message from ${name.trim()}`,
      react: ContactEmail({
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim(),
        message: message.trim(),
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: data?.id }, { status: 200 });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { error: "something went wrong" },
      { status: 500 }
    );
  }
}