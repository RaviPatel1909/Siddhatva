import * as React from 'react';
import { render } from '@react-email/render';
import { OrderConfirmationEmail } from './OrderConfirmationEmail';
import { ShippingNotificationEmail } from './ShippingNotificationEmail';
import { PasswordResetEmail } from './PasswordResetEmail';
import { VerifyEmailEmail } from './VerifyEmailEmail';
import { OrderEmailData, PasswordResetEmailData, VerifyEmailData } from './types';

// A rendered email, ready to hand to any EmailService adapter.
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

async function renderBoth(node: React.ReactElement, subject: string): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  return { subject, html, text };
}

export function renderOrderConfirmation(order: OrderEmailData): Promise<RenderedEmail> {
  return renderBoth(
    React.createElement(OrderConfirmationEmail, { order }),
    `Your Siddhatva order ${order.orderId} is confirmed`
  );
}

export function renderShippingNotification(order: OrderEmailData): Promise<RenderedEmail> {
  return renderBoth(
    React.createElement(ShippingNotificationEmail, { order }),
    `Your Siddhatva order ${order.orderId} has shipped`
  );
}

export function renderPasswordReset(data: PasswordResetEmailData): Promise<RenderedEmail> {
  return renderBoth(
    React.createElement(PasswordResetEmail, { data }),
    'Reset your Siddhatva password'
  );
}

export function renderVerifyEmail(data: VerifyEmailData): Promise<RenderedEmail> {
  return renderBoth(
    React.createElement(VerifyEmailEmail, { data }),
    'Confirm your Siddhatva email address'
  );
}
