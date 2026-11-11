"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  Mail,
  Phone,
  User,
  ArrowRight,
  Building2,
  MessageCircle,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface RegistrationResponse {
  message: string;
}

type RegistrationMode = "buyer" | "agent";

const WHATSAPP_NUMBER = "923007589188";
const DISPLAY_PHONE = "0300 7589188";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hello! I would like to join Ghar Safar as an Estate Agent / Agency. Please help me get my account created.",
)}`;

// ── Agent contact panel ─────────────────────────────────────────────────────
function AgentContactPanel() {
  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-lg">
        {/* decorative circles */}
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
              Agent &amp; Agency Accounts
            </span>
          </div>
          <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">
            Want to Join Ghar Safar<br />as an Agent or Agency?
          </h2>
          <p className="text-sm leading-relaxed text-emerald-100">
            Agent and Agency accounts are created <span className="font-semibold text-white">exclusively by our Admin team</span>.
            Reach out and we&apos;ll get your account set up quickly.
          </p>
        </div>
      </div>

      {/* Contact block */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Contact Us to Get Your Account Created
        </p>

        {/* Phone number display */}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-800/50 dark:bg-slate-900/60">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <PhoneCall className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              WhatsApp / Phone
            </p>
            <p className="text-lg font-bold tracking-wide text-slate-800 dark:text-slate-100 select-all">
              {DISPLAY_PHONE}
            </p>
          </div>
          <a
            href={`tel:+${WHATSAPP_NUMBER}`}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Call
          </a>
        </div>

        {/* WhatsApp CTA button */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#1ebe5d] active:scale-95 transition-all"
        >
          {/* WhatsApp SVG icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Chat on WhatsApp
        </a>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Tap the button above or message us directly on WhatsApp. We typically respond within a
          few hours during business hours.
        </p>
      </div>

      <div className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}

// ── Buyer registration form ─────────────────────────────────────────────────
function BuyerRegisterForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await apiClient.post<ApiEnvelope<RegistrationResponse>>("/auth/register", {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\s+/g, ""),
        password: formData.password,
        role: "buyer",
      });
      setSuccess(response.data.data.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="e.g. Tariq Mehmood"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              placeholder="tariq@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            WhatsApp / Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="tel"
              placeholder="0300 1234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-10"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="pl-10"
            required
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {success}{" "}
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full h-11 font-semibold gap-2">
        <span>{submitting ? "Creating Account..." : "Complete Registration"}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="text-center text-xs text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}

// ── Main exported component ─────────────────────────────────────────────────
export default function RegisterForm() {
  const [mode, setMode] = useState<RegistrationMode>("buyer");

  const isAgent = mode === "agent";
  const isBuyer = mode === "buyer";

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <Image
            src="/images/ghar-safar-logo.png"
            unoptimized
            alt="Ghar Safar logo"
            width={50}
            height={48}
            className="mx-auto h-12 w-12 object-contain"
          />
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>
            {isAgent
              ? "Get in touch with our team to list and sell properties."
              : "Join Ghar Safar to discover and invest in Pakistan\u2019s best properties."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Mode selector ── */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode("agent")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                isAgent
                  ? "bg-white shadow-sm text-emerald-600 dark:bg-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Estate Agent / Agency
            </button>
            <button
              type="button"
              onClick={() => setMode("buyer")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                isBuyer
                  ? "bg-white shadow-sm text-emerald-600 dark:bg-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Buyer / Investor
            </button>
          </div>

          {/* ── Conditional content ── */}
          {isAgent ? <AgentContactPanel /> : <BuyerRegisterForm />}
        </CardContent>
      </Card>
    </div>
  );
}
