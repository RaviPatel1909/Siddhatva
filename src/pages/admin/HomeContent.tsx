import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { getHomeContent, updateHomeContent, HomeContent } from '../../api/site';

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface-container-lowest/60 rounded-xl border border-outline-variant/20 p-lg space-y-md">
    <h3 className="font-display text-headline-md text-primary">{title}</h3>
    {children}
  </div>
);

// Single-image slot backed by the shared <ImageUploader> (max 1).
const ImageField: React.FC<{ label: string; url: string; onChange: (url: string) => void }> = ({
  label,
  url,
  onChange,
}) => (
  <Field label={label}>
    <ImageUploader
      images={url ? [{ url }] : []}
      onChange={(imgs) => onChange(imgs[0]?.url ?? '')}
      max={1}
    />
  </Field>
);

export const HomeContentPage: React.FC = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['site', 'home'], queryFn: getHomeContent });
  const [draft, setDraft] = useState<HomeContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  if (!draft) {
    return (
      <AdminLayout>
        <p className="text-on-surface-variant">Loading…</p>
      </AdminLayout>
    );
  }

  const setHero = (patch: Partial<HomeContent['hero']>) =>
    setDraft((d) => (d ? { ...d, hero: { ...d.hero, ...patch } } : d));
  const setPhil = (patch: Partial<HomeContent['philosophy']>) =>
    setDraft((d) => (d ? { ...d, philosophy: { ...d.philosophy, ...patch } } : d));
  const setCard = (i: number, patch: Partial<HomeContent['collectionCards'][number]>) =>
    setDraft((d) =>
      d ? { ...d, collectionCards: d.collectionCards.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) } : d
    );
  const setNews = (patch: Partial<HomeContent['newsletter']>) =>
    setDraft((d) => (d ? { ...d, newsletter: { ...d.newsletter, ...patch } } : d));

  const save = async () => {
    setSaving(true);
    try {
      await updateHomeContent(draft);
      await qc.invalidateQueries({ queryKey: ['site', 'home'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Home Content</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Edit the home page&apos;s fixed regions.
          </p>
        </div>
        <div className="flex items-center gap-md">
          {saved && <span className="text-sm text-success">Saved ✓</span>}
          <Button onClick={save} isLoading={saving}>Save Changes</Button>
        </div>
      </div>

      <div className="space-y-lg max-w-4xl">
        <Section title="Hero">
          <ImageField label="Background image" url={draft.hero.image} onChange={(url) => setHero({ image: url })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <Field label="Eyebrow">
              <input aria-label="Hero eyebrow" className={inputClass} value={draft.hero.subheadline} onChange={(e) => setHero({ subheadline: e.target.value })} />
            </Field>
            <Field label="Headline">
              <input aria-label="Hero headline" className={inputClass} value={draft.hero.headline} onChange={(e) => setHero({ headline: e.target.value })} />
            </Field>
            <Field label="Primary button label">
              <input className={inputClass} value={draft.hero.primaryCtaLabel} onChange={(e) => setHero({ primaryCtaLabel: e.target.value })} />
            </Field>
            <Field label="Primary button link">
              <input className={inputClass} value={draft.hero.primaryCtaHref} onChange={(e) => setHero({ primaryCtaHref: e.target.value })} />
            </Field>
            <Field label="Secondary button label">
              <input className={inputClass} value={draft.hero.secondaryCtaLabel} onChange={(e) => setHero({ secondaryCtaLabel: e.target.value })} />
            </Field>
            <Field label="Secondary button link">
              <input className={inputClass} value={draft.hero.secondaryCtaHref} onChange={(e) => setHero({ secondaryCtaHref: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="Philosophy">
          <ImageField label="Image" url={draft.philosophy.image} onChange={(url) => setPhil({ image: url })} />
          <Field label="Heading">
            <input className={inputClass} value={draft.philosophy.heading} onChange={(e) => setPhil({ heading: e.target.value })} />
          </Field>
          <Field label="Body">
            <textarea className={`${inputClass} min-h-24`} value={draft.philosophy.body} onChange={(e) => setPhil({ body: e.target.value })} />
          </Field>
        </Section>

        <Section title="Collection Cards">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {draft.collectionCards.map((card, i) => (
              <div key={i} className="space-y-md border border-outline-variant/20 rounded-lg p-md">
                <ImageField label={`Card ${i + 1} image`} url={card.image} onChange={(url) => setCard(i, { image: url })} />
                <Field label="Label">
                  <input className={inputClass} value={card.label} onChange={(e) => setCard(i, { label: e.target.value })} />
                </Field>
                <Field label="Link">
                  <input className={inputClass} value={card.href} onChange={(e) => setCard(i, { href: e.target.value })} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Newsletter">
          <Field label="Heading">
            <input className={inputClass} value={draft.newsletter.heading} onChange={(e) => setNews({ heading: e.target.value })} />
          </Field>
          <Field label="Subtext">
            <textarea className={`${inputClass} min-h-20`} value={draft.newsletter.subtext} onChange={(e) => setNews({ subtext: e.target.value })} />
          </Field>
        </Section>

        <div className="flex justify-end">
          <Button onClick={save} isLoading={saving}>Save Changes</Button>
        </div>
      </div>
    </AdminLayout>
  );
};
