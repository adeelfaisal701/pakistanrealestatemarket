"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import apiClient, {
  getApiErrorMessage,
  type ApiEnvelope,
} from "@/lib/api-client";

interface BuyerProfile {
  name: string;
  email: string;
  phone: string;
  preferences: {
    preferredCity: string;
    preferredLocations: string[];
    budgetMin?: number;
    budgetMax?: number;
    propertyTypes: string[];
    purposes: string[];
    notifications: { inApp: boolean; email: boolean };
  };
}

const EMPTY_PROFILE: BuyerProfile = {
  name: "",
  email: "",
  phone: "",
  preferences: {
    preferredCity: "",
    preferredLocations: [],
    propertyTypes: [],
    purposes: [],
    notifications: { inApp: true, email: false },
  },
};

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function BuyerProfileSettings() {
  const [profile, setProfile] = useState<BuyerProfile>(EMPTY_PROFILE);
  const [locations, setLocations] = useState("");
  const [propertyTypes, setPropertyTypes] = useState("");
  const [purposes, setPurposes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<ApiEnvelope<BuyerProfile>>("/buyer/profile");
      const data = response.data.data;
      setProfile(data);
      setLocations(data.preferences.preferredLocations.join(", "));
      setPropertyTypes(data.preferences.propertyTypes.join(", "));
      setPurposes(data.preferences.purposes.join(", "));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePreference = <K extends keyof BuyerProfile["preferences"]>(
    key: K,
    value: BuyerProfile["preferences"][K],
  ) => {
    setProfile((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        preferences: {
          ...profile.preferences,
          preferredLocations: splitList(locations),
          propertyTypes: splitList(propertyTypes),
          purposes: splitList(purposes),
        },
      };
      const response = await apiClient.patch<ApiEnvelope<BuyerProfile>>(
        "/buyer/profile",
        payload,
      );
      setProfile(response.data.data);
      setSuccess("Your buyer profile and preferences have been saved.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your profile…</p>;
  }

  return (
    <section className="space-y-5">
      <header>
        <p className="mb-2 text-xs text-slate-500">Buyer Account / Profile</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Profile &amp; Preferences</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your contact details and property matching preferences.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}<button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Reload</button></p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p>}

      <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Contact details</legend>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Full name
            <input required maxLength={100} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Email
            <input required type="email" maxLength={254} value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">Phone
            <input type="tel" maxLength={32} value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Property preferences</legend>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Preferred city
            <input maxLength={100} value={profile.preferences.preferredCity} onChange={(event) => updatePreference("preferredCity", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Preferred locations (comma separated)
            <input maxLength={1000} value={locations} onChange={(event) => setLocations(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Minimum budget (PKR)
            <input type="number" min="0" value={profile.preferences.budgetMin ?? ""} onChange={(event) => updatePreference("budgetMin", event.target.value ? Number(event.target.value) : undefined)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Maximum budget (PKR)
            <input type="number" min="0" value={profile.preferences.budgetMax ?? ""} onChange={(event) => updatePreference("budgetMax", event.target.value ? Number(event.target.value) : undefined)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Property types (comma separated)
            <input placeholder="House, Flat" value={propertyTypes} onChange={(event) => setPropertyTypes(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">Purpose (comma separated)
            <input placeholder="Sale, Rent" value={purposes} onChange={(event) => setPurposes(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" />
          </label>
        </fieldset>

        <fieldset className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <legend className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Notification preferences</legend>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={profile.preferences.notifications.inApp} onChange={(event) => updatePreference("notifications", { ...profile.preferences.notifications, inApp: event.target.checked })} />
            In-app notifications
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={profile.preferences.notifications.email} onChange={(event) => updatePreference("notifications", { ...profile.preferences.notifications, email: event.target.checked })} />
            Email notifications (only when delivery is configured)
          </label>
        </fieldset>

        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Preferences"}
        </button>
      </form>
    </section>
  );
}
