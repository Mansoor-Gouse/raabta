"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMMUNITY_ROLES = [
  { id: "host", label: "Host", emoji: "🎤" },
  { id: "mentor", label: "Mentor", emoji: "🌟" },
  { id: "investor", label: "Investor", emoji: "💼" },
  { id: "scholar", label: "Scholar", emoji: "📚" },
  { id: "community_builder", label: "Community builder", emoji: "🧩" },
] as const;

export type ProfileVisibility = "everyone" | "trusted_circle" | "inner_circle";

type Initial = {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  profileImage: string;
  bannerImage: string;
  industries: string[];
  interests: string[];
  expertise: string[];
  concerns: string[];
  languages: string[];
  preferredDestinations: string[];
  company: string;
  profession: string;
  communityRoles: string[];
  profileVisibilityPosts: ProfileVisibility;
  profileVisibilityEvents: ProfileVisibility;
  profileVisibilityBio: ProfileVisibility;
  profileVisibilityCircles: ProfileVisibility;
};

const inputBase =
  "w-full rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)] focus:border-transparent hover:border-[var(--elite-accent-muted)]";

function FormSection({
  icon,
  title,
  subtitle,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--elite-border)] bg-[var(--elite-card)] p-5 sm:p-6 transition-all duration-200 hover:border-[var(--elite-accent-muted)]/50 ${className}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--elite-surface)] text-[var(--elite-accent)] border border-[var(--elite-border)]">
          {icon}
        </span>
        <div>
          <h2 className="elite-heading text-base font-semibold text-[var(--elite-text)]">{title}</h2>
          {subtitle && (
            <p className="elite-body text-xs text-[var(--elite-text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--elite-surface)] text-[var(--elite-text-muted)]">
      {children}
    </span>
  );
}

export function ProfileEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.fullName);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [location, setLocation] = useState(initial.location);
  const [profileImage, setProfileImage] = useState(initial.profileImage);
  const [bannerImage, setBannerImage] = useState(initial.bannerImage);
  const [industries, setIndustries] = useState(initial.industries);
  const [interests, setInterests] = useState(initial.interests);
  const [expertise, setExpertise] = useState(initial.expertise);
  const [concerns, setConcerns] = useState(initial.concerns);
  const [languages, setLanguages] = useState(initial.languages);
  const [preferredDestinations, setPreferredDestinations] = useState(
    initial.preferredDestinations
  );
  const [company, setCompany] = useState(initial.company);
  const [profession, setProfession] = useState(initial.profession);
  const [communityRoles, setCommunityRoles] = useState(initial.communityRoles);
  const [profileVisibilityPosts, setProfileVisibilityPosts] = useState<ProfileVisibility>(initial.profileVisibilityPosts);
  const [profileVisibilityEvents, setProfileVisibilityEvents] = useState<ProfileVisibility>(initial.profileVisibilityEvents);
  const [profileVisibilityBio, setProfileVisibilityBio] = useState<ProfileVisibility>(initial.profileVisibilityBio);
  const [profileVisibilityCircles, setProfileVisibilityCircles] = useState<ProfileVisibility>(initial.profileVisibilityCircles);
  const [tagInput, setTagInput] = useState<
    "industries" | "interests" | "expertise" | "concerns" | "languages" | "destinations" | null
  >(null);
  const [tagValue, setTagValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleProfileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setUploadingProfile(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "profile");
      const res = await fetch("/api/me/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProfileImage(data.profileImage ?? profileImage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile photo upload failed");
    } finally {
      setUploadingProfile(false);
      e.target.value = "";
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setUploadingBanner(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "banner");
      const res = await fetch("/api/me/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBannerImage(data.bannerImage ?? bannerImage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover photo upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  }

  function addTag(
    field: "industries" | "interests" | "expertise" | "concerns" | "languages" | "destinations",
    value: string
  ) {
    const v = value.trim();
    if (!v) return;
    if (field === "industries" && !industries.includes(v)) setIndustries([...industries, v]);
    if (field === "interests" && !interests.includes(v)) setInterests([...interests, v]);
    if (field === "expertise" && !expertise.includes(v)) setExpertise([...expertise, v]);
    if (field === "concerns" && !concerns.includes(v)) setConcerns([...concerns, v]);
    if (field === "languages" && !languages.includes(v)) setLanguages([...languages, v]);
    if (field === "destinations" && !preferredDestinations.includes(v))
      setPreferredDestinations([...preferredDestinations, v]);
    setTagInput(null);
    setTagValue("");
  }

  function removeTag(
    field: "industries" | "interests" | "expertise" | "concerns" | "languages" | "destinations",
    index: number
  ) {
    if (field === "industries") setIndustries(industries.filter((_, i) => i !== index));
    if (field === "interests") setInterests(interests.filter((_, i) => i !== index));
    if (field === "expertise") setExpertise(expertise.filter((_, i) => i !== index));
    if (field === "concerns") setConcerns(concerns.filter((_, i) => i !== index));
    if (field === "languages") setLanguages(languages.filter((_, i) => i !== index));
    if (field === "destinations")
      setPreferredDestinations(preferredDestinations.filter((_, i) => i !== index));
  }

  function toggleCommunityRole(role: string) {
    setCommunityRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName?.trim() || undefined,
          name: fullName?.trim() || undefined,
          headline: headline || undefined,
          bio: bio || undefined,
          location: location || undefined,
          profileImage: profileImage || undefined,
          bannerImage: bannerImage || undefined,
          industries,
          interests,
          expertise,
          concerns,
          languages,
          preferredDestinations,
          company: company?.trim() || undefined,
          profession: profession?.trim() || undefined,
          communityRoles,
          profileVisibilityPosts,
          profileVisibilityEvents,
          profileVisibilityBio,
          profileVisibilityCircles,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => router.push("/app/profile"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const IconUser = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  const IconImage = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  const IconBriefcase = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  const IconMap = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const IconTag = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
  const IconSparkles = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
  const IconPlus = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
  const IconCheck = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-[fadeIn_0.2s_ease-out]"
          role="alert"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          {error}
        </div>
      )}

      {saved && (
        <div
          className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400 animate-[fadeIn_0.3s_ease-out]"
          role="status"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <IconCheck />
          </span>
          <span className="font-medium">Saved! Taking you back to your profile…</span>
        </div>
      )}

      <FormSection
        icon={<IconUser />}
        title="Basics"
        subtitle="How you appear to the network"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <FieldIcon><IconUser /></FieldIcon>
            <div className="flex-1 min-w-0">
              <label htmlFor="fullName" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputBase}
                placeholder="How you're shown (e.g. in events)"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <FieldIcon><IconBriefcase /></FieldIcon>
            <div className="flex-1 min-w-0">
              <label htmlFor="headline" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Headline</label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className={inputBase}
                placeholder="e.g. Founder, Investor"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <FieldIcon><IconBriefcase /></FieldIcon>
              <div className="flex-1 min-w-0">
                <label htmlFor="profession" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Profession</label>
                <input
                  id="profession"
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className={inputBase}
                  placeholder="e.g. Entrepreneur"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <FieldIcon><IconBriefcase /></FieldIcon>
              <div className="flex-1 min-w-0">
                <label htmlFor="company" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Company</label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputBase}
                  placeholder="Company or org"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <FieldIcon><IconMap /></FieldIcon>
            <div className="flex-1 min-w-0">
              <label htmlFor="location" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputBase}
                placeholder="City, Country"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <FieldIcon>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </FieldIcon>
            <div className="flex-1 min-w-0">
              <label htmlFor="bio" className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1.5">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className={`${inputBase} resize-y`}
                placeholder="A short bio about you"
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={<IconImage />}
        title="Photos"
        subtitle="Profile & cover — click to upload or paste a URL"
      >
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-24 h-24 rounded-xl border-2 border-[var(--elite-border)] bg-[var(--elite-surface)] overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-transparent focus-within:ring-[var(--elite-accent)] transition-all">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-[var(--elite-text-muted)]">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <input ref={profileInputRef} type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" aria-hidden />
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                disabled={uploadingProfile}
                className="elite-events inline-flex items-center gap-2 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] px-4 py-2.5 text-sm font-medium text-[var(--elite-text)] hover:bg-[var(--elite-accent)] hover:text-[var(--elite-on-accent)] hover:border-[var(--elite-accent)] disabled:opacity-50 transition-all duration-200"
              >
                {uploadingProfile ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <IconImage />
                    Upload photo
                  </>
                )}
              </button>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className={`${inputBase} py-2 text-xs`}
                placeholder="Or paste image URL"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="aspect-[3/1] max-h-28 rounded-xl border-2 border-[var(--elite-border)] bg-[var(--elite-surface)] overflow-hidden flex items-center justify-center">
              {bannerImage ? (
                <img src={bannerImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[var(--elite-text-muted)] text-sm">No cover yet</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" aria-hidden />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="elite-events inline-flex items-center gap-2 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] px-4 py-2 text-sm font-medium text-[var(--elite-text)] hover:bg-[var(--elite-accent)] hover:text-[var(--elite-on-accent)] hover:border-[var(--elite-accent)] disabled:opacity-50 transition-all duration-200"
              >
                {uploadingBanner ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <IconImage />
                )}
                {uploadingBanner ? "Uploading…" : "Upload cover"}
              </button>
              <input
                type="url"
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                className={`flex-1 min-w-[180px] ${inputBase} py-2 text-xs`}
                placeholder="Or paste cover URL"
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={<IconTag />}
        title="Tags & topics"
        subtitle="Add industries, interests, expertise and more — they help others find you"
      >
        <div className="space-y-5">
          <TagField label="Industries" icon="🏭" tags={industries} onAdd={() => setTagInput("industries")} onRemove={(i) => removeTag("industries", i)} />
          {tagInput === "industries" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("industries", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="Add industry" />
          )}
          <TagField label="Interests" icon="💡" tags={interests} onAdd={() => setTagInput("interests")} onRemove={(i) => removeTag("interests", i)} />
          {tagInput === "interests" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("interests", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="Add interest" />
          )}
          <TagField label="Expertise" icon="🎯" tags={expertise} onAdd={() => setTagInput("expertise")} onRemove={(i) => removeTag("expertise", i)} />
          {tagInput === "expertise" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("expertise", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="e.g. Startup mentoring" />
          )}
          <TagField label="Concerns" icon="🤔" tags={concerns} onAdd={() => setTagInput("concerns")} onRemove={(i) => removeTag("concerns", i)} />
          {tagInput === "concerns" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("concerns", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="e.g. Education" />
          )}
          <TagField label="Languages" icon="🌐" tags={languages} onAdd={() => setTagInput("languages")} onRemove={(i) => removeTag("languages", i)} />
          {tagInput === "languages" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("languages", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="Add language" />
          )}
          <TagField label="Preferred destinations" icon="✈️" tags={preferredDestinations} onAdd={() => setTagInput("destinations")} onRemove={(i) => removeTag("destinations", i)} />
          {tagInput === "destinations" && (
            <TagInputRow value={tagValue} onChange={setTagValue} onAdd={() => addTag("destinations", tagValue)} onCancel={() => { setTagInput(null); setTagValue(""); }} placeholder="Add destination" />
          )}
        </div>
      </FormSection>

      <FormSection
        icon={<IconSparkles />}
        title="Community roles"
        subtitle="What you bring to the table — select all that apply"
      >
        <div className="flex flex-wrap gap-2">
          {COMMUNITY_ROLES.map(({ id, label, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleCommunityRole(id)}
              className={`elite-events inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                communityRoles.includes(id)
                  ? "border-[var(--elite-accent)] bg-[var(--elite-accent)] text-[var(--elite-on-accent)] shadow-sm"
                  : "border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] hover:bg-[var(--elite-surface)]"
              }`}
            >
              <span className="text-base" aria-hidden>{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        }
        title="Profile visibility"
        subtitle="Who can see each section when they view your profile. Posts: also used as the default when you create a new post (you can change it per post)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1">Posts</label>
            <select
              value={profileVisibilityPosts}
              onChange={(e) => setProfileVisibilityPosts(e.target.value as ProfileVisibility)}
              className={`${inputBase} py-2.5`}
            >
              <option value="everyone">Everyone</option>
              <option value="trusted_circle">Trusted circle</option>
              <option value="inner_circle">Inner circle only</option>
            </select>
          </div>
          <div>
            <label className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1">Events</label>
            <select
              value={profileVisibilityEvents}
              onChange={(e) => setProfileVisibilityEvents(e.target.value as ProfileVisibility)}
              className={`${inputBase} py-2.5`}
            >
              <option value="everyone">Everyone</option>
              <option value="trusted_circle">Trusted circle</option>
              <option value="inner_circle">Inner circle only</option>
            </select>
          </div>
          <div>
            <label className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1">Bio & tags</label>
            <select
              value={profileVisibilityBio}
              onChange={(e) => setProfileVisibilityBio(e.target.value as ProfileVisibility)}
              className={`${inputBase} py-2.5`}
            >
              <option value="everyone">Everyone</option>
              <option value="trusted_circle">Trusted circle</option>
              <option value="inner_circle">Inner circle only</option>
            </select>
          </div>
          <div>
            <label className="elite-body block text-xs font-medium text-[var(--elite-text-muted)] mb-1">Circles</label>
            <select
              value={profileVisibilityCircles}
              onChange={(e) => setProfileVisibilityCircles(e.target.value as ProfileVisibility)}
              className={`${inputBase} py-2.5`}
            >
              <option value="everyone">Everyone</option>
              <option value="trusted_circle">Trusted circle</option>
              <option value="inner_circle">Inner circle only</option>
            </select>
          </div>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="elite-events inline-flex items-center gap-2 rounded-xl bg-[var(--elite-accent)] text-[var(--elite-on-accent)] px-6 py-3 text-sm font-semibold hover:bg-[var(--elite-accent-hover)] disabled:opacity-50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--elite-bg)]"
        >
          {saving ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving…
            </>
          ) : saved ? (
            <>
              <IconCheck />
              Saved!
            </>
          ) : (
            <>
              <IconCheck />
              Save profile
            </>
          )}
        </button>
        <Link
          href="/app/profile"
          className="elite-events inline-flex items-center gap-2 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] px-5 py-3 text-sm font-medium hover:border-[var(--elite-accent-muted)] transition-all duration-200"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function TagField({
  label,
  icon,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  icon: string;
  tags: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="elite-body text-sm font-medium text-[var(--elite-text)] flex items-center gap-1.5">
          <span aria-hidden>{icon}</span>
          {label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="elite-events inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--elite-border)] bg-transparent px-2.5 py-1.5 text-xs font-medium text-[var(--elite-accent)] hover:bg-[var(--elite-accent)] hover:text-[var(--elite-on-accent)] hover:border-[var(--elite-accent)] transition-all duration-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="elite-events inline-flex items-center gap-1.5 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] pl-3 pr-1.5 py-1 text-xs font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors group"
          >
            {t}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="rounded-full p-0.5 text-[var(--elite-text-muted)] hover:bg-red-500/20 hover:text-red-500 transition-colors"
              aria-label={`Remove ${t}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function TagInputRow({
  value,
  onChange,
  onAdd,
  onCancel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2 animate-[fadeIn_0.2s_ease-out]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        className="flex-1 rounded-xl border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-2 text-sm text-[var(--elite-text)] placeholder-[var(--elite-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--elite-accent)]"
        placeholder={placeholder}
        autoFocus
      />
      <button type="button" onClick={onAdd} className="elite-events rounded-xl bg-[var(--elite-accent)] text-[var(--elite-on-accent)] px-4 py-2 text-sm font-medium hover:bg-[var(--elite-accent-hover)] transition-colors">
        Add
      </button>
      <button type="button" onClick={onCancel} className="elite-events rounded-xl border border-[var(--elite-border)] px-4 py-2 text-sm text-[var(--elite-text-muted)] hover:bg-[var(--elite-surface)] transition-colors">
        Cancel
      </button>
    </div>
  );
}
