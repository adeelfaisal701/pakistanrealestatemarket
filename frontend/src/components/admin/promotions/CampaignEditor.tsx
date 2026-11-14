"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";
import SponsoredCarousel from "@/components/promotions/SponsoredCarousel";
import {
  PACKAGE_LABELS,
  PLACEMENT_LABELS,
  PROPERTY_TYPES,
  PURPOSES,
  adminPromotions,
  type AdminCampaign,
  type CampaignPayload,
  type PromoDevice,
  type PromoMedia,
  type PromoPackage,
  type PromoPlacement,
  type PromoStatus,
} from "@/lib/promotions";
import { Field, ToggleChip, fromLocalInput, inputClass, toLocalInput } from "./shared";
import { ScaledPreview } from "./ScaledPreview";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;
const MAX_MEDIA = 8;
const PLACEMENTS = Object.keys(PLACEMENT_LABELS) as PromoPlacement[];

function emptyPayload(): CampaignPayload {
  return {
    title: "",
    companyName: "",
    logoUrl: "",
    media: [],
    destinationUrl: "https://",
    ctaText: "Learn more",
    description: "",
    startsAt: new Date().toISOString(),
    endsAt: null,
    status: "draft",
    devices: ["mobile", "desktop"],
    placements: ["home_featured"],
    targeting: { cities: [], propertyTypes: [], purposes: [] },
    priority: 50,
    displayOrder: 0,
    videoMaxSeconds: 0,
    package: null,
  };
}

function fromCampaign(campaign: AdminCampaign): CampaignPayload {
  const { id, effectiveStatus, createdAt, updatedAt, totals, ...payload } = campaign;
  void id;
  void effectiveStatus;
  void createdAt;
  void updatedAt;
  void totals;
  return { ...payload, logoUrl: payload.logoUrl ?? "", description: payload.description ?? "" };
}

function checkFile(file: File, allowVideo: boolean): string | undefined {
  if (IMAGE_TYPES.includes(file.type)) return file.size > MAX_IMAGE ? "Images must be 10 MB or smaller." : undefined;
  if (allowVideo && VIDEO_TYPES.includes(file.type)) return file.size > MAX_VIDEO ? "Videos must be 60 MB or smaller." : undefined;
  return allowVideo ? "Use JPG, PNG or WebP images, or MP4/WebM videos." : "Use a JPG, PNG or WebP image.";
}

export function validateCampaign(form: CampaignPayload): string[] {
  const problems: string[] = [];
  if (form.title.trim().length < 2) problems.push("Add a campaign title.");
  if (form.companyName.trim().length < 2) problems.push("Add the company name.");
  try {
    const url = new URL(form.destinationUrl.trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) {
      throw new Error("invalid");
    }
  } catch {
    problems.push("Destination must be a full http(s) web address, e.g. https://example.com.");
  }
  if (form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) problems.push("End date must be after the start date.");
  if (form.status === "active") {
    if (!form.media.length) problems.push("Add at least one image or video before activating.");
    if (!form.placements.length) problems.push("Choose at least one placement before activating.");
    if (!form.devices.length) problems.push("Choose at least one device before activating.");
  }
  return problems;
}

interface CampaignEditorProps {
  campaign: AdminCampaign | null;
  onSaved: (campaign: AdminCampaign) => void;
  onCancel: () => void;
}

export function CampaignEditor({ campaign, onSaved, onCancel }: CampaignEditorProps) {
  const [form, setForm] = useState<CampaignPayload>(() => (campaign ? fromCampaign(campaign) : emptyPayload()));
  const [cityText, setCityText] = useState(() => (campaign?.targeting.cities ?? []).join(", "));
  const [uploading, setUploading] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [previewLayout, setPreviewLayout] = useState<"feature" | "inline">("feature");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const mediaInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const posterTarget = useRef<number>(-1);
  const posterInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CampaignPayload>(key: K, value: CampaignPayload[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = <T extends string>(list: T[], value: T, on: boolean) =>
    on ? [...new Set([...list, value])] : list.filter((item) => item !== value);

  const upload = async (file: File, allowVideo: boolean, label: string) => {
    const problem = checkFile(file, allowVideo);
    if (problem) {
      setError(problem);
      return undefined;
    }
    setError("");
    setUploading(label);
    setProgress(0);
    try {
      return await adminPromotions.upload(file, setProgress);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      return undefined;
    } finally {
      setUploading("");
    }
  };

  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_MEDIA - form.media.length;
    if (room <= 0) {
      setError(`A campaign can hold up to ${MAX_MEDIA} images or videos.`);
      return;
    }
    for (const file of Array.from(files).slice(0, room)) {
      const saved = await upload(file, true, file.name);
      if (!saved) break;
      setForm((current) => ({
        ...current,
        media: [...current.media, { kind: saved.kind, url: saved.url, alt: "" }],
      }));
    }
  };

  const updateMedia = (index: number, patch: Partial<PromoMedia>) =>
    setForm((current) => ({
      ...current,
      media: current.media.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    }));

  const moveMedia = (index: number, delta: number) =>
    setForm((current) => {
      const media = [...current.media];
      const target = index + delta;
      if (target < 0 || target >= media.length) return current;
      [media[index], media[target]] = [media[target], media[index]];
      return { ...current, media };
    });

  const payload = (): CampaignPayload => ({
    ...form,
    title: form.title.trim(),
    companyName: form.companyName.trim(),
    destinationUrl: form.destinationUrl.trim(),
    ctaText: form.ctaText.trim() || "Learn more",
    description: form.description.trim(),
    targeting: {
      ...form.targeting,
      cities: [...new Set(cityText.split(",").map((city) => city.trim()).filter(Boolean))],
    },
    media: form.media.map((item) => ({
      kind: item.kind,
      url: item.url,
      alt: item.alt?.trim() ?? "",
      ...(item.kind === "video" && item.posterUrl ? { posterUrl: item.posterUrl } : {}),
    })),
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = payload();
    const found = validateCampaign(next);
    setProblems(found);
    if (found.length) return;
    setSaving(true);
    setError("");
    try {
      const saved = campaign ? await adminPromotions.update(campaign.id, next) : await adminPromotions.create(next);
      onSaved(saved);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const previewCampaign = useMemo(
    () => ({
      id: campaign?.id ?? "preview",
      title: form.title || "Campaign title",
      companyName: form.companyName || "Company name",
      logoUrl: form.logoUrl ?? "",
      description: form.description,
      ctaText: form.ctaText || "Learn more",
      destinationUrl: form.destinationUrl,
      media: form.media,
      videoMaxSeconds: form.videoMaxSeconds,
    }),
    [campaign?.id, form],
  );

  return (
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]" noValidate>
      <div className="min-w-0 space-y-5">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white">Campaign details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign title" htmlFor="promo-title">
              <input id="promo-title" className={inputClass} value={form.title} maxLength={120} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Spring launch — Phase 2 plots" />
            </Field>
            <Field label="Company name" htmlFor="promo-company">
              <input id="promo-company" className={inputClass} value={form.companyName} maxLength={120} onChange={(event) => set("companyName", event.target.value)} placeholder="Advertiser or brand" />
            </Field>
          </div>
          <Field label="Short description" hint="Optional — up to 240 characters." htmlFor="promo-description">
            <textarea id="promo-description" className={`${inputClass} min-h-20 py-2`} maxLength={240} value={form.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <Field label="Destination URL" hint="Opens in a new tab with rel=&quot;sponsored noopener&quot;." htmlFor="promo-url">
              <input id="promo-url" type="url" inputMode="url" className={inputClass} value={form.destinationUrl} maxLength={2048} onChange={(event) => set("destinationUrl", event.target.value)} />
            </Field>
            <Field label="Call-to-action text" htmlFor="promo-cta">
              <input id="promo-cta" className={inputClass} value={form.ctaText} maxLength={40} onChange={(event) => set("ctaText", event.target.value)} />
            </Field>
          </div>
          <Field label="Company logo" hint="Square JPG, PNG or WebP works best.">
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-slate-700 bg-white object-contain p-1" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-500">
                  <ImagePlus className="h-5 w-5" />
                </span>
              )}
              <Button type="button" variant="outline" size="sm" disabled={Boolean(uploading)} onClick={() => logoInput.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> {form.logoUrl ? "Replace" : "Upload"}
              </Button>
              {form.logoUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("logoUrl", "")}>Remove</Button>
              ) : null}
              <input
                ref={logoInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const saved = await upload(file, false, "logo");
                  if (saved) set("logoUrl", saved.url);
                }}
              />
            </div>
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Images &amp; videos</h2>
              <p className="text-xs text-slate-500">JPG/PNG/WebP up to 10 MB · MP4/WebM up to 60 MB · max {MAX_MEDIA}. Slides rotate in this order.</p>
            </div>
            <Button type="button" size="sm" disabled={Boolean(uploading) || form.media.length >= MAX_MEDIA} onClick={() => mediaInput.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Add media
            </Button>
            <input
              ref={mediaInput}
              type="file"
              multiple
              accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
              className="hidden"
              onChange={(event) => {
                const files = event.target.files;
                void addMedia(files).finally(() => {
                  if (mediaInput.current) mediaInput.current.value = "";
                });
              }}
            />
            <input
              ref={posterInput}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                const index = posterTarget.current;
                if (!file || index < 0) return;
                const saved = await upload(file, false, "poster");
                if (saved) updateMedia(index, { posterUrl: saved.url });
              }}
            />
          </div>
          {uploading ? (
            <div role="status" className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploading}… {progress}%
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </span>
            </div>
          ) : null}
          {form.media.length ? (
            <ul className="space-y-2">
              {form.media.map((item, index) => (
                <li key={`${item.url}-${index}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 sm:flex-nowrap">
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                    {item.kind === "image" || item.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.kind === "image" ? item.url : item.posterUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-slate-500"><Video className="h-5 w-5" /></span>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-bold uppercase text-white">{item.kind}</span>
                  </div>
                  <input
                    aria-label={`Alt text for slide ${index + 1}`}
                    className={`${inputClass} min-w-[10rem] flex-1`}
                    value={item.alt ?? ""}
                    maxLength={200}
                    placeholder="Describe the image for screen readers"
                    onChange={(event) => updateMedia(index, { alt: event.target.value })}
                  />
                  {item.kind === "video" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(uploading)}
                      onClick={() => {
                        posterTarget.current = index;
                        posterInput.current?.click();
                      }}
                    >
                      {item.posterUrl ? "Change poster" : "Add poster"}
                    </Button>
                  ) : null}
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => moveMedia(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={index === form.media.length - 1} onClick={() => moveMedia(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove media"
                      onClick={() => set("media", form.media.filter((_, position) => position !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
              No media yet. Upload at least one image or video before activating.
            </p>
          )}
          <Field
            label="Video playback limit (seconds)"
            hint="0 = play each video to the end before rotating. Otherwise the carousel moves on after this many seconds."
            htmlFor="promo-video-limit"
          >
            <input id="promo-video-limit" type="number" min={0} max={300} className={`${inputClass} max-w-40`} value={form.videoMaxSeconds} onChange={(event) => set("videoMaxSeconds", Math.min(300, Math.max(0, Number(event.target.value) || 0)))} />
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white">Placement &amp; targeting</h2>
          <Field label="Placements">
            <div className="flex flex-wrap gap-2">
              {PLACEMENTS.map((placement) => (
                <ToggleChip key={placement} checked={form.placements.includes(placement)} onChange={(on) => set("placements", toggle(form.placements, placement, on))}>
                  {PLACEMENT_LABELS[placement]}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label="Devices">
            <div className="flex flex-wrap gap-2">
              {(["mobile", "desktop"] as PromoDevice[]).map((device) => (
                <ToggleChip key={device} checked={form.devices.includes(device)} onChange={(on) => set("devices", toggle(form.devices, device, on))}>
                  {device === "mobile" ? "Mobile" : "Tablet & desktop"}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label="Cities" hint="Comma separated. Leave empty to show in every city." htmlFor="promo-cities">
            <input id="promo-cities" className={inputClass} value={cityText} onChange={(event) => setCityText(event.target.value)} placeholder="Lahore, Islamabad" />
          </Field>
          <Field label="Property categories" hint="None selected = all categories.">
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => (
                <ToggleChip
                  key={type}
                  checked={form.targeting.propertyTypes.includes(type)}
                  onChange={(on) => set("targeting", { ...form.targeting, propertyTypes: toggle(form.targeting.propertyTypes, type, on) })}
                >
                  {type}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label="Sale or rent" hint="None selected = both.">
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((purpose) => (
                <ToggleChip
                  key={purpose}
                  checked={form.targeting.purposes.includes(purpose)}
                  onChange={(on) => set("targeting", { ...form.targeting, purposes: toggle(form.targeting.purposes, purpose, on) })}
                >
                  For {purpose}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Targeting uses only the page being viewed (city, category, purpose) and device width — no personal data or tracking cookies.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white">Schedule &amp; priority</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="promo-start">
              <input id="promo-start" type="datetime-local" className={inputClass} value={toLocalInput(form.startsAt)} onChange={(event) => set("startsAt", fromLocalInput(event.target.value) ?? form.startsAt)} />
            </Field>
            <Field label="Ends" hint="Optional. Campaigns stop automatically at this time." htmlFor="promo-end">
              <div className="flex gap-2">
                <input id="promo-end" type="datetime-local" className={inputClass} value={toLocalInput(form.endsAt)} onChange={(event) => set("endsAt", fromLocalInput(event.target.value))} />
                {form.endsAt ? (
                  <Button type="button" variant="ghost" size="icon" aria-label="Clear end date" onClick={() => set("endsAt", null)}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field label="Status" htmlFor="promo-status" hint="Active campaigns run between the start and end dates.">
              <select id="promo-status" className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value as PromoStatus)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Package (for reference)" htmlFor="promo-package">
              <select id="promo-package" className={inputClass} value={form.package ?? ""} onChange={(event) => set("package", (event.target.value || null) as PromoPackage | null)}>
                <option value="">None</option>
                {(Object.keys(PACKAGE_LABELS) as PromoPackage[]).map((item) => (
                  <option key={item} value={item}>{PACKAGE_LABELS[item]}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority (0–100)" hint="Higher priority shows first." htmlFor="promo-priority">
              <input id="promo-priority" type="number" min={0} max={100} className={inputClass} value={form.priority} onChange={(event) => set("priority", Math.min(100, Math.max(0, Number(event.target.value) || 0)))} />
            </Field>
            <Field label="Display order" hint="Tie-breaker: lower numbers first." htmlFor="promo-order">
              <input id="promo-order" type="number" min={0} max={9999} className={inputClass} value={form.displayOrder} onChange={(event) => set("displayOrder", Math.min(9999, Math.max(0, Number(event.target.value) || 0)))} />
            </Field>
          </div>
        </section>
      </div>

      <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">Live preview</h2>
            <div className="flex gap-1.5">
              <ToggleChip checked={previewLayout === "feature"} onChange={() => setPreviewLayout("feature")}>Banner</ToggleChip>
              <ToggleChip checked={previewLayout === "inline"} onChange={() => setPreviewLayout("inline")}>In-feed</ToggleChip>
              <ToggleChip checked={previewWidth === "desktop"} onChange={() => setPreviewWidth("desktop")}>
                <Monitor className="h-3.5 w-3.5" aria-label="Desktop width" />
              </ToggleChip>
              <ToggleChip checked={previewWidth === "mobile"} onChange={() => setPreviewWidth("mobile")}>
                <Smartphone className="h-3.5 w-3.5" aria-label="Mobile width" />
              </ToggleChip>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-4">
            <div className={`mx-auto ${previewWidth === "mobile" ? "max-w-[358px]" : "max-w-full"}`}>
              {form.media.length ? (
                <ScaledPreview width={previewWidth === "mobile" ? 358 : 1216}>
                  <SponsoredCarousel
                    key={`${previewLayout}-${previewWidth}-${form.media.length}`}
                    campaigns={[previewCampaign]}
                    placement="home_featured"
                    layout={previewLayout}
                    preview
                  />
                </ScaledPreview>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Upload media to preview the campaign.</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Preview interactions are not counted in analytics.</p>
        </section>

        {problems.length || error ? (
          <div role="alert" className="space-y-1 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-xs text-rose-200">
            {[...problems, ...(error ? [error] : [])].map((problem) => (
              <p key={problem} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{problem}</p>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || Boolean(uploading)}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {campaign ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </div>
    </form>
  );
}
