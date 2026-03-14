"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const COMMUNITY_ROLES = [
  "host",
  "mentor",
  "investor",
  "scholar",
  "community_builder",
] as const;

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
};

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
  const [tagInput, setTagInput] = useState<
    "industries" | "interests" | "expertise" | "concerns" | "languages" | "destinations" | null
  >(null);
  const [tagValue, setTagValue] = useState("");
  const [saving, setSaving] = useState(false);
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
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      router.refresh();
      router.push("/app/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          placeholder="How you're shown to others (e.g. in events)"
        />
      </div>
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          placeholder="e.g. Founder, Investor"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profession" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Profession
          </label>
          <input
            id="profession"
            type="text"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            placeholder="e.g. Entrepreneur, Investor"
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            placeholder="Company or organization"
          />
        </div>
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm resize-y"
          placeholder="A short bio about you"
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          placeholder="City, Country"
        />
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Profile photo
        </span>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            {profileImage ? (
              <img src={profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-gray-400">?</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileUpload}
              className="hidden"
              aria-label="Upload profile photo"
            />
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingProfile}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {uploadingProfile ? "Uploading…" : "Upload photo"}
            </button>
            <input
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-xs"
              placeholder="Or paste image URL"
            />
          </div>
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cover photo
        </span>
        <div className="space-y-2">
          <div className="aspect-[3/1] max-h-32 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {bannerImage ? (
              <img src={bannerImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">No cover</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
              aria-label="Upload cover photo"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {uploadingBanner ? "Uploading…" : "Upload cover"}
            </button>
            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-xs"
              placeholder="Or paste cover image URL"
            />
          </div>
        </div>
      </div>

      <TagField
        label="Industries"
        tags={industries}
        onAdd={() => setTagInput("industries")}
        onRemove={(i) => removeTag("industries", i)}
      />
      {tagInput === "industries" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("industries", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Add industry"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("industries", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <TagField
        label="Expertise"
        tags={expertise}
        onAdd={() => setTagInput("expertise")}
        onRemove={(i) => removeTag("expertise", i)}
      />
      {tagInput === "expertise" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("expertise", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="e.g. Startup mentoring, Investment"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("expertise", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <TagField
        label="Concerns"
        tags={concerns}
        onAdd={() => setTagInput("concerns")}
        onRemove={(i) => removeTag("concerns", i)}
      />
      {tagInput === "concerns" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("concerns", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="e.g. Education institutions"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("concerns", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <TagField
        label="Interests"
        tags={interests}
        onAdd={() => setTagInput("interests")}
        onRemove={(i) => removeTag("interests", i)}
      />
      {tagInput === "interests" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("interests", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Add interest"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("interests", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <TagField
        label="Languages"
        tags={languages}
        onAdd={() => setTagInput("languages")}
        onRemove={(i) => removeTag("languages", i)}
      />
      {tagInput === "languages" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("languages", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Add language"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("languages", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <TagField
        label="Preferred destinations"
        tags={preferredDestinations}
        onAdd={() => setTagInput("destinations")}
        onRemove={(i) => removeTag("destinations", i)}
      />
      {tagInput === "destinations" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("destinations", tagValue);
              }
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Add destination"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag("destinations", tagValue)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setTagInput(null); setTagValue(""); }}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Community roles
        </span>
        <div className="flex flex-wrap gap-3">
          {COMMUNITY_ROLES.map((role) => (
            <label
              key={role}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <input
                type="checkbox"
                checked={communityRoles.includes(role)}
                onChange={() => toggleCommunityRole(role)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
              <span className="capitalize text-gray-700 dark:text-gray-300">
                {role.replace(/_/g, " ")}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/app/profile")}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TagField({
  label,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            {t}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-0.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
