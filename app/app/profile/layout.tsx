import Link from "next/link";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB, User, PostModel, EventAttendeeModel, CircleRelationshipModel } from "@/lib/db";
import { ProfileTabs } from "./ProfileTabs";
import { EditableProfileAvatar } from "./EditableProfileAvatar";
import { EditableCoverImage } from "./EditableCoverImage";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  await connectDB();
  const user = await User.findById(session.userId)
    .select(
      "fullName name headline bio location profileImage bannerImage industries interests expertise concerns company profession isVerified verificationLevel image"
    )
    .lean()
    .exec();
  if (!user) redirect("/login");

  const [postsCount, eventsCount, profileInner, profileTrusted] = await Promise.all([
    PostModel.countDocuments({ authorId: session.userId }).exec(),
    EventAttendeeModel.countDocuments({ userId: session.userId, status: "going" }).exec(),
    CircleRelationshipModel.find({ userId: new mongoose.Types.ObjectId(session.userId), circleType: "INNER" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: new mongoose.Types.ObjectId(session.userId), circleType: "TRUSTED" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec(),
  ]);

  type Populated = {
    relatedUserId: {
      _id: mongoose.Types.ObjectId;
      fullName?: string;
      name?: string;
      profileImage?: string;
      image?: string;
      headline?: string;
    };
  };
  const toMember = (r: Populated) => {
    const x = r.relatedUserId as unknown as {
      _id: mongoose.Types.ObjectId;
      fullName?: string;
      name?: string;
      profileImage?: string;
      image?: string;
      headline?: string;
    };
    return {
      id: String(x._id),
      name: x.fullName || x.name || "Member",
      image: x.profileImage || x.image,
      headline: x.headline,
    };
  };
  const innerMembers = (profileInner as unknown as Populated[]).map(toMember);
  const trustedMembers = (profileTrusted as unknown as Populated[]).map(toMember);

  const u = user as unknown as {
    fullName?: string;
    name?: string;
    headline?: string;
    bio?: string;
    location?: string;
    profileImage?: string;
    bannerImage?: string;
    industries?: string[];
    interests?: string[];
    expertise?: string[];
    concerns?: string[];
    company?: string;
    profession?: string;
    isVerified?: boolean;
    verificationLevel?: string;
    image?: string;
  };

  const displayName = u.fullName || u.name || session.phone || "Profile";
  const avatar = u.profileImage || u.image;

  return (
    <div className="elite-events flex-1 overflow-y-auto min-h-full bg-[var(--elite-bg)] no-scrollbar">
      <EditableCoverImage bannerImage={u.bannerImage} />
      <div className="px-4 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <EditableProfileAvatar
            profileImage={avatar}
            displayName={displayName}
            isVerified={u.isVerified}
            verificationLevel={u.verificationLevel}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="elite-heading text-xl font-semibold text-[var(--elite-text)] truncate">
                  {displayName}
                </h1>
                {u.headline && (
                  <p className="elite-body text-sm text-[var(--elite-text-secondary)] mt-0.5">
                    {u.headline}
                  </p>
                )}
              </div>
              <Link
                href="/app/profile/edit"
                className="elite-events shrink-0 flex items-center justify-center w-10 h-10 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors duration-[var(--elite-transition)]"
                aria-label="Edit profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex flex-col items-center">
                <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                  {postsCount}
                </span>
                <span className="elite-body text-xs text-[var(--elite-text-muted)]">posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                  {eventsCount}
                </span>
                <span className="elite-body text-xs text-[var(--elite-text-muted)]">events</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="elite-heading font-semibold text-base text-[var(--elite-text)]">—</span>
                <span className="elite-body text-xs text-[var(--elite-text-muted)]">groups</span>
              </div>
            </div>
          </div>
        </div>

        {(innerMembers.length > 0 || trustedMembers.length > 0) && (
          <div className="mt-6 space-y-4">
            {innerMembers.length > 0 && (
              <div>
                <h3 className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
                  Inner Circle
                </h3>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {innerMembers.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/app/members/${m.id}`}
                        className="elite-events flex items-center gap-2 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1.5 text-sm text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors"
                      >
                        {m.image ? (
                          <img
                            src={m.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="elite-body flex h-8 w-8 items-center justify-center rounded-full bg-[var(--elite-border)] text-xs font-medium text-[var(--elite-text-secondary)]">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                        <span className="elite-body text-[var(--elite-text)]">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/app/profile/circles"
                  className="elite-events mt-1 inline-block text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
                >
                  View all
                </Link>
              </div>
            )}
            {trustedMembers.length > 0 && (
              <div>
                <h3 className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
                  Trusted Circle
                </h3>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {trustedMembers.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/app/members/${m.id}`}
                        className="elite-events flex items-center gap-2 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1.5 text-sm text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors"
                      >
                        {m.image ? (
                          <img
                            src={m.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="elite-body flex h-8 w-8 items-center justify-center rounded-full bg-[var(--elite-border)] text-xs font-medium text-[var(--elite-text-secondary)]">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                        <span className="elite-body text-[var(--elite-text)]">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/app/profile/circles"
                  className="elite-events mt-1 inline-block text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
                >
                  View all
                </Link>
              </div>
            )}
          </div>
        )}

        {u.bio && (
          <p className="elite-body mt-4 text-sm text-[var(--elite-text-secondary)] whitespace-pre-wrap">
            {u.bio}
          </p>
        )}
        {u.location && (
          <p className="elite-body mt-2 text-sm text-[var(--elite-text-muted)] flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {u.location}
          </p>
        )}

        {(u.industries?.length ?? 0) > 0 && (
          <div className="mt-4">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Industries
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.industries!.map((i) => (
                <span
                  key={i}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.interests?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Interests
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.interests!.map((i) => (
                <span
                  key={i}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text)]"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.expertise?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Expertise
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.expertise ?? []).map((e) => (
                <span
                  key={e}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.concerns?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="elite-body text-xs font-medium uppercase tracking-wide text-[var(--elite-text-muted)]">
              Concerns
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.concerns ?? []).map((c) => (
                <span
                  key={c}
                  className="elite-body inline-flex items-center rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-3 py-1 text-xs font-medium text-[var(--elite-text-secondary)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.company || u.profession) && (
          <p className="elite-body mt-3 text-sm text-[var(--elite-text-secondary)]">
            {u.profession}
            {u.profession && u.company && " at "}
            {u.company}
          </p>
        )}
      </div>
      <ProfileTabs />
      {children}
    </div>
  );
}
