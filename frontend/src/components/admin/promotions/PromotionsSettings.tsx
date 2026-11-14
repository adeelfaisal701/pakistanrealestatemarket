"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";
import { PLACEMENT_LABELS, adminPromotions, type PromoPlacement, type PromoSettings } from "@/lib/promotions";
import { Field, ToggleChip, inputClass } from "./shared";

const PLACEMENTS = Object.keys(PLACEMENT_LABELS) as PromoPlacement[];

export function PromotionsSettings() {
  const [settings, setSettings] = useState<PromoSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminPromotions
      .settings()
      .then(setSettings)
      .catch((requestError: unknown) => setError(getApiErrorMessage(requestError)));
  }, []);

  if (!settings) {
    return error ? (
      <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
        <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
      </div>
    ) : (
      <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Loading settings…</p>
    );
  }

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      setSettings(
        await adminPromotions.saveSettings({
          ...settings,
          listingsInterval: Math.min(20, Math.max(3, Math.round(settings.listingsInterval) || 3)),
          listingsMaxPerPage: Math.min(5, Math.max(0, Math.round(settings.listingsMaxPerPage) || 0)),
        }),
      );
      setSaved(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-bold text-white">Placement settings</h2>
        <p className="mt-1 text-xs text-slate-500">Turn placements on or off site-wide and control how often sponsored cards appear between listings.</p>
      </div>
      <Field label="Enabled placements" hint="Disabled placements never request or display campaigns.">
        <div className="flex flex-wrap gap-2">
          {PLACEMENTS.map((placement) => (
            <ToggleChip
              key={placement}
              checked={settings.enabledPlacements.includes(placement)}
              onChange={(on) =>
                setSettings({
                  ...settings,
                  enabledPlacements: on
                    ? [...new Set([...settings.enabledPlacements, placement])]
                    : settings.enabledPlacements.filter((item) => item !== placement),
                })
              }
            >
              {PLACEMENT_LABELS[placement]}
            </ToggleChip>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Listings: show after every N properties" hint="Between 3 and 20 property cards." htmlFor="promo-interval">
          <input
            id="promo-interval"
            type="number"
            min={3}
            max={20}
            className={inputClass}
            value={settings.listingsInterval}
            onChange={(event) => setSettings({ ...settings, listingsInterval: Number(event.target.value) || 0 })}
            onBlur={() => setSettings({ ...settings, listingsInterval: Math.min(20, Math.max(3, Math.round(settings.listingsInterval) || 3)) })}
          />
        </Field>
        <Field label="Listings: maximum per page" hint="0 to 5 sponsored cards on each results page." htmlFor="promo-max">
          <input
            id="promo-max"
            type="number"
            min={0}
            max={5}
            className={inputClass}
            value={settings.listingsMaxPerPage}
            onChange={(event) => setSettings({ ...settings, listingsMaxPerPage: Number(event.target.value) || 0 })}
            onBlur={() => setSettings({ ...settings, listingsMaxPerPage: Math.min(5, Math.max(0, Math.round(settings.listingsMaxPerPage) || 0)) })}
          />
        </Field>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-300"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{error}</p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        {saved ? <span role="status" className="text-xs text-emerald-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Saved</span> : null}
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
      </div>
    </section>
  );
}
