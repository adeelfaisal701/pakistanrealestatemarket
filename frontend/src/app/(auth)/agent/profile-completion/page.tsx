"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Building2, ImagePlus, LoaderCircle, Upload } from "lucide-react";
import axios from "axios";
import apiClient, { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface AgentProfile {
  role: string;
  avatarUrl?: string | null;
  agencyAddress?: string | null;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isProfileComplete(profile: AgentProfile): boolean {
  return Boolean(profile.avatarUrl?.trim() && profile.agencyAddress?.trim());
}

function safeReturnPath(value: string | null): string {
  if (!value) return "/agent";
  try {
    const url = new URL(value, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.pathname.startsWith("/agent/profile-completion")
    ) {
      return "/agent";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/agent";
  }
}

export default function AgentProfileCompletionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/agent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    setError("");
    setLoading(true);
    const destination = safeReturnPath(
      new URLSearchParams(window.location.search).get("returnTo"),
    );
    setReturnTo(destination);
    if (!localStorage.getItem("auth_token")) {
      router.replace(`/login?returnTo=${encodeURIComponent(destination)}`);
      return;
    }

    try {
      const response = await apiClient.get<ApiEnvelope<AgentProfile>>("/users/profile");
      const currentProfile = response.data.data;
      if (currentProfile.role !== "agent") {
        router.replace(currentProfile.role === "buyer" ? "/buyer" : "/");
        return;
      }
      if (isProfileComplete(currentProfile)) {
        router.replace(destination);
        return;
      }
      setProfile(currentProfile);
      setAddress(currentProfile.agencyAddress ?? "");
      setPreviewUrl(currentProfile.avatarUrl ?? null);
      setLoading(false);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.dispatchEvent(new Event("estatepro:auth-changed"));
        router.replace(`/login?returnTo=${encodeURIComponent(destination)}`);
        return;
      }
      setError(getApiErrorMessage(requestError));
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!previewUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setError("");
    if (!selectedFile) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl(profile?.avatarUrl ?? null);
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setPreviewUrl(profile?.avatarUrl ?? null);
      setError("The profile picture must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!address.trim()) {
      setError("Enter your Estate or Agency office address.");
      return;
    }
    if (!file && !profile?.avatarUrl?.trim()) {
      setError("Upload a profile picture to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("agencyAddress", address.trim());
      if (file) formData.append("avatar", file);
      const response = await apiClient.patch<ApiEnvelope<AgentProfile>>(
        "/users/agent/profile",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (!isProfileComplete(response.data.data)) {
        throw new Error(
          "The profile was saved without all required details. Please try again.",
        );
      }
      window.dispatchEvent(new Event("estatepro:auth-changed"));
      router.replace(returnTo);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading your agent profile…
        </p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error || "Your agent profile could not be loaded."}
          </p>
          <Button type="button" onClick={() => void loadProfile()} className="mt-5">
            Try again
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Complete your agent profile
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Add your profile picture and Estate or Agency office address before opening your dashboard.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="agent-avatar" className="mb-2 block text-sm font-medium">
              Profile picture <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile picture preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7" />
                )}
              </div>
              <label
                htmlFor="agent-avatar"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-600 dark:border-slate-700 dark:text-slate-200"
              >
                <Upload className="h-4 w-4" />
                Choose image
              </label>
              <input
                id="agent-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              JPEG, PNG, or WebP; up to 10 MB.
            </p>
          </div>

          <div>
            <label htmlFor="agency-address" className="mb-2 block text-sm font-medium">
              Estate / Agency office address <span className="text-red-600">*</span>
            </label>
            <textarea
              id="agency-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder="Enter your complete office address"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving profile…" : "Save and continue"}
          </Button>
        </form>
      </section>
    </main>
  );
}
