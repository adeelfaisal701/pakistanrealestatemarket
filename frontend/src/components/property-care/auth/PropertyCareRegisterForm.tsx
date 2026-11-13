"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowRight, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  PASSWORD_RULES,
  PHONE_PATTERN,
  PROPERTY_CARE_LOGIN_PATH,
  destinationForRole,
  persistSession,
} from "@/lib/property-care-auth";
import { cn } from "@/lib/utils";
import { pc } from "@/components/property-care/PropertyCareUI";
import { PropertyCareAuthLayout } from "./PropertyCareAuthLayout";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  terms: boolean;
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Enter your full name.";
  else if (form.name.trim().length > 100) errors.name = "Name must be 100 characters or fewer.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, ""))) errors.phone = "Enter a valid phone number (10–15 digits, e.g. 03001234567).";
  if (!PASSWORD_RULES.every((rule) => rule.test(form.password))) errors.password = "Your password doesn't meet the requirements below.";
  if (!form.confirm) errors.confirm = "Confirm your password.";
  else if (form.confirm !== form.password) errors.confirm = "Passwords don't match.";
  if (!form.terms) errors.terms = "Please accept the terms to create your account.";
  return errors;
}

export function PropertyCareRegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo");
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const loginHref = returnTo ? `${PROPERTY_CARE_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}` : PROPERTY_CARE_LOGIN_PATH;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setExistingAccount(false);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`pc-reg-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    const email = form.email.trim();
    try {
      // Existing public endpoint: creates customer (buyer) accounts only. No role is sent.
      await apiClient.post("/auth/register", {
        name: form.name.trim(),
        email,
        phone: form.phone.replace(/[\s-]/g, ""),
        password: form.password,
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setSubmitting(false);
      return;
    }
    try {
      const { data } = await apiClient.post<ApiEnvelope<{ accessToken: string; user: { role: string } }>>("/auth/login", { email, password: form.password });
      const destination = data.data.user.role === "buyer" ? destinationForRole("buyer", returnTo) : null;
      if (!destination) {
        setExistingAccount(true);
        return;
      }
      persistSession(data.data.accessToken, data.data.user);
      router.replace(destination);
    } catch (requestError) {
      // The register endpoint intentionally doesn't reveal existing accounts, so
      // a failed sign-in here usually means the email is already registered.
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) setExistingAccount(true);
      else setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof FormState) => ({
    id: `pc-reg-${key}`,
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `pc-reg-${key}-error` : undefined,
  });
  const errorText = (key: keyof FormState) =>
    errors[key] ? <span id={`pc-reg-${key}-error`} className="mt-1.5 block text-xs font-semibold text-rose-600">{errors[key]}</span> : null;

  return (
    <PropertyCareAuthLayout
      title="Create your account"
      subtitle="Book home maintenance, approve quotations and track every visit in one place."
      footer={
        <p className="text-center text-xs leading-5 text-[#94a3b8]">
          Customer accounts only. Ghar Safar technician accounts are created by Ghar Safar operations.
        </p>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <label className={pc.label}>
          Full name
          <input {...field("name")} value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" maxLength={100} className={pc.input} />
          {errorText("name")}
        </label>
        <label className={pc.label}>
          Email address
          <input {...field("email")} type="email" inputMode="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" maxLength={254} placeholder="you@example.com" className={pc.input} />
          {errorText("email")}
        </label>
        <label className={pc.label}>
          Phone number
          <input {...field("phone")} type="tel" inputMode="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" maxLength={20} placeholder="03001234567" className={pc.input} />
          {errorText("phone")}
        </label>

        <div>
          <label className={pc.label} htmlFor="pc-reg-password">Password</label>
          <span className="relative mt-1.5 block">
            <input {...field("password")} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" maxLength={72} className={cn(pc.input, "mt-0 pr-12")} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#5b6b82] hover:bg-[#f2f7fe]">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
          <ul aria-label="Password requirements" className="mt-2 grid grid-cols-1 gap-1 min-[400px]:grid-cols-3">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(form.password);
              return (
                <li key={rule.key} className={cn("flex items-center gap-1.5 text-xs font-semibold", met ? "text-emerald-700" : "text-[#94a3b8]")}>
                  {met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                  {rule.label}<span className="sr-only">{met ? " (met)" : " (not met)"}</span>
                </li>
              );
            })}
          </ul>
          {errorText("password")}
        </div>

        <label className={pc.label}>
          Confirm password
          <input {...field("confirm")} type={showPassword ? "text" : "password"} value={form.confirm} onChange={(event) => update("confirm", event.target.value)} autoComplete="new-password" maxLength={72} className={pc.input} />
          {errorText("confirm")}
        </label>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#f6f9fd] p-3 text-sm text-[#36506f]">
            <input {...field("terms")} type="checkbox" checked={form.terms} onChange={(event) => update("terms", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0d57ad]" />
            <span>I agree to Ghar Safar&apos;s terms of use and privacy policy, and to Ghar Safar sharing my address and phone with the technician assigned to my request.</span>
          </label>
          {errorText("terms")}
        </div>

        {existingAccount && (
          <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            We couldn&apos;t sign you in automatically. If you already have a Ghar Safar account with this email, <Link href={loginHref} className="font-bold underline">sign in</Link> with your existing password.
          </p>
        )}
        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <button type="submit" disabled={submitting} className={cn(pc.primaryBtn, "w-full")}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#5b6b82]">
        Already have an account? <Link href={loginHref} className="font-bold text-[#0d57ad] hover:underline">Sign in</Link>
      </p>
    </PropertyCareAuthLayout>
  );
}
