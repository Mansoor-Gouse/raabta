import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB, User, PostModel, EventAttendeeModel, CircleRelationshipModel, BlockModel } from "@/lib/db";
import { AddToCircleButton } from "@/components/circles/AddToCircleButton";
import { MemberInsights } from "@/components/members/MemberInsights";

type Visibility = "everyone" | "trusted_circle" | "inner_circle";

function canSee(visibility: Visibility | undefined, viewerRelation: "inner" | "trusted" | null): boolean {
  const v = visibility ?? "everyone";
  if (v === "everyone") return true;
  if (v === "trusted_circle") return viewerRelation === "trusted" || viewerRelation === "inner";
  if (v === "inner_circle") return viewerRelation === "inner";
  return false;
}

export async function MemberViewHeader({ profileUserId }: { profileUserId: string }) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  await connectDB();

  const user = await User.findById(profileUserId)
    .select(
      "fullName headline bio location profileImage bannerImage industries interests expertise concerns company profession profileVisibilityPosts profileVisibilityEvents profileVisibilityBio profileVisibilityCircles isVerified verificationLevel name image"
    )
    .lean()
    .exec();
  if (!user) notFound();

  const u = user as unknown as {
    fullName?: string;
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
    profileVisibilityPosts?: Visibility;
    profileVisibilityEvents?: Visibility;
    profileVisibilityBio?: Visibility;
    profileVisibilityCircles?: Visibility;
    isVerified?: boolean;
    verificationLevel?: string;
    name?: string;
    image?: string;
  };

  const displayName = u.fullName || u.name || "Member";
  const avatar = u.profileImage || u.image;
  const profileOid = new mongoose.Types.ObjectId(profileUserId);
  const myId = new mongoose.Types.ObjectId(session.userId);
  const isOwnProfile = session.userId === profileUserId;

  let viewerRelation: "inner" | "trusted" | null = null;
  if (!isOwnProfile) {
    const rel = await CircleRelationshipModel.findOne({
      userId: profileOid,
      relatedUserId: myId,
    })
      .select("circleType")
      .lean()
      .exec();
    const ct = (rel as unknown as { circleType?: string } | null)?.circleType;
    if (ct === "INNER") viewerRelation = "inner";
    else if (ct === "TRUSTED") viewerRelation = "trusted";
  }

  const canSeePosts = isOwnProfile || canSee(u.profileVisibilityPosts, viewerRelation);
  const canSeeEvents = isOwnProfile || canSee(u.profileVisibilityEvents, viewerRelation);
  const canSeeBio = isOwnProfile || canSee(u.profileVisibilityBio, viewerRelation);
  const canSeeCircles = isOwnProfile || canSee(u.profileVisibilityCircles, viewerRelation);

  const isBlocked =
    !isOwnProfile &&
    (await BlockModel.exists({
      $or: [
        { userId: myId, blockedUserId: profileOid },
        { userId: profileOid, blockedUserId: myId },
      ],
    }));

  const [postsCount, eventsCount, myRelationship, theyHaveMeInInner, myInnerCount, myTrustedCount, profileInner, profileTrusted] =
    await Promise.all([
      canSeePosts ? PostModel.countDocuments({ authorId: profileUserId }).exec() : Promise.resolve(0),
      canSeeEvents
        ? EventAttendeeModel.countDocuments({ userId: profileUserId, status: "going" }).exec()
        : Promise.resolve(0),
      isOwnProfile
        ? Promise.resolve(null)
        : CircleRelationshipModel.findOne({ userId: myId, relatedUserId: profileOid }).select("circleType").lean().exec(),
      isOwnProfile
        ? Promise.resolve(null)
        : CircleRelationshipModel.findOne({ userId: profileOid, relatedUserId: myId, circleType: "INNER" }).select("_id").lean().exec(),
      isOwnProfile ? Promise.resolve(0) : CircleRelationshipModel.countDocuments({ userId: myId, circleType: "INNER" }).exec(),
      isOwnProfile ? Promise.resolve(0) : CircleRelationshipModel.countDocuments({ userId: myId, circleType: "TRUSTED" }).exec(),
      canSeeCircles
        ? CircleRelationshipModel.find({ userId: profileOid, circleType: "INNER" })
            .populate("relatedUserId", "fullName name profileImage image headline")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
            .exec()
        : Promise.resolve([]),
      canSeeCircles
        ? CircleRelationshipModel.find({ userId: profileOid, circleType: "TRUSTED" })
            .populate("relatedUserId", "fullName name profileImage image headline")
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

  const currentCircle =
    myRelationship && (myRelationship as unknown as { circleType: string }).circleType === "INNER"
      ? "INNER"
      : myRelationship && (myRelationship as unknown as { circleType: string }).circleType === "TRUSTED"
        ? "TRUSTED"
        : null;
  const mutualInner = currentCircle === "INNER" && !!theyHaveMeInInner;

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

  return (
    <>
      <div
        className="h-32 sm:h-40 bg-[var(--elite-border-light)]"
        style={{
          backgroundImage: u.bannerImage ? `url(${u.bannerImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="px-4 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[var(--elite-radius)] border-4 border-[var(--elite-bg)] bg-[var(--elite-border)] overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="elite-heading text-3xl font-medium text-[var(--elite-text-muted)]">
                  {displayName?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {u.isVerified && (
              <span
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--elite-accent)] flex items-center justify-center text-[var(--elite-on-accent)]"
                title={`Verified: ${u.verificationLevel ?? "member"}`}
                aria-hidden
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
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
                {canSeeBio && u.bio && (
                  <p className="elite-body mt-2 text-sm text-[var(--elite-text-secondary)] whitespace-pre-wrap">
                    {u.bio}
                  </p>
                )}
              </div>
            </div>
            {mutualInner && (
              <span className="elite-body mt-2 inline-flex items-center rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--elite-text)]">
                Mutual Inner Circle
              </span>
            )}
            {(canSeePosts || canSeeEvents) && (
              <div className="flex items-center gap-6 mt-2">
                {canSeePosts && (
                  <div className="flex flex-col items-center">
                    <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                      {postsCount}
                    </span>
                    <span className="elite-body text-xs text-[var(--elite-text-muted)]">posts</span>
                  </div>
                )}
                {canSeeEvents && (
                  <div className="flex flex-col items-center">
                    <span className="elite-heading font-semibold text-base text-[var(--elite-text)] tabular-nums">
                      {eventsCount}
                    </span>
                    <span className="elite-body text-xs text-[var(--elite-text-muted)]">events</span>
                  </div>
                )}
              </div>
            )}
            {!isOwnProfile && (
              <div className="flex flex-nowrap items-center gap-2 mt-3">
                <AddToCircleButton
                  relatedUserId={profileUserId}
                  currentCircle={currentCircle}
                  innerCount={myInnerCount}
                  trustedCount={myTrustedCount}
                  showMessage={!isBlocked}
                />
              </div>
            )}
          </div>
        </div>

        {!isOwnProfile && <MemberInsights memberId={profileUserId} />}

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
                          <img src={m.image} alt="" className="h-8 w-8 rounded-full object-cover" />
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
                {isOwnProfile && (
                  <Link
                    href="/app/profile/circles"
                    className="elite-events mt-1 inline-block text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
                  >
                    View all
                  </Link>
                )}
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
                          <img src={m.image} alt="" className="h-8 w-8 rounded-full object-cover" />
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
                {isOwnProfile && (
                  <Link
                    href="/app/profile/circles"
                    className="elite-events mt-1 inline-block text-sm font-medium text-[var(--elite-accent)] hover:text-[var(--elite-accent-hover)] transition-colors"
                  >
                    View all
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {canSeeBio && (
          <>
            {u.location && (
              <p className="elite-body mt-4 text-sm text-[var(--elite-text-muted)] flex items-center gap-1">
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
                  {u.concerns!.map((c) => (
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
          </>
        )}
      </div>
    </>
  );
}
