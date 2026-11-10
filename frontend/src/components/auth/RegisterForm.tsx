"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, Phone, User, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface RegistrationResponse {
  message: string;
}

interface RegisterPageProps {
  fixedRole?: "agent" | "buyer";
}

export default function RegisterForm({ fixedRole }: RegisterPageProps) {
  const [role, setRole] = useState<"agent" | "buyer">(fixedRole ?? "agent");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    agencyName: "",
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
        agencyName: role === "agent" ? formData.agencyName.trim() : undefined,
        password: formData.password,
        role,
      });
      setSuccess(response.data.data.message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

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
            Join Ghar Safar to list properties or find high-return investment deals.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!fixedRole && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setRole("agent")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  role === "agent"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Estate Agent / Agency
              </button>
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  role === "buyer"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Buyer / Investor
              </button>
            </div>
          )}

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

            {role === "agent" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Real Estate Agency Name
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="e.g. Prime Realty Estate"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

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

            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
          </form>

          <div className="text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
