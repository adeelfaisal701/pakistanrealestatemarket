"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowRight, Eye, EyeOff, HelpCircle, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import {
  PROPERTY_CARE_REGISTER_PATH,
  adminPortalHref,
  clearSession,
  destinationForRole,
  hasStoredSession,
  persistSession,
} from "@/lib/property-care-auth";
import { cn } from "@/lib/utils";
import { pc } from "@/components/property-care/PropertyCareUI";
import { PropertyCareAuthLayout } from "./PropertyCareAuthLayout";

interface LoginResponse {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PropertyCareLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo");
  const justRegistered = params.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [signedInElsewhere, setSignedInElsewhere] = useState<string | null>(null);
  const [adminPortal, setAdminPortal] = useState("/admin-login");

  useEffect(() => setAdminPortal(adminPortalHref()), []);

  // Already signed in? Route by the role the backend reports.
  useEffect(() => {
    let active = true;
    if (!hasStoredSession()) {
      setChecking(false);
      return;
    }
    apiClient
      .get<ApiEnvelope<{ role: string }>>("/users/profile")
      .then(({ data }) => {
        if (!active) return;
        const destination = destinationForRole(data.data.role, returnTo);
        if (destination) router.replace(destination);
        else {
          setSignedInElsewhere(data.data.role);
          setChecking(false);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) clearSession();
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [returnTo, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login", { email: email.trim(), password });
      const { accessToken, user } = data.data;
      // Only customer and technician sessions start here; the role comes from the backend.
      const destination = user.role === "buyer" || user.role === "technician" ? destinationForRole(user.role, returnTo) : null;
      if (!destination) {
        setError(
          user.role === "agent"
            ? "This is a Ghar Safar Real Estate agent account. Property Care sign-in is for customers and Ghar Safar technicians. Please use the Real Estate sign-in."
            : "This account can't be used with Property Care.",
        );
        return;
      }
      persistSession(accessToken, user);
      router.replace(destination);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <PropertyCareAuthLayout title="Welcome back" subtitle="Checking your session…">
        <p role="status" className="flex items-center gap-2 text-sm text-[#64748b]"><Loader2 className="h-4 w-4 animate-spin" /> One moment…</p>
      </PropertyCareAuthLayout>
    );
  }

  const registerHref = returnTo ? `${PROPERTY_CARE_REGISTER_PATH}?returnTo=${encodeURIComponent(returnTo)}` : PROPERTY_CARE_REGISTER_PATH;

  return (
    <PropertyCareAuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your maintenance requests, service visits and property care."
      footer={
        <div className="space-y-3 text-center">
          <p className="text-sm text-[#64748b]">
            Ghar Safar technicians: use the account details provided by Ghar Safar operations.
          </p>
          <p className="text-xs text-[#94a3b8]">
            Ghar Safar operations team? <a href={adminPortal} className="font-semibold text-[#64748b] underline-offset-2 hover:underline">Staff sign-in</a>
            {" · "}
            Looking for property listings? <Link href="/login" className="font-semibold text-[#64748b] underline-offset-2 hover:underline">Real Estate sign-in</Link>
          </p>
        </div>
      }
    >
      {justRegistered && (
        <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Your account is ready. Sign in to continue.</p>
      )}
      {signedInElsewhere && (
        <div role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You&apos;re signed in with a {signedInElsewhere} account, which isn&apos;t a Property Care account.
          <button type="button" onClick={() => { clearSession(); setSignedInElsewhere(null); }} className="ml-1 font-bold underline">Sign out</button> to use a different account.
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <label className={pc.label} htmlFor="pc-email">
          Email address
          <span className="relative mt-1.5 block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
            <input
              id="pc-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "pc-email-error" : undefined}
              placeholder="you@example.com"
              className={cn(pc.input, "mt-0 pl-11")}
            />
          </span>
          {errors.email && <span id="pc-email-error" className="mt-1.5 block text-xs font-semibold text-rose-600">{errors.email}</span>}
        </label>

        <div>
          <div className="flex items-center justify-between">
            <label className={pc.label} htmlFor="pc-password">Password</label>
            <button type="button" onClick={() => setShowHelp((open) => !open)} aria-expanded={showHelp} aria-controls="pc-forgot" className="text-xs font-bold text-[#1660d0] hover:underline">
              Forgot password?
            </button>
          </div>
          <span className="relative mt-1.5 block">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
            <input
              id="pc-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "pc-password-error" : undefined}
              className={cn(pc.input, "mt-0 pl-11 pr-12")}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f5f9ff]">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
          {errors.password && <span id="pc-password-error" className="mt-1.5 block text-xs font-semibold text-rose-600">{errors.password}</span>}
          {showHelp && (
            <div id="pc-forgot" className="mt-3 flex gap-2 rounded-2xl bg-[#eaf2fe] p-3 text-xs leading-5 text-[#334155]">
              <HelpCircle className="h-4 w-4 shrink-0 text-[#1660d0]" />
              <span>
                Online password reset isn&apos;t available yet. Contact Ghar Safar support on{" "}
                <a href="tel:+923001234567" className="font-bold text-[#1660d0]">+92 300 1234567</a> and we&apos;ll help you regain access.
                Technicians should contact their Ghar Safar coordinator.
              </span>
            </div>
          )}
        </div>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <button type="submit" disabled={submitting} className={cn(pc.primaryBtn, "w-full")}>
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-[#94a3b8]"><span className="h-px flex-1 bg-[#e2e9f3]" />New to Property Care?<span className="h-px flex-1 bg-[#e2e9f3]" /></div>
      <Link href={registerHref} className={cn(pc.secondaryBtn, "w-full")}>Create customer account</Link>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7a8594]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        Your dashboard is chosen automatically from your account — customers go to Property Care, technicians to their job console.
      </p>
    </PropertyCareAuthLayout>
  );
}
