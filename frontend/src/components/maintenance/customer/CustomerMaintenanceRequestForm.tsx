"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { PROPERTY_TYPES, TIME_SLOTS, validateImageFiles } from "@/lib/maintenance";
import { PROPERTY_CARE_SERVICES } from "@/lib/property-care-services";
import { cn } from "@/lib/utils";
import type { CustomerMaintenanceRequest } from "@/types/maintenance";
import { PcBackLink, PropertyCareSurface, ServiceIcon, pc } from "@/components/property-care/PropertyCareUI";
import { ErrorBanner } from "../MaintenanceShared";

const MAX_PROBLEM_IMAGES = 6;

interface FormState {
  category: string;
  title: string;
  description: string;
  propertyType: string;
  line: string;
  area: string;
  city: string;
  preferredVisitDate: string;
  preferredTimeSlot: string;
  contactName: string;
  contactPhone: string;
  /** UI-only: appended to the description on submit (no API field exists). */
  instructions: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const STEPS = [
  { key: "service", label: "Service" },
  { key: "problem", label: "Problem" },
  { key: "visit", label: "Location & time" },
  { key: "review", label: "Review" },
] as const;

const STEP_FIELDS: Array<Array<keyof FormState>> = [
  ["category"],
  ["title", "description"],
  ["propertyType", "line", "area", "city", "preferredVisitDate", "contactName", "contactPhone", "instructions"],
  [],
];

function todayInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

/** The API has no instructions field, so they are appended to the description. */
function composeDescription(form: FormState) {
  const instructions = form.instructions.trim();
  return instructions
    ? `${form.description.trim()}\n\nAdditional instructions: ${instructions}`
    : form.description.trim();
}

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.category) errors.category = "Choose the service you need.";
  if (form.title.trim().length < 5) errors.title = "Give your request a short title (at least 5 characters).";
  if (form.description.trim().length < 15) errors.description = "Describe the problem in a little more detail (at least 15 characters).";
  if (!form.propertyType) errors.propertyType = "Select the property type.";
  if (!form.line.trim()) errors.line = "Enter the house/flat number and street.";
  if (!form.area.trim()) errors.area = "Enter the area or society.";
  if (!form.city.trim()) errors.city = "Enter the city.";
  if (form.preferredVisitDate && form.preferredVisitDate < todayInput()) {
    errors.preferredVisitDate = "Choose today or a future date.";
  }
  if (!form.contactName.trim()) errors.contactName = "Enter a contact name.";
  if (composeDescription(form).length > 3000) {
    errors.instructions = "Description and instructions together must be 3,000 characters or fewer.";
  }
  if (!/^\+?[0-9]{10,15}$/.test(form.contactPhone.replace(/[\s-]/g, ""))) {
    errors.contactPhone = "Enter a valid phone number (10–15 digits).";
  }
  return errors;
}

export function CustomerMaintenanceRequestForm() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const validInitial = PROPERTY_CARE_SERVICES.some((item) => item.key === initialCategory);
  const [step, setStep] = useState(validInitial ? 1 : 0);
  const [form, setForm] = useState<FormState>({
    category: validInitial ? initialCategory : "",
    title: "",
    description: "",
    propertyType: "house",
    line: "",
    area: "",
    city: "Lahore",
    preferredVisitDate: "",
    preferredTimeSlot: "anytime",
    contactName: "",
    contactPhone: "",
    instructions: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ request: CustomerMaintenanceRequest; imageWarning?: string } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get<ApiEnvelope<{ name: string; phone: string | null }>>("/buyer/profile")
      .then(({ data }) => {
        if (!active) return;
        setForm((current) => ({
          ...current,
          contactName: current.contactName || data.data.name || "",
          contactPhone: current.contactPhone || data.data.phone || "",
        }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const service = PROPERTY_CARE_SERVICES.find((item) => item.key === form.category);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const addFiles = (selected: File[]) => {
    const problem = validateImageFiles(selected, MAX_PROBLEM_IMAGES - files.length);
    setFileError(problem);
    if (!problem) setFiles((current) => [...current, ...selected]);
  };

  const goTo = (next: number) => {
    setStep(next);
    setError(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validateStep = (index: number) => {
    const all = validate(form);
    const fields = index >= 3 ? (Object.keys(all) as Array<keyof FormState>) : STEP_FIELDS[index];
    const stepErrors: Errors = {};
    for (const field of fields) if (all[field]) stepErrors[field] = all[field];
    setErrors(stepErrors);
    const first = Object.keys(stepErrors)[0];
    if (first) {
      setError("Please fix the highlighted fields.");
      document.getElementById(`mr-${first}`)?.focus();
      return false;
    }
    return true;
  };

  const next = () => {
    if (validateStep(step)) goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    const allErrors = validate(form);
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => allErrors[field]));
      goTo(firstStep === -1 ? 0 : firstStep);
      setError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<ApiEnvelope<CustomerMaintenanceRequest>>("/maintenance/requests", {
        title: form.title.trim(),
        description: composeDescription(form),
        category: form.category,
        propertyType: form.propertyType,
        address: { line: form.line.trim(), area: form.area.trim(), city: form.city.trim() },
        preferredVisitDate: form.preferredVisitDate || undefined,
        preferredTimeSlot: form.preferredTimeSlot,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.replace(/[\s-]/g, ""),
      });
      let request = data.data;
      let imageWarning: string | undefined;
      if (files.length) {
        try {
          const body = new FormData();
          files.forEach((file) => body.append("images", file));
          const upload = await apiClient.post<ApiEnvelope<CustomerMaintenanceRequest>>(
            `/maintenance/requests/${encodeURIComponent(request.id)}/images`,
            body,
            { headers: { "Content-Type": "multipart/form-data" }, timeout: 90000 },
          );
          request = upload.data.data;
        } catch (uploadError) {
          imageWarning = `Your request was submitted, but the photos could not be uploaded: ${getApiErrorMessage(uploadError)} You can add them from the request page.`;
        }
      }
      setCreated({ request, imageWarning });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <PropertyCareSurface>
        <section className="mx-auto max-w-lg py-6 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-10 w-10" />
          </span>
          <h1 className="mt-6 text-[26px] font-black tracking-[-0.03em] text-[#102b55]">Request submitted</h1>
          <p className="mt-2 text-sm leading-6 text-[#5b6b82]">
            Our operations team will review your request and assign a verified Ghar Safar technician. We&apos;ll update you at every step.
          </p>
          <div className={cn(pc.card, "mt-6 p-5")}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#1768c4]">Your reference ID</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-[#102b55]">{created.request.reference}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(created.request.reference).then(() => setCopied(true)).catch(() => undefined);
              }}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#edf5ff] px-3 text-xs font-bold text-[#0d57ad]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy reference"}
            </button>
          </div>
          {created.imageWarning && <div className="mt-4 text-left"><ErrorBanner message={created.imageWarning} /></div>}
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href={`/care/requests/${created.request.id}`} className={pc.primaryBtn}>Track this request</Link>
            <Link href="/care/requests" className={pc.secondaryBtn}>View all requests</Link>
          </div>
        </section>
      </PropertyCareSurface>
    );
  }

  const errorText = (key: keyof FormState) =>
    errors[key] ? <span id={`mr-${key}-error`} className="mt-1.5 block text-xs font-semibold text-rose-600">{errors[key]}</span> : null;
  const invalid = (key: keyof FormState) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `mr-${key}-error` : undefined,
  });
  const propertyLabel = PROPERTY_TYPES.find((type) => type.key === form.propertyType)?.label;
  const slotLabel = TIME_SLOTS.find((slot) => slot.key === form.preferredTimeSlot)?.label;

  return (
    <PropertyCareSurface>
      <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-20">
        <PcBackLink href="/care/requests" label="My requests" />
        <h1 className="mt-2 text-[26px] font-black tracking-[-0.03em] text-[#102b55] sm:text-3xl">Request a service</h1>
        <p className="mt-1 text-sm text-[#5b6b82]">Takes about two minutes. You never have to search for a technician.</p>

        <ol aria-label="Request steps" className="mt-5 grid grid-cols-4 gap-1.5">
          {STEPS.map((item, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li key={item.key} aria-current={current ? "step" : undefined}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => index < step && goTo(index)}
                  className="w-full text-left disabled:cursor-default"
                >
                  <span className={cn("block h-1.5 rounded-full transition", done || current ? "bg-[#0d57ad]" : "bg-[#dbe5f2]")} />
                  <span className={cn("mt-2 block truncate text-[11px] font-bold sm:text-xs", current ? "text-[#0d57ad]" : done ? "text-[#36506f]" : "text-[#9aa9bd]")}>
                    {index + 1}. {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <form onSubmit={submit} noValidate className="mt-6 space-y-5 pb-28 sm:pb-0">
          {error && <ErrorBanner message={error} />}

          {step === 0 && (
            <fieldset>
              <legend className="text-lg font-extrabold text-[#102b55]">What do you need help with?</legend>
              <div id="mr-category" tabIndex={-1} role="radiogroup" aria-label="Service category" className="mt-3 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                {PROPERTY_CARE_SERVICES.map((item) => {
                  const selected = form.category === item.key;
                  return (
                    <label
                      key={item.key}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-3 rounded-3xl border-2 bg-white p-4 transition focus-within:ring-4 focus-within:ring-[#0d57ad]/15",
                        selected ? "border-[#0d57ad] bg-[#f2f7fe]" : "border-transparent shadow-[0_2px_10px_rgba(16,43,85,0.06)] hover:border-[#cfdcee]",
                      )}
                    >
                      <input type="radio" name="category" value={item.key} checked={selected} onChange={() => update("category", item.key)} className="sr-only" />
                      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", item.accent)}>
                        <ServiceIcon category={item.key} className="h-6 w-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-extrabold text-[#102b55]">{item.title}</span>
                        <span className="block text-xs leading-5 text-[#5b6b82]">{item.tagline}</span>
                      </span>
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-[#0d57ad] bg-[#0d57ad] text-white" : "border-[#cfdcee]")}>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errorText("category")}
            </fieldset>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {service && (
                <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(16,43,85,0.05)]">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", service.accent)}><ServiceIcon category={service.key} className="h-5 w-5" /></span>
                  <span className="flex-1 text-sm font-bold text-[#102b55]">{service.title}</span>
                  <button type="button" onClick={() => goTo(0)} className="text-xs font-bold text-[#0d57ad]">Change</button>
                </div>
              )}
              <div className={cn(pc.card, "space-y-4 p-4 sm:p-5")}>
                <label className={pc.label}>
                  Short title
                  <input id="mr-title" value={form.title} maxLength={120} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Kitchen sink leaking" className={pc.input} {...invalid("title")} />
                  {errorText("title")}
                </label>
                <label className={pc.label}>
                  Describe the problem
                  <textarea id="mr-description" value={form.description} maxLength={3000} rows={5} onChange={(event) => update("description", event.target.value)} placeholder="What is happening, since when, and anything the technician should know." className={cn(pc.input, "py-3")} {...invalid("description")} />
                  <span className="mt-1 flex justify-between text-xs text-[#94a3b8]">
                    <span>Minimum 15 characters</span>
                    <span>{form.description.length}/3000</span>
                  </span>
                  {errorText("description")}
                </label>
              </div>

              <div className={cn(pc.card, "p-4 sm:p-5")}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[15px] font-extrabold text-[#102b55]">Photos of the problem</p>
                  <span className="text-xs font-semibold text-[#6b7a90]">{files.length}/{MAX_PROBLEM_IMAGES} · optional</span>
                </div>
                <p className="mt-1 text-xs text-[#6b7a90]">Clear photos help us send the right technician with the right parts.</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {previews.map((preview, index) => (
                    <div key={preview.url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview.url} alt={`Selected photo ${index + 1}`} className="aspect-square w-full rounded-2xl object-cover" />
                      <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_PROBLEM_IMAGES && (
                    <label htmlFor="mr-photos" className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#bcd3ef] bg-[#f6f9fd] text-[#0d57ad] transition hover:bg-[#edf5ff]">
                      <Camera className="h-6 w-6" />
                      <span className="text-[11px] font-bold">Add photo</span>
                    </label>
                  )}
                </div>
                <input id="mr-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
                <p className="mt-2 text-[11px] text-[#94a3b8]">JPEG, PNG or WebP · up to 10 MB each</p>
                {fileError && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{fileError}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className={cn(pc.card, "space-y-4 p-4 sm:p-5")}>
                <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#102b55]"><MapPin className="h-4 w-4 text-[#0d57ad]" /> Property</p>
                <fieldset>
                  <legend className={pc.label}>Property type</legend>
                  <div id="mr-propertyType" className="mt-2 flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <label key={type.key} className={cn("inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-[#0d57ad]", form.propertyType === type.key ? "border-[#0d57ad] bg-[#0d57ad] text-white" : "border-[#d5e0ee] bg-white text-[#36506f]")}>
                        <input type="radio" name="propertyType" value={type.key} checked={form.propertyType === type.key} onChange={() => update("propertyType", type.key)} className="sr-only" />
                        {type.label}
                      </label>
                    ))}
                  </div>
                  {errorText("propertyType")}
                </fieldset>
                <label className={pc.label}>
                  House / flat number and street
                  <input id="mr-line" value={form.line} maxLength={300} onChange={(event) => update("line", event.target.value)} placeholder="House 12, Street 4" className={pc.input} autoComplete="street-address" {...invalid("line")} />
                  {errorText("line")}
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={pc.label}>
                    Area / society
                    <input id="mr-area" value={form.area} maxLength={100} onChange={(event) => update("area", event.target.value)} placeholder="Bahria Town, Sector C" className={pc.input} {...invalid("area")} />
                    {errorText("area")}
                  </label>
                  <label className={pc.label}>
                    City
                    <input id="mr-city" value={form.city} maxLength={100} onChange={(event) => update("city", event.target.value)} className={pc.input} {...invalid("city")} />
                    {errorText("city")}
                  </label>
                </div>
                <p className="flex items-start gap-2 rounded-2xl bg-[#f2f7fe] p-3 text-xs leading-5 text-[#36506f]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#0d57ad]" />
                  Your exact address and phone are shared only with the technician Ghar Safar assigns, after they accept the job.
                </p>
              </div>

              <div className={cn(pc.card, "space-y-4 p-4 sm:p-5")}>
                <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#102b55]"><CalendarDays className="h-4 w-4 text-[#0d57ad]" /> Preferred visit</p>
                <label className={pc.label}>
                  Date <span className="font-normal text-[#94a3b8]">(optional)</span>
                  <input id="mr-preferredVisitDate" type="date" min={todayInput()} value={form.preferredVisitDate} onChange={(event) => update("preferredVisitDate", event.target.value)} className={pc.input} {...invalid("preferredVisitDate")} />
                  {errorText("preferredVisitDate")}
                </label>
                <fieldset>
                  <legend className={pc.label}>Time of day</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <label key={slot.key} className={cn("flex min-h-12 cursor-pointer items-center rounded-2xl border px-3 text-[13px] font-semibold transition focus-within:ring-2 focus-within:ring-[#0d57ad]", form.preferredTimeSlot === slot.key ? "border-[#0d57ad] bg-[#f2f7fe] text-[#0d57ad]" : "border-[#d5e0ee] bg-white text-[#36506f]")}>
                        <input type="radio" name="preferredTimeSlot" value={slot.key} checked={form.preferredTimeSlot === slot.key} onChange={() => update("preferredTimeSlot", slot.key)} className="sr-only" />
                        {slot.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className={cn(pc.card, "space-y-4 p-4 sm:p-5")}>
                <p className="flex items-center gap-2 text-[15px] font-extrabold text-[#102b55]"><UserRound className="h-4 w-4 text-[#0d57ad]" /> Contact for the visit</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={pc.label}>
                    Name
                    <input id="mr-contactName" value={form.contactName} maxLength={100} onChange={(event) => update("contactName", event.target.value)} className={pc.input} autoComplete="name" {...invalid("contactName")} />
                    {errorText("contactName")}
                  </label>
                  <label className={pc.label}>
                    Phone
                    <input id="mr-contactPhone" type="tel" inputMode="tel" value={form.contactPhone} maxLength={20} onChange={(event) => update("contactPhone", event.target.value)} placeholder="03001234567" className={pc.input} autoComplete="tel" {...invalid("contactPhone")} />
                    {errorText("contactPhone")}
                  </label>
                </div>
                <label className={pc.label}>
                  Additional instructions <span className="font-normal text-[#94a3b8]">(optional)</span>
                  <textarea id="mr-instructions" value={form.instructions} maxLength={500} rows={2} onChange={(event) => update("instructions", event.target.value)} placeholder="Parking, gate access, pets, best way to reach you…" className={cn(pc.input, "py-3")} {...invalid("instructions")} />
                  {errorText("instructions")}
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-lg font-extrabold text-[#102b55]">Review your request</p>
              {[
                { title: "Service", stepIndex: 0, content: service ? <span className="flex items-center gap-2"><ServiceIcon category={service.key} className="h-4 w-4 text-[#0d57ad]" />{service.title}</span> : "—" },
                { title: "Problem", stepIndex: 1, content: <><span className="block font-bold">{form.title}</span><span className="mt-1 block whitespace-pre-line text-[#5b6b82]">{form.description}</span><span className="mt-1 block text-xs text-[#6b7a90]">{files.length} photo(s) attached</span></> },
                { title: "Location", stepIndex: 2, content: <>{propertyLabel} · {form.line}, {form.area}, {form.city}</> },
                { title: "Visit", stepIndex: 2, content: <>{form.preferredVisitDate || "Flexible date"} · {slotLabel}</> },
                { title: "Contact", stepIndex: 2, content: <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#0d57ad]" />{form.contactName} · {form.contactPhone}</span> },
                ...(form.instructions.trim() ? [{ title: "Instructions", stepIndex: 2, content: <span className="whitespace-pre-line text-[#5b6b82]">{form.instructions}</span> }] : []),
              ].map((row) => (
                <div key={row.title} className={cn(pc.card, "flex items-start justify-between gap-3 p-4")}>
                  <div className="min-w-0 text-sm text-[#102b55]">
                    <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1768c4]">{row.title}</p>
                    {row.content}
                  </div>
                  <button type="button" onClick={() => goTo(row.stepIndex)} className="shrink-0 text-xs font-bold text-[#0d57ad]">Edit</button>
                </div>
              ))}
              <p className="text-xs leading-5 text-[#6b7a90]">
                By submitting, you agree that Ghar Safar may share your address and phone with the assigned technician once they accept the job. Pricing is always quoted for your approval first.
              </p>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-[#e3ebf5] bg-white/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <div className="mx-auto flex max-w-3xl gap-2.5 sm:justify-end">
              {step > 0 ? (
                <button type="button" onClick={() => goTo(step - 1)} className={cn(pc.secondaryBtn, "flex-1 sm:flex-none")}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <Link href="/care/requests" className={cn(pc.secondaryBtn, "flex-1 sm:flex-none")}>Cancel</Link>
              )}
              <button type="submit" disabled={submitting} className={cn(pc.primaryBtn, "flex-[2] sm:flex-none")}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {step < STEPS.length - 1 ? <>Continue <ArrowRight className="h-4 w-4" /></> : submitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </PropertyCareSurface>
  );
}
