import * as React from 'react';
import { Column, Heading, Row, Section, Text } from '@react-email/components';
import { BrandButton, EmailLayout } from './Layout';
import { email } from './theme';
import { OrderEmailData } from './types';
import { formatPrice } from '../lib/money';

const money = (n: number): string => formatPrice(n);

// Sent on order.paid — confirms the server-verified payment and lists the order.
export function OrderConfirmationEmail({ order }: { order: OrderEmailData }): React.ReactElement {
  return (
    <EmailLayout preview={`Your Siddhatva order ${order.orderId} is confirmed`}>
      <Heading as="h2" style={h2}>
        Thank you for your order
      </Heading>
      <Text style={lead}>
        {order.customerName.split(' ')[0]}, your payment is confirmed and your pieces are being
        prepared with care by our atelier.
      </Text>

      <Text style={confirmed}>✓ Payment confirmed</Text>

      <Text style={meta}>
        Order <strong style={{ color: email.color.onSurface }}>{order.orderId}</strong>
      </Text>

      <Section style={{ marginTop: '16px' }}>
        {order.items.map((item, i) => (
          <Row key={i} style={itemRow}>
            <Column>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemVariant}>
                {item.variant} · Qty {item.quantity}
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={itemPrice}>{money(item.price * item.quantity)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Section style={totals}>
        <TotalRow label="Subtotal" value={money(order.subtotal)} />
        <TotalRow label="Shipping" value={order.shipping === 0 ? 'Complimentary' : money(order.shipping)} />
        <TotalRow label="Tax" value={money(order.tax)} />
        <TotalRow label="Total" value={money(order.total)} emphasize />
      </Section>

      <Section style={shipTo}>
        <Text style={shipToLabel}>Shipping to</Text>
        <Text style={shipToLine}>{order.shippingAddress.name}</Text>
        <Text style={shipToLine}>{order.shippingAddress.line1}</Text>
        <Text style={shipToLine}>
          {order.shippingAddress.city}
          {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress.zip}
        </Text>
        <Text style={shipToLine}>{order.shippingAddress.country}</Text>
      </Section>

      <Section style={{ textAlign: 'center', marginTop: '28px' }}>
        <BrandButton href={order.orderUrl}>View your order</BrandButton>
      </Section>
    </EmailLayout>
  );
}

function TotalRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }): React.ReactElement {
  return (
    <Row>
      <Column>
        <Text style={emphasize ? totalLabelStrong : totalLabel}>{label}</Text>
      </Column>
      <Column style={{ textAlign: 'right' }}>
        <Text style={emphasize ? totalValueStrong : totalValue}>{value}</Text>
      </Column>
    </Row>
  );
}

const h2: React.CSSProperties = { color: email.color.primary, fontSize: '22px', fontWeight: 600, margin: '0 0 8px' };
const lead: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' };
const confirmed: React.CSSProperties = { color: email.color.success, fontSize: '14px', fontWeight: 600, margin: '0 0 8px' };
const meta: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '13px', margin: '0 0 4px' };
const itemRow: React.CSSProperties = { borderBottom: `1px solid ${email.color.outlineVariant}`, padding: '10px 0' };
const itemName: React.CSSProperties = { color: email.color.onSurface, fontSize: '14px', fontWeight: 500, margin: 0 };
const itemVariant: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '12px', margin: '2px 0 0' };
const itemPrice: React.CSSProperties = { color: email.color.primary, fontSize: '14px', fontWeight: 500, margin: 0 };
const totals: React.CSSProperties = { marginTop: '16px' };
const totalLabel: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '13px', margin: '2px 0' };
const totalValue: React.CSSProperties = { color: email.color.onSurface, fontSize: '13px', margin: '2px 0' };
const totalLabelStrong: React.CSSProperties = { color: email.color.onSurface, fontSize: '15px', fontWeight: 600, margin: '8px 0 0' };
const totalValueStrong: React.CSSProperties = { color: email.color.primary, fontSize: '15px', fontWeight: 600, margin: '8px 0 0' };
const shipTo: React.CSSProperties = { marginTop: '20px' };
const shipToLabel: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' };
const shipToLine: React.CSSProperties = { color: email.color.onSurface, fontSize: '13px', margin: '1px 0' };
