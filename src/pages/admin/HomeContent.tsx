import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { getHomeContent, updateHomeContent, HomeContent } from '../../api/site';
import { trimHomeContent, validateHref, HrefProblem } from '../../lib/contentLinks';

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

// A link field that reports a bad route inline, with a one-click correction when
// the slip is recoverable (casing, missing slash, trailing slash).
const LinkField: React.FC<{
  label: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, ariaLabel, value, onChange }) => {
  // Validate the trimmed value so a stray space doesn't mask an otherwise-valid
  // route — save trims anyway.
  const problem: HrefProblem | null = validateHref(value.trim());
  return (
    <Field label={label}>
      <input
        aria-label={ariaLabel ?? label}
        aria-invalid={problem ? true : undefined}
        className={`${inputClass} ${problem ? 'border-danger focus:ring-danger/30 focus:border-danger' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {problem && (
        <p className="font-body-md text-xs text-danger mt-xs" role="alert">
          {problem.message}
          {problem.suggestion && (
            <>
              {' '}
              <button
                type="button"
                onClick={() => onChange(problem.suggestion as string)}
                className="underline font-semibold hover:opacity-80"
              >
                Use “{problem.suggestion}”
              </button>
            </>
          )}
        </p>
      )}
    </Field>
  );
};

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

  // Every link in the draft, so save can be blocked before a dead CTA reaches the
  // storefront (a "/Shop " once took the primary call-to-action to a blank page).
  const linkProblems = [
    draft.hero.primaryCtaHref,
    draft.hero.secondaryCtaHref,
    ...draft.collectionCards.map((c) => c.href),
  ].filter((href) => validateHref(href.trim()) !== null);
  const hasLinkProblems = linkProblems.length > 0;

  const save = async () => {
    if (hasLinkProblems) return;
    setSaving(true);
    try {
      // Trim on the way out: whitespace in a headline is cosmetic, whitespace in
      // an href is a dead link. Persist the cleaned copy AND show it in the form,
      // so what the editor sees is what the storefront got.
      const cleaned = trimHomeContent(draft);
      setDraft(cleaned);
      await updateHomeContent(cleaned);
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
          {hasLinkProblems && (
            <span className="text-sm text-danger" role="alert">
              Fix {linkProblems.length} broken {linkProblems.length === 1 ? 'link' : 'links'} to save
            </span>
          )}
          <Button onClick={save} isLoading={saving} disabled={hasLinkProblems}>Save Changes</Button>
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
            <LinkField
              label="Primary button link"
              ariaLabel="Hero primary button link"
              value={draft.hero.primaryCtaHref}
              onChange={(v) => setHero({ primaryCtaHref: v })}
            />
            <Field label="Secondary button label">
              <input className={inputClass} value={draft.hero.secondaryCtaLabel} onChange={(e) => setHero({ secondaryCtaLabel: e.target.value })} />
            </Field>
            <LinkField
              label="Secondary button link"
              ariaLabel="Hero secondary button link"
              value={draft.hero.secondaryCtaHref}
              onChange={(v) => setHero({ secondaryCtaHref: v })}
            />
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
                <LinkField
                  label="Link"
                  ariaLabel={`Card ${i + 1} link`}
                  value={card.href}
                  onChange={(v) => setCard(i, { href: v })}
                />
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
          <Button onClick={save} isLoading={saving} disabled={hasLinkProblems}>Save Changes</Button>
        </div>
      </div>
    </AdminLayout>
  );
};
