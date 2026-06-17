import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type ReplyEmailProps = {
  body: string;
};

export default function ReplyEmail({ body }: ReplyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reply from Jackson</Preview>

      <Body style={main}>
        <Container style={container}>
          <Section>
            {body.split("\n").map((line, index) => (
              <Text key={index} style={paragraph}>
                {line || "\u00A0"}
              </Text>
            ))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 20px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#111111",
  margin: "0 0 14px",
};