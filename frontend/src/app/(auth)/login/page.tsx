"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    profileComplete?: boolean;
  };
  accessToken: string;
}

function getSafeReturnPath(returnTo: string | null): string | null {
  if (!returnTo) return null;

  try {
    const returnUrl = new URL(returnTo, window.location.origin);
    if (returnUrl.origin !== window.location.origin || returnUrl.pathname === "/login") {
      return null;
    }
    return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"agent" | "buyer">("agent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await apiClient.post<ApiEnvelope<AuthResponse>>("/auth/login", {
        email: email.trim(),
        password,
      });
      const { accessToken, user } = response.data.data;
      if (user.role === "technician") {
        // Technicians belong to the Maintenance workflow and sign in there.
        setError("This is a Ghar Safar technician account. Please use the Maintenance sign-in.");
        return;
      }
      if (user.role !== role) {
        setError(`This account is registered as a ${user.role}. Select the matching account type.`);
        return;
      }
      localStorage.setItem("auth_token", accessToken);
      localStorage.setItem("auth_user", JSON.stringify(user));
      window.dispatchEvent(new Event("estatepro:auth-changed"));
      const returnPath = getSafeReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
      );
      const destination =
        returnPath ||
        (user.role === "agent" ? "/agent" : "/buyer");
      if (user.role === "agent" && user.profileComplete !== true) {
        router.replace(
          `/agent/profile-completion?returnTo=${encodeURIComponent(
            destination.startsWith("/agent/profile-completion") ? "/agent" : destination,
          )}`,
        );
        return;
      }
      router.push(destination);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <Image
            src="/images/ghar-safar-logo.png"
            alt="Ghar Safar logo"
            width={50}
            height={48}
            className="mx-auto h-12 w-12 object-contain"
          />
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Log in to manage your real estate listings, CRM leads, and inquiries.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Switcher */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@agency.pk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
                {error.includes("Maintenance sign-in") && (
                  <>
                    {" "}
                    <Link href="/property-care/login" className="font-semibold underline">
                      Go to Maintenance sign-in
                    </Link>
                  </>
                )}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-11 font-semibold gap-2">
              <span>
                {submitting
                  ? "Signing In..."
                  : `Sign In as ${role === "agent" ? "Agent" : "Buyer"}`}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Don't have an account yet?{" "}
            <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
