import { env } from '../../env';
import type { EmailService, SendEmailInput } from './service';

// Real adapter — sends via the Resend REST API with a raw fetch (mirrors the
// RazorpayGateway's fetch-based style; no extra SDK dependency). The API key is
// server-side only. `from` must be on a domain verified in Resend (see RESEND.md).
export class ResendEmailService implements EmailService {
  readonly mode = 'resend' as const;
  private readonly apiKey = env.resend.apiKey;
  private readonly from = env.resend.from;

  async send({ to, email }: SendEmailInput): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
    }
  }
}
