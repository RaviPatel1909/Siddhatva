import * as React from 'react';
import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { email } from './theme';

// Shared brand chrome for every transactional email — the "Luxe Minimalist"
// identity (cream page, bronze wordmark, Geist) carried into the inbox. Every
// template composes its content inside <EmailLayout>.
export interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Helvetica"
          webFont={{ url: email.geistWebFont, format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading as="h1" style={wordmark}>
              SIDDHATVA
            </Heading>
          </Section>
          <Section style={card}>{children}</Section>
          <Hr style={rule} />
          <Section style={footer}>
            <Text style={footerText}>
              Siddhatva · Crafted with care by our atelier
            </Text>
            <Text style={footerMuted}>
              You are receiving this email because you placed an order with Siddhatva.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable primitives so templates stay consistent (mirrors reusing shared UI
// components on the storefront).
export function BrandButton({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link href={href} style={button}>
      {children}
    </Link>
  );
}

const body: React.CSSProperties = {
  backgroundColor: email.color.background,
  fontFamily: email.font.family,
  margin: 0,
  padding: '24px 0',
};

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 16px',
};

const header: React.CSSProperties = {
  padding: '8px 0 16px',
  textAlign: 'center',
};

const wordmark: React.CSSProperties = {
  color: email.color.primary,
  fontSize: '22px',
  fontWeight: 600,
  letterSpacing: '0.28em',
  margin: 0,
};

const card: React.CSSProperties = {
  backgroundColor: email.color.surface,
  border: `1px solid ${email.color.outlineVariant}`,
  borderRadius: '8px',
  padding: '32px',
};

const rule: React.CSSProperties = {
  borderColor: email.color.outlineVariant,
  margin: '24px 0 12px',
};

const footer: React.CSSProperties = {
  textAlign: 'center',
  padding: '0 0 8px',
};

const footerText: React.CSSProperties = {
  color: email.color.onSurfaceVariant,
  fontSize: '13px',
  margin: '0 0 4px',
};

const footerMuted: React.CSSProperties = {
  color: email.color.onSurfaceVariant,
  fontSize: '11px',
  margin: 0,
  opacity: 0.75,
};

const button: React.CSSProperties = {
  backgroundColor: email.color.primary,
  color: email.color.onPrimary,
  display: 'inline-block',
  padding: '12px 28px',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
