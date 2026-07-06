import * as React from 'react';
import { Column, Heading, Row, Section, Text } from '@react-email/components';
import { BrandButton, EmailLayout } from './Layout';
import { email } from './theme';
import { OrderEmailData } from './types';

// Sent on order.shipped — tells the customer their order is on its way.
export function ShippingNotificationEmail({ order }: { order: OrderEmailData }): React.ReactElement {
  return (
    <EmailLayout preview={`Your Siddhatva order ${order.orderId} has shipped`}>
      <Heading as="h2" style={h2}>
        Your order is on its way
      </Heading>
      <Text style={lead}>
        {order.customerName.split(' ')[0]}, your Siddhatva pieces have left our atelier and are
        headed to you.
      </Text>

      <Text style={meta}>
        Order <strong style={{ color: email.color.onSurface }}>{order.orderId}</strong> · Estimated
        delivery 3–5 business days
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
          </Row>
        ))}
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
        <BrandButton href={order.orderUrl}>Track your order</BrandButton>
      </Section>
    </EmailLayout>
  );
}

const h2: React.CSSProperties = { color: email.color.primary, fontSize: '22px', fontWeight: 600, margin: '0 0 8px' };
const lead: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px' };
const meta: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '13px', margin: '0 0 4px' };
const itemRow: React.CSSProperties = { borderBottom: `1px solid ${email.color.outlineVariant}`, padding: '10px 0' };
const itemName: React.CSSProperties = { color: email.color.onSurface, fontSize: '14px', fontWeight: 500, margin: 0 };
const itemVariant: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '12px', margin: '2px 0 0' };
const shipTo: React.CSSProperties = { marginTop: '20px' };
const shipToLabel: React.CSSProperties = { color: email.color.onSurfaceVariant, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' };
const shipToLine: React.CSSProperties = { color: email.color.onSurface, fontSize: '13px', margin: '1px 0' };
