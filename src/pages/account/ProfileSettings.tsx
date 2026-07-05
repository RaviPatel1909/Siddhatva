import React, { useState } from 'react';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

const labelClass = 'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

const NOTIFICATION_CHANNELS = [
  { key: 'email', icon: 'mail', title: 'Email Updates', description: 'Order confirmations and shipping updates.' },
  { key: 'sms', icon: 'sms', title: 'SMS Alerts', description: 'Real-time delivery alerts to your phone.' },
  { key: 'promotions', icon: 'local_offer', title: 'Promotions', description: 'Early access to sales and new collections.' },
] as const;

export const ProfileSettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    email: true,
    sms: false,
    promotions: true,
  });

  return (
    <AccountLayout>
      <h1 className="font-display text-3xl text-primary mb-xl">Profile Settings</h1>

      <div className="space-y-xl max-w-3xl">
        {/* Personal Information */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-lg md:p-xl">
          <h2 className="font-display text-headline-md text-primary mb-lg">Personal Information</h2>
          <div className="flex items-center gap-lg mb-lg">
            <div className="relative w-20 h-20 rounded-full bg-secondary-container overflow-hidden group cursor-pointer">
              <div className="w-full h-full flex items-center justify-center text-on-secondary-container font-display text-2xl">
                AS
              </div>
              <div className="absolute inset-0 bg-on-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </div>
            </div>
            <div>
              <p className="font-medium text-on-surface">Profile Photo</p>
              <p className="text-sm text-on-surface-variant">JPG or PNG, up to 5MB</p>
            </div>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" defaultValue="Alexander Sterling" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" defaultValue="alexander@siddhatva.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <div className="flex gap-xs">
                <select className={`${inputClass} w-24`} defaultValue="+44">
                  <option value="+44">+44</option>
                  <option value="+1">+1</option>
                  <option value="+33">+33</option>
                </select>
                <input type="tel" defaultValue="7700 900123" className={inputClass} />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end pt-sm">
              <button
                type="submit"
                className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-sm text-sm uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        </section>

        {/* Security */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-lg md:p-xl">
          <h2 className="font-display text-headline-md text-primary mb-lg">Security</h2>
          <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="sm:col-span-2">
              <label className={labelClass}>Current Password</label>
              <input type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input type="password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" className={inputClass} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between pt-sm">
              <button type="button" className="text-sm text-primary hover:underline">
                Forgot password?
              </button>
              <button
                type="submit"
                className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-sm text-sm uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95"
              >
                Update Password
              </button>
            </div>
          </form>
        </section>

        {/* Notifications */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-lg md:p-xl">
          <h2 className="font-display text-headline-md text-primary mb-lg">Notification Settings</h2>
          <div className="space-y-md">
            {NOTIFICATION_CHANNELS.map((channel) => (
              <button
                key={channel.key}
                onClick={() =>
                  setNotifications((prev) => ({ ...prev, [channel.key]: !prev[channel.key] }))
                }
                className="w-full flex items-center justify-between gap-md p-md rounded-lg border border-outline-variant/20 hover:bg-surface-container-high transition-colors text-left"
              >
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-primary">{channel.icon}</span>
                  <div>
                    <p className="font-medium text-on-surface">{channel.title}</p>
                    <p className="text-sm text-on-surface-variant">{channel.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="text-xs uppercase tracking-widest text-on-surface-variant">
                    {notifications[channel.key] ? 'Enabled' : 'Disabled'}
                  </span>
                  <ToggleSwitch
                    checked={notifications[channel.key]}
                    onChange={(checked) => setNotifications((prev) => ({ ...prev, [channel.key]: checked }))}
                    label={channel.title}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-error-container/20 rounded-xl border border-error/30 p-lg md:p-xl">
          <h2 className="font-display text-headline-md text-error mb-sm">Danger Zone</h2>
          <p className="text-sm text-on-surface-variant mb-md">
            Deactivating your account will remove access to your order history and saved preferences.
          </p>
          <button className="border border-error text-error px-lg py-sm rounded-lg font-label-sm text-sm uppercase tracking-widest hover:bg-error hover:text-on-error transition-all">
            Deactivate Account
          </button>
        </section>
      </div>
    </AccountLayout>
  );
};
