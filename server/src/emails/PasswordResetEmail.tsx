import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { BrandButton, EmailLayout } from './Layout';
import { email } from './theme';
import { PasswordResetEmailData } from './types';

// Password reset template. Ready to send via EmailService.sendPasswordReset once
// a forgot-password flow issues a reset token (see RESEND.md — the flow itself is
// a separate auth change; the branded template lives here so wiring it is small).
export function PasswordResetEmail({ data }: { data: PasswordResetEmailData }): React.ReactElement {
  return (
    <EmailLayout preview="Reset your Siddhatva password">
      <Heading as="h2" style={h2}>
        Reset your password
      </Heading>
      <Text style={lead}>
        {data.name.split(' ')[0]}, we received a request to reset the password for your Siddhatva
        account. Choose a new password using the button below.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0' }}>
        <BrandButton href={data.resetUrl}>Reset password</BrandButton>
      </Section>

      <Text style={muted}>
        This link expires in {data.expiresInMinutes} minutes. If you didn&apos;t request a password
        reset, you can safely ignore this email — your password won&apos;t change.
      </Text>
    </EmailLayout>
  );
}

const h2: React.CSSProperties = { color: email.color.primary, fontSize: '22px', fontWeight: 600, margin: '0 0 8px' };
const lead: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' };
const muted: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '12px', lineHeight: 1.6, margin: 0, opacity: 0.85 };
