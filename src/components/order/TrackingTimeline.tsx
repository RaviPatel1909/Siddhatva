import React from 'react';
import { ShippingStatus } from '../../types/order';

// Forward journey shown to the customer. `cancelled` / `not_shipped` are handled
// as special states outside this ordered list.
const STEPS: { status: Exclude<ShippingStatus, 'not_shipped' | 'cancelled'>; label: string; icon: string }[] = [
  { status: 'shipment_created', label: 'Shipment created', icon: 'inventory_2' },
  { status: 'in_transit', label: 'In transit', icon: 'local_shipping' },
  { status: 'out_for_delivery', label: 'Out for delivery', icon: 'directions_bike' },
  { status: 'delivered', label: 'Delivered', icon: 'check_circle' },
];

const rankOf = (status: ShippingStatus): number =>
  STEPS.findIndex((s) => s.status === status);

interface Props {
  shippingStatus?: ShippingStatus;
  courier?: string;
  awb?: string;
  trackingUrl?: string;
}

export const TrackingTimeline: React.FC<Props> = ({ shippingStatus, courier, awb, trackingUrl }) => {
  const status = shippingStatus ?? 'not_shipped';

  if (status === 'not_shipped') {
    return (
      <div className="flex items-center gap-sm text-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px] text-primary">schedule</span>
        Preparing to ship — you'll see tracking here once your order leaves our atelier.
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-sm text-sm text-danger">
        <span className="material-symbols-outlined text-[20px]">cancel</span>
        This shipment was cancelled or returned.
      </div>
    );
  }

  const currentRank = rankOf(status);

  return (
    <div>
      <ol className="space-y-md">
        {STEPS.map((step, i) => {
          const done = i <= currentRank;
          const isCurrent = i === currentRank;
          return (
            <li key={step.status} className="flex items-start gap-md">
              <div className="flex flex-col items-center">
                <span
                  className={`material-symbols-outlined text-[20px] w-8 h-8 rounded-full flex items-center justify-center ${
                    done ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-outline'
                  }`}
                >
                  {step.icon}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={`w-0.5 h-6 ${i < currentRank ? 'bg-primary/40' : 'bg-outline-variant/40'}`} />
                )}
              </div>
              <div className="pt-1">
                <p className={`text-sm font-medium ${done ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {step.label}
                </p>
                {isCurrent && <p className="text-xs text-primary font-medium mt-0.5">Current status</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {(courier || awb || trackingUrl) && (
        <div className="mt-md pt-md border-t border-outline-variant/30 text-sm space-y-xs">
          {courier && (
            <p className="text-on-surface-variant">
              Courier <span className="text-on-surface font-medium">{courier}</span>
            </p>
          )}
          {awb && (
            <p className="text-on-surface-variant">
              AWB <span className="text-on-surface font-medium">{awb}</span>
            </p>
          )}
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-xs text-primary font-semibold hover:underline"
            >
              View courier tracking
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};
