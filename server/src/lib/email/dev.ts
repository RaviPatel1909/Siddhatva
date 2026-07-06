import fs from 'node:fs';
import path from 'node:path';
import type { EmailService, SendEmailInput } from './service';

// Dev fallback — no Resend account needed. Logs a summary of the rendered email
// to the console and writes the full HTML to server/.mail/ so you can open it in
// a browser and see the actual branded template. Nothing leaves the machine.
export class DevEmailService implements EmailService {
  readonly mode = 'dev' as const;
  private readonly dir = path.resolve(process.cwd(), '.mail');
  private seq = 0;

  async send({ to, email }: SendEmailInput): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    // Stable, sortable, collision-free filename without relying on Date/random
    // (kept deterministic per-process): sequence + sanitized subject.
    this.seq += 1;
    const slug = email.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const file = path.join(this.dir, `${String(this.seq).padStart(4, '0')}-${slug}.html`);
    fs.writeFileSync(file, email.html, 'utf8');

    // eslint-disable-next-line no-console
    console.log(
      `[email:dev] → ${to}\n` +
        `           subject: ${email.subject}\n` +
        `           saved:   ${file}\n` +
        `           --- text preview ---\n` +
        email.text
          .split('\n')
          .map((l) => `           ${l}`)
          .join('\n')
    );
  }
}
