import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB, User, CircleRelationshipModel } from "@/lib/db";
import { AddToCircleButton } from "@/components/circles/AddToCircleButton";
import { MemberInsights } from "@/components/members/MemberInsights";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getSession();
  if (!session?.isLoggedIn) notFound();
  const { userId: profileUserId } = await params;
  await connectDB();
  const user = await User.findById(profileUserId)
    .select(
      "fullName headline bio location profileImage bannerImage industries interests expertise concerns company profession languages preferredDestinations communityRoles isVerified verificationLevel name image createdAt"
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
    name?: string;
    image?: string;
    isVerified?: boolean;
    verificationLevel?: string;
  };

  const displayName = u.fullName || u.name || "Member";
  const avatar = u.profileImage || u.image;

  const profileOid = new mongoose.Types.ObjectId(profileUserId);
  const myId = new mongoose.Types.ObjectId(session.userId);
  const isOwnProfile = session.userId === profileUserId;

  const [
    myRelationship,
    theyHaveMeInInner,
    myInnerCount,
    myTrustedCount,
    profileInner,
    profileTrusted,
  ] = await Promise.all([
    CircleRelationshipModel.findOne({
      userId: myId,
      relatedUserId: profileOid,
    })
      .select("circleType")
      .lean()
      .exec(),
    CircleRelationshipModel.findOne({
      userId: profileOid,
      relatedUserId: myId,
      circleType: "INNER",
    })
      .select("_id")
      .lean()
      .exec(),
    CircleRelationshipModel.countDocuments({ userId: myId, circleType: "INNER" }).exec(),
    CircleRelationshipModel.countDocuments({ userId: myId, circleType: "TRUSTED" }).exec(),
    CircleRelationshipModel.find({ userId: profileOid, circleType: "INNER" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec(),
    CircleRelationshipModel.find({ userId: profileOid, circleType: "TRUSTED" })
      .populate("relatedUserId", "fullName name profileImage image headline")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
      .exec(),
  ]);

  const currentCircle = myRelationship
    ? (myRelationship as unknown as { circleType: string }).circleType === "INNER"
      ? "INNER"
      : "TRUSTED"
    : null;
  const mutualInner =
    currentCircle === "INNER" && !!theyHaveMeInInner;

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
    const x = (r.relatedUserId as unknown as { _id: mongoose.Types.ObjectId; fullName?: string; name?: string; profileImage?: string; image?: string; headline?: string });
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
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div
        className="h-32 sm:h-40 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800"
        style={{
          backgroundImage: u.bannerImage
            ? `url(${u.bannerImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="px-4 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-medium text-gray-500 dark:text-gray-400">
                  {displayName?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {u.isVerified && (
              <span
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white"
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
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </h1>
            {u.headline && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {u.headline}
              </p>
            )}
            {mutualInner && (
              <span className="mt-2 inline-flex items-center rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Mutual Inner Circle
              </span>
            )}
            {!isOwnProfile && (
              <AddToCircleButton
                relatedUserId={profileUserId}
                currentCircle={currentCircle}
                innerCount={myInnerCount}
                trustedCount={myTrustedCount}
              />
            )}
            {isOwnProfile && (
              <Link
                href={`/app/new?userId=${profileUserId}`}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Message
              </Link>
            )}
          </div>
        </div>

        {!isOwnProfile && <MemberInsights memberId={profileUserId} />}

        {(innerMembers.length > 0 || trustedMembers.length > 0) && (
          <div className="mt-6 space-y-4">
            {innerMembers.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Inner Circle
                </h3>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {innerMembers.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/app/members/${m.id}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        {m.image ? (
                          <img
                            src={m.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                        <span className="text-gray-900 dark:text-white">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {isOwnProfile && (
                  <Link
                    href="/app/profile/circles"
                    className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View all
                  </Link>
                )}
              </div>
            )}
            {trustedMembers.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Trusted Circle
                </h3>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {trustedMembers.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/app/members/${m.id}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        {m.image ? (
                          <img
                            src={m.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-600 dark:bg-gray-300 dark:text-gray-700">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                        <span className="text-gray-900 dark:text-white">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {isOwnProfile && (
                  <Link
                    href="/app/profile/circles"
                    className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View all
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {u.bio && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {u.bio}
          </p>
        )}
        {u.location && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {u.location}
          </p>
        )}

        {(u.industries?.length ?? 0) > 0 && (
          <div className="mt-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Industries
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.industries!.map((i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.interests?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Interests
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {u.interests!.map((i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-medium"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.expertise?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Expertise
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.expertise ?? []).map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.concerns?.length ?? 0) > 0 && (
          <div className="mt-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Concerns
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {(u.concerns ?? []).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-3 py-1 text-xs font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {(u.company || u.profession) && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {u.profession}
            {u.profession && u.company && " at "}
            {u.company}
          </p>
        )}
      </div>
    </div>
  );
}
