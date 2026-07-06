import { env } from '../../env';
import { RenderedEmail } from '../../emails/render';
import { ResendEmailService } from './resend';
import { DevEmailService } from './dev';

// ============================================================================
// EmailService — one interface, two adapters (mirrors ImageStore / PaymentGateway).
// Resend when RESEND_API_KEY is set, else a dev fallback that logs the rendered
// email to the console and writes it to a local file. Activating real email is
// credentials-only, zero code change. The API key is never exposed to the browser.
// ============================================================================

export interface SendEmailInput {
  to: string;
  email: RenderedEmail; // subject + html + text, already rendered from a template
}

export interface EmailService {
  readonly mode: 'resend' | 'dev';
  send(input: SendEmailInput): Promise<void>;
}

function createEmailService(): EmailService {
  if (env.resend.apiKey) {
    // eslint-disable-next-line no-console
    console.log('[email] Resend configured — sending via Resend.');
    return new ResendEmailService();
  }
  // eslint-disable-next-line no-console
  console.log('[email] Resend not configured — emails in dev mode (console + .mail/).');
  return new DevEmailService();
}

export const emailService = createEmailService();
