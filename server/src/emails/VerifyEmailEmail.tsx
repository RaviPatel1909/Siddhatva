import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { BrandButton, EmailLayout } from './Layout';
import { email } from './theme';
import { VerifyEmailData } from './types';

// Email-address verification template. Shares EmailLayout + theme tokens with
// the order and password-reset templates, so branding stays in one place.
export function VerifyEmailEmail({ data }: { data: VerifyEmailData }): React.ReactElement {
  return (
    <EmailLayout preview="Confirm your email address">
      <Heading as="h2" style={h2}>
        Confirm your email
      </Heading>
      <Text style={lead}>
        Welcome, {data.name.split(' ')[0]}. Please confirm this email address to activate your
        Siddhatva account.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0' }}>
        <BrandButton href={data.verifyUrl}>Confirm email address</BrandButton>
      </Section>

      <Text style={muted}>
        This link expires in {Math.round(data.expiresInMinutes / 60)} hours. If you didn&apos;t
        create a Siddhatva account, you can safely ignore this email — nothing will be activated.
      </Text>
    </EmailLayout>
  );
}

const h2: React.CSSProperties = { color: email.color.primary, fontSize: '22px', fontWeight: 600, margin: '0 0 8px' };
const lead: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' };
const muted: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '12px', lineHeight: 1.6, margin: 0, opacity: 0.85 };
