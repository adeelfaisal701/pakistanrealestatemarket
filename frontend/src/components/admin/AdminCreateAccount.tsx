"use client";

import React, { useState, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  MapPin,
  RefreshCw,
  Copy,
  CheckCheck,
  X,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface CreatedAccount {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminCreateAccountProps {
  onClose?: () => void;
  onAccountCreated?: () => void;
}

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function AdminCreateAccount({ onClose, onAccountCreated }: AdminCreateAccountProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    agencyName: "",
    city: "",
    password: generatePassword(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const handleChange = useCallback(
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
    },
    [],
  );

  const refreshPassword = useCallback(() => {
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        role: "agent",
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\s+/g, ""),
        password: formData.password,
      };
      if (formData.agencyName.trim()) payload.agencyName = formData.agencyName.trim();
      if (formData.city.trim()) payload.city = formData.city.trim();

      const response = await apiClient.post<ApiEnvelope<CreatedAccount>>(
        "/admin/accounts",
        payload,
      );
      setCreatedAccount(response.data.data);
      onAccountCreated?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    const text = `Ghar Safar Agent Credentials\nEmail: ${formData.email.trim()}\nPassword: ${formData.password}\nLogin: https://agent.gharesafar.com/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCredentialsCopied(true);
      setTimeout(() => setCredentialsCopied(false), 3000);
    } catch {
      // Clipboard not available
    }
  };

  const handleReset = () => {
    setCreatedAccount(null);
    setCredentialsCopied(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      agencyName: "",
      city: "",
      password: generatePassword(),
    });
    setError("");
  };

  // ── Success panel ──────────────────────────────────────────────────────────
  if (createdAccount) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCheck className="h-5 w-5" />
            Account Created Successfully
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-200">{createdAccount.name}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Email</span>
              <span className="font-mono text-slate-200">{formData.email.trim()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Password</span>
              <span className="font-mono text-slate-200 tracking-widest">{formData.password}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Role</span>
              <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-400 uppercase">
                {createdAccount.role}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-400">
          ⚠ Share these credentials with the agent securely. This is the only time the password is
          shown.
        </p>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleCopyCredentials}
            variant="outline"
            className="flex-1 h-10 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-2"
          >
            {credentialsCopied ? (
              <CheckCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {credentialsCopied ? "Copied!" : "Copy Credentials"}
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Create Agent Account
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Agent accounts are created by admin only. Set a temporary password and share securely.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Account type badge (only agent supported currently) */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
        <Building2 className="h-3.5 w-3.5" />
        Estate Agent / Agency
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Full Name / Contact Person</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="e.g. Ali Hassan"
              value={formData.name}
              onChange={handleChange("name")}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
              required
            />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="email"
                placeholder="agent@example.com"
                value={formData.email}
                onChange={handleChange("email")}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">WhatsApp / Phone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="tel"
                placeholder="0300 1234567"
                value={formData.phone}
                onChange={handleChange("phone")}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
                required
              />
            </div>
          </div>
        </div>

        {/* Agency Name + City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Agency Name{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="e.g. Prime Realty"
                value={formData.agencyName}
                onChange={handleChange("agencyName")}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              City{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="e.g. Lahore"
                value={formData.city}
                onChange={handleChange("city")}
                className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
              />
            </div>
          </div>
        </div>

        {/* Password with generate button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Temporary Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                value={formData.password}
                onChange={handleChange("password")}
                className="pl-10 font-mono tracking-wider bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:ring-emerald-600/20"
                required
                minLength={8}
              />
            </div>
            <button
              type="button"
              onClick={refreshPassword}
              title="Generate new password"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:border-emerald-600 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Minimum 8 characters. Click <RefreshCw className="inline h-3 w-3" /> to generate a
            secure random password.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? "Creating Account..." : "Create Agent Account"}
        </Button>
      </form>
    </div>
  );
}
