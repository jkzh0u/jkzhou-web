import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ContactEmailProps {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export default function ContactEmail({
  name,
  email,
  subject,
  message,
}: ContactEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`New message from ${name}${subject ? `: ${subject}` : ""}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>new message</Heading>

          <Section style={section}>
            <Text style={label}>from</Text>
            <Text style={value}>
              {name} ({email})
            </Text>
          </Section>

          {subject && (
            <Section style={section}>
              <Text style={label}>subject</Text>
              <Text style={value}>{subject}</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={section}>
            <Text style={label}>message</Text>
            <Text style={messageText}>{message}</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>sent from the contact form on your site</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px",
  maxWidth: "480px",
  borderRadius: "16px",
};

const heading = {
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.3em",
  textTransform: "uppercase" as const,
  color: "#999999",
  margin: "0 0 28px",
};

const section = {
  margin: "0 0 16px",
};

const label = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "#999999",
  margin: "0 0 4px",
};

const value = {
  fontSize: "16px",
  color: "#111111",
  margin: 0,
};

const messageText = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#111111",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};

const hr = {
  borderColor: "#eeeeee",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#aaaaaa",
  margin: 0,
};