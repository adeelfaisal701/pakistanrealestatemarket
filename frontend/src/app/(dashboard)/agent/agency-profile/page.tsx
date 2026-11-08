"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Pencil,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { PropertyCard } from "@/components/marketplace/property-card";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchManagedAgencyProfile,
  removeAgencyAgent,
  updateManagedAgencyProfile,
  type ManagedAgencyProfile,
} from "@/lib/public-directory";
import { fetchPublicPropertiesPage, type PublicPropertiesPage } from "@/lib/public-properties";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_GALLERY_ITEMS = 20;

type ImagePreview = { file: File; url: string };

function isValidImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE;
}

export default function AgencyProfileEditPage() {
  const [profile, setProfile] = useState<ManagedAgencyProfile | null>(null);
  const [listings, setListings] = useState<PublicPropertiesPage | null>(null);
  const [listingPage, setListingPage] = useState(1);
  const [logo, setLogo] = useState<ImagePreview | null>(null);
  const [cover, setCover] = useState<ImagePreview | null>(null);
  const [galleryUploads, setGalleryUploads] = useState<ImagePreview[]>([]);
  const [removedGalleryUrls, setRemovedGalleryUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingAgent, setRemovingAgent] = useState("");
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const previewUrls = useRef(new Set<string>());

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await fetchManagedAgencyProfile();
      setProfile(current);
      setRemovedGalleryUrls([]);
      setListingsLoading(true);
      try {
        setListings(await fetchPublicPropertiesPage({
          agencyName: current.name,
          page: 1,
          limit: 6,
          sortBy: "newest",
        }));
        setListingPage(1);
      } catch (requestError: unknown) {
        setError(getApiErrorMessage(requestError));
      } finally {
        setListingsLoading(false);
      }
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const pickImage = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (preview: ImagePreview | null) => void,
    previous: ImagePreview | null,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isValidImage(file)) {
      setError("Choose a JPEG, PNG, or WebP image up to 10 MB.");
      return;
    }
    if (previous?.url.startsWith("blob:")) {
      URL.revokeObjectURL(previous.url);
      previewUrls.current.delete(previous.url);
    }
    const url = URL.createObjectURL(file);
    previewUrls.current.add(url);
    setter({ file, url });
    setError("");
  };

  const addGalleryImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const retainedCount = (profile?.galleryUrls.length ?? 0) - removedGalleryUrls.length;
    if (retainedCount + galleryUploads.length + files.length > MAX_GALLERY_ITEMS) {
      setError(`The agency gallery can contain up to ${MAX_GALLERY_ITEMS} photos.`);
      return;
    }
    const invalid = files.find((file) => !isValidImage(file));
    if (invalid) {
      setError("Choose JPEG, PNG, or WebP gallery images up to 10 MB each.");
      return;
    }
    setGalleryUploads((current) => [
      ...current,
      ...files.map((file) => {
        const url = URL.createObjectURL(file);
        previewUrls.current.add(url);
        return { file, url };
      }),
    ]);
    setError("");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    form.set("galleryUrls", JSON.stringify(
      profile.galleryUrls.filter((url) => !removedGalleryUrls.includes(url)),
    ));
    if (logo) form.append("logo", logo.file);
    if (cover) form.append("cover", cover.file);
    galleryUploads.forEach(({ file }) => form.append("gallery", file));

    setSaving(true);
    try {
      const updated = await updateManagedAgencyProfile(form);
      setProfile(updated);
      [logo?.url, cover?.url, ...galleryUploads.map(({ url }) => url)]
        .filter((url): url is string => Boolean(url?.startsWith("blob:")))
        .forEach((url) => {
          URL.revokeObjectURL(url);
          previewUrls.current.delete(url);
        });
      setLogo(null);
      setCover(null);
      setGalleryUploads([]);
      setRemovedGalleryUrls([]);
      setNotice("Agency profile saved successfully.");
      setListingsLoading(true);
      try {
        setListings(await fetchPublicPropertiesPage({
          agencyName: updated.name,
          page: 1,
          limit: 6,
          sortBy: "newest",
        }));
        setListingPage(1);
      } finally {
        setListingsLoading(false);
      }
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const changeListingPage = async (nextPage: number) => {
    if (!profile || nextPage < 1 || nextPage > (listings?.pagination.totalPages ?? 1)) return;
    setListingsLoading(true);
    setError("");
    try {
      setListings(await fetchPublicPropertiesPage({
        agencyName: profile.name,
        page: nextPage,
        limit: 6,
        sortBy: "newest",
      }));
      setListingPage(nextPage);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setListingsLoading(false);
    }
  };

  const handleRemoveAgent = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Remove ${agentName} from this agency?`)) return;
    setRemovingAgent(agentId);
    setError("");
    setNotice("");
    try {
      await removeAgencyAgent(agentId);
      setProfile(await fetchManagedAgencyProfile());
      setNotice(`${agentName} was removed from the agency.`);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setRemovingAgent("");
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-400 max-md:text-[#64748B]">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading agency profile…
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-[#101b2c] p-6 text-slate-100 max-md:border-[#E2E8F0] max-md:bg-white max-md:text-[#101D32]">
        <h1 className="text-xl font-bold max-md:text-[#071B2B]">Agency profile unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-rose-300 max-md:text-rose-700">{error}</p>
        <p className="mt-3 text-sm text-slate-400 max-md:text-[#64748B]">
          This editor is available to active agent accounts associated with an agency.
        </p>
        <Button type="button" onClick={() => void loadProfile()} className="mt-5">Try again</Button>
      </section>
    );
  }

  const retainedGallery = profile.galleryUrls.filter((url) => !removedGalleryUrls.includes(url));
  const profileLink = `/agencies?name=${encodeURIComponent(profile.name)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 max-md:space-y-4 max-md:text-[#101D32]">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-400 max-md:text-[#008F68]">Agency workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl max-md:text-[#071B2B]">Edit agency profile</h1>
          <p className="mt-2 text-sm text-slate-400 max-md:text-[#64748B]">Manage the shared agency details, gallery, team, and published listings.</p>
        </div>
        <Link href={profileLink} target="_blank" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-emerald-500 sm:self-auto max-md:border-[#E2E8F0] max-md:text-[#0B2538]">
          View public profile <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 max-md:border-rose-200 max-md:bg-rose-50 max-md:text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 max-md:border-emerald-200 max-md:bg-[#EAF7F2] max-md:text-[#008F68]">{notice}</p>}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#101b2c] max-md:border-[#E2E8F0] max-md:bg-white max-md:shadow-sm">
          <div className="relative h-40 bg-slate-800 sm:h-56">
            {(cover?.url || profile.coverImageUrl) && (
              <img src={cover?.url ?? profile.coverImageUrl} alt="Agency cover preview" className="h-full w-full object-cover" />
            )}
            <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950/85 px-3 py-2 text-xs font-semibold text-white">
              <Upload className="h-4 w-4" /> Change cover
              <input aria-label="Upload agency cover image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => pickImage(event, setCover, cover)} />
            </label>
            <div className="absolute bottom-3 left-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#101b2c] bg-slate-700 sm:h-24 sm:w-24 max-md:border-white">
              {(logo?.url || profile.logoUrl) ? (
                <img src={logo?.url ?? profile.logoUrl} alt="Agency logo preview" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-9 w-9 text-slate-300" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4 pt-5 sm:p-5 sm:pl-32">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 max-md:border-[#E2E8F0] max-md:text-[#0B2538]">
              <ImagePlus className="h-4 w-4" /> Upload agency logo
              <input aria-label="Upload agency logo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => pickImage(event, setLogo, logo)} />
            </label>
            <p className="text-xs text-slate-500 max-md:text-[#64748B]">JPEG, PNG, WebP · maximum 10 MB per image</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-[#101b2c] p-4 sm:p-6 max-md:border-[#E2E8F0] max-md:bg-white max-md:shadow-sm">
          <h2 className="text-lg font-bold text-white max-md:text-[#071B2B]">Agency information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Agency name" name="name" defaultValue={profile.name} required />
            <Field label="Agency type" name="agencyType" defaultValue={profile.agencyType} placeholder="e.g. Real estate agency" />
            <Field label="Office address" name="officeAddress" defaultValue={profile.officeAddress} />
            <Field label="City" name="city" defaultValue={profile.city} />
            <Field label="Contact number" name="phone" type="tel" defaultValue={profile.phone} />
            <Field label="Contact email" name="email" type="email" defaultValue={profile.email} />
            <Field label="Website" name="website" type="url" defaultValue={profile.website} placeholder="https://" />
            <label className="text-sm font-medium text-slate-300 sm:col-span-2 max-md:text-[#475569]">
              Description
              <textarea name="description" rows={5} maxLength={2000} defaultValue={profile.description} className="mt-2 w-full resize-y rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 max-md:border-[#CBD5E1] max-md:bg-white max-md:text-[#101D32]" />
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500 max-md:text-[#64748B]">Only contact details saved to this agency profile are shown publicly. Agent account email and phone are not copied here.</p>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-[#101b2c] p-4 sm:p-6 max-md:border-[#E2E8F0] max-md:bg-white max-md:shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white max-md:text-[#071B2B]">Agency gallery</h2>
              <p className="mt-1 text-xs text-slate-400 max-md:text-[#64748B]">Add or remove photos. Up to {MAX_GALLERY_ITEMS} images.</p>
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 max-md:border-[#E2E8F0] max-md:text-[#0B2538]">
              <ImagePlus className="h-4 w-4" /> Add photos
              <input aria-label="Add agency gallery photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={addGalleryImages} />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {retainedGallery.map((url) => (
              <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-800 max-md:bg-slate-100">
                <img src={url} alt="Agency gallery" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove gallery photo" onClick={() => setRemovedGalleryUrls((current) => [...current, url])} className="absolute right-2 top-2 rounded-lg bg-slate-950/80 p-2 text-white hover:bg-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {galleryUploads.map(({ file, url }) => (
              <div key={`${file.name}-${url}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-800 max-md:bg-slate-100">
                <img src={url} alt={file.name} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => {
                  URL.revokeObjectURL(url);
                  previewUrls.current.delete(url);
                  setGalleryUploads((current) => current.filter((item) => item.url !== url));
                }} className="absolute right-2 top-2 rounded-lg bg-slate-950/80 p-2 text-white hover:bg-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!retainedGallery.length && !galleryUploads.length && <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500 max-md:border-[#CBD5E1] max-md:text-[#64748B]">No agency gallery photos have been added.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-[#101b2c] p-4 sm:p-6 max-md:border-[#E2E8F0] max-md:bg-white max-md:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white max-md:text-[#071B2B]"><Users className="h-5 w-5 text-emerald-400 max-md:text-[#008F68]" /> Agency agents</h2>
              <p className="mt-1 text-xs text-slate-400 max-md:text-[#64748B]">{profile.agentCount} associated {profile.agentCount === 1 ? "agent" : "agents"}</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-slate-700 max-md:divide-[#E2E8F0]">
            {profile.agents.map((agent) => (
              <div key={agent.id} className="flex flex-wrap items-center gap-3 py-3">
                {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800"><Building2 className="h-5 w-5 text-slate-400" /></span>}
                <div className="min-w-0 flex-1">
                  <Link href={`/agents/${encodeURIComponent(agent.id)}`} className="inline-flex items-center gap-1 font-semibold text-white hover:text-emerald-300 max-md:text-[#101D32]">
                    <span className="truncate">{agent.name}</span>
                    {agent.isVerified && <BadgeCheck aria-label="Verified agent" className="h-4 w-4 text-emerald-400" />}
                  </Link>
                  {agent.city && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{agent.city}</p>}
                </div>
                <button type="button" disabled={removingAgent === agent.id} onClick={() => void handleRemoveAgent(agent.id, agent.name)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 max-md:border-rose-200 max-md:text-rose-700">
                  {removingAgent === agent.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
                </button>
              </div>
            ))}
            {!profile.agents.length && <p className="py-5 text-sm text-slate-400 max-md:text-[#64748B]">No public agent profiles are currently associated with this agency.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-[#101b2c] p-4 sm:p-6 max-md:border-[#E2E8F0] max-md:bg-white max-md:shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white max-md:text-[#071B2B]">Published listings</h2>
              <p className="mt-1 text-xs text-slate-400 max-md:text-[#64748B]">Public active listings from the agency’s associated agents.</p>
            </div>
            <Link href="/agent/listings" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 max-md:border-[#E2E8F0] max-md:text-[#0B2538]"><Pencil className="h-3.5 w-3.5" /> Manage my listings</Link>
          </div>
          {listingsLoading ? (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading published listings…</p>
          ) : listings?.properties.length ? (
            <>
              <p className="mt-4 text-xs text-slate-500 max-md:text-[#64748B]">{listings.pagination.total} published listings</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {listings.properties.map((property) => <PropertyCard key={property.id} property={property} />)}
              </div>
              {listings.pagination.totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button type="button" variant="outline" disabled={listingPage <= 1 || listingsLoading} onClick={() => void changeListingPage(listingPage - 1)}>Previous</Button>
                  <span className="text-sm text-slate-400 max-md:text-[#64748B]">Page {listingPage} of {listings.pagination.totalPages}</span>
                  <Button type="button" variant="outline" disabled={listingPage >= listings.pagination.totalPages || listingsLoading} onClick={() => void changeListingPage(listingPage + 1)}>Next</Button>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400 max-md:border-[#CBD5E1] max-md:text-[#64748B]">{listings ? "No public listings are available for this agency yet." : "Listings could not be loaded."}</p>
          )}
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 pb-6 sm:flex-row">
          <Link href={`/agencies?name=${encodeURIComponent(profile.name)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-5 text-sm font-semibold text-slate-200 hover:border-slate-400 max-md:border-[#E2E8F0] max-md:text-[#0B2538]"><ExternalLink className="h-4 w-4" /> Preview profile</Link>
          <Button type="submit" disabled={saving} className="min-h-11 gap-2 bg-emerald-600 px-6 text-white hover:bg-emerald-700">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} {saving ? "Saving…" : "Save agency profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-300 max-md:text-[#475569]">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} maxLength={name === "description" ? 2000 : undefined} className="mt-2 w-full min-h-11 rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 max-md:border-[#CBD5E1] max-md:bg-white max-md:text-[#101D32]" />
    </label>
  );
}
