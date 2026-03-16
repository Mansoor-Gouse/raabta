import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== "production") global.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Please set MONGODB_URI in environment");
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Community role for member directory filter
export type CommunityRole =
  | "host"
  | "mentor"
  | "investor"
  | "scholar"
  | "community_builder";

// User model (extended for member profiles & verification)
export interface IUser {
  _id: string;
  phone: string;
  name?: string;
  image?: string;
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
  languages?: string[];
  preferredDestinations?: string[];
  company?: string;
  profession?: string;
  communityRoles?: CommunityRole[];
  isVerified?: boolean;
  verificationLevel?: "none" | "basic" | "verified" | "elite";
  /** Who can see this profile's posts tab (default: everyone) */
  profileVisibilityPosts?: "everyone" | "trusted_circle" | "inner_circle";
  /** Who can see this profile's events tab (default: everyone) */
  profileVisibilityEvents?: "everyone" | "trusted_circle" | "inner_circle";
  /** Who can see bio, location, industries, etc. (default: everyone) */
  profileVisibilityBio?: "everyone" | "trusted_circle" | "inner_circle";
  /** Who can see inner/trusted circle members (default: everyone) */
  profileVisibilityCircles?: "everyone" | "trusted_circle" | "inner_circle";
  invitedBy?: mongoose.Types.ObjectId;
  invitationCode?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    image: { type: String },
    fullName: { type: String },
    headline: { type: String },
    bio: { type: String },
    location: { type: String },
    profileImage: { type: String },
    bannerImage: { type: String },
    industries: [{ type: String }],
    interests: [{ type: String }],
    expertise: [{ type: String }],
    concerns: [{ type: String }],
    languages: [{ type: String }],
    preferredDestinations: [{ type: String }],
    company: { type: String },
    profession: { type: String },
    communityRoles: [
      {
        type: String,
        enum: ["host", "mentor", "investor", "scholar", "community_builder"],
      },
    ],
    isVerified: { type: Boolean, default: false },
    verificationLevel: {
      type: String,
      enum: ["none", "basic", "verified", "elite"],
      default: "none",
    },
    profileVisibilityPosts: {
      type: String,
      enum: ["everyone", "trusted_circle", "inner_circle"],
      default: "everyone",
    },
    profileVisibilityEvents: {
      type: String,
      enum: ["everyone", "trusted_circle", "inner_circle"],
      default: "everyone",
    },
    profileVisibilityBio: {
      type: String,
      enum: ["everyone", "trusted_circle", "inner_circle"],
      default: "everyone",
    },
    profileVisibilityCircles: {
      type: String,
      enum: ["everyone", "trusted_circle", "inner_circle"],
      default: "everyone",
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invitationCode: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// DeviceBinding model
export interface IDeviceBinding {
  _id: string;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  createdAt: Date;
}

const DeviceBindingSchema = new mongoose.Schema<IDeviceBinding>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DeviceBindingSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceBinding =
  mongoose.models.DeviceBinding ||
  mongoose.model<IDeviceBinding>("DeviceBinding", DeviceBindingSchema);

// OtpSession for fallback OTP (one-time verification before device bind)
export interface IOtpSession {
  phone: string;
  codeHash: string;
  expiresAt: Date;
}

const OtpSessionSchema = new mongoose.Schema<IOtpSession>(
  {
    phone: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OtpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpSession =
  mongoose.models.OtpSession ||
  mongoose.model<IOtpSession>("OtpSession", OtpSessionSchema);

// PushSubscription for web push
export interface IPushSubscription {
  _id: string;
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}

const PushSubscriptionSchema = new mongoose.Schema<IPushSubscription>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PushSubscriptionModel =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

// Status/Stories (ephemeral, 24h)
// TextOverlay shape: id, text, x, y (0-100), fontSize, fontFamily, color, backgroundColor?, fontWeight?, textAlign?, rotation?
export interface IStatus {
  _id: string;
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  type: "image" | "video";
  visibility?: "everyone" | "inner_circle" | "trusted_circle";
  caption?: string;
  textOverlays?: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    fontWeight?: string;
    textAlign?: string;
    rotation?: number;
    scale?: number;
  }>;
  mediaTransform?: { scale: number; translateX: number; translateY: number };
  expiresAt: Date;
  createdAt: Date;
}

const StatusSchema = new mongoose.Schema<IStatus>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    visibility: {
      type: String,
      enum: ["everyone", "inner_circle", "trusted_circle"],
      default: "everyone",
    },
    caption: { type: String, default: "" },
    textOverlays: [{ type: mongoose.Schema.Types.Mixed }],
    mediaTransform: {
      scale: { type: Number, default: 1 },
      translateX: { type: Number, default: 0 },
      translateY: { type: Number, default: 0 },
    },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StatusModel =
  mongoose.models.Status || mongoose.model<IStatus>("Status", StatusSchema);

// StatusReaction (story reactions: one per user per status, upsert)
export interface IStatusReaction {
  _id: string;
  statusId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reactionType: string;
  createdAt: Date;
}

const StatusReactionSchema = new mongoose.Schema<IStatusReaction>(
  {
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: "Status", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reactionType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
StatusReactionSchema.index({ statusId: 1, userId: 1 }, { unique: true });

export const StatusReactionModel =
  mongoose.models.StatusReaction ||
  mongoose.model<IStatusReaction>("StatusReaction", StatusReactionSchema);

// StatusView (who viewed which story; one record per viewer per status)
export interface IStatusView {
  _id: string;
  statusId: mongoose.Types.ObjectId;
  viewerId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const StatusViewSchema = new mongoose.Schema<IStatusView>(
  {
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: "Status", required: true },
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
StatusViewSchema.index({ statusId: 1, viewerId: 1 }, { unique: true });
StatusViewSchema.index({ statusId: 1, viewedAt: -1 });

export const StatusViewModel =
  mongoose.models.StatusView ||
  mongoose.model<IStatusView>("StatusView", StatusViewSchema);

// Post (feed)
export interface IPost {
  _id: string;
  authorId: mongoose.Types.ObjectId;
  mediaUrls: string[];
  caption?: string;
  visibility: "network" | "friends" | "event-attendees";
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
}

const PostSchema = new mongoose.Schema<IPost>(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrls: [{ type: String }],
    caption: { type: String },
    visibility: {
      type: String,
      enum: ["network", "friends", "event-attendees", "inner_circle", "trusted_circle"],
      default: "network",
    },
    tags: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

export const PostModel =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

// PostLike
export interface IPostLike {
  _id: string;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostLikeSchema = new mongoose.Schema<IPostLike>(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostLikeSchema.index({ userId: 1 });

export const PostLikeModel =
  mongoose.models.PostLike || mongoose.model<IPostLike>("PostLike", PostLikeSchema);

// PostComment
export interface IPostComment {
  _id: string;
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  text: string;
  parentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}

const PostCommentSchema = new mongoose.Schema<IPostComment>(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "PostComment", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostCommentSchema.index({ postId: 1, createdAt: 1 });
PostCommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export const PostCommentModel =
  mongoose.models.PostComment ||
  mongoose.model<IPostComment>("PostComment", PostCommentSchema);

// PostCommentLike (likes on comments)
export interface IPostCommentLike {
  _id: string;
  commentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostCommentLikeSchema = new mongoose.Schema<IPostCommentLike>(
  {
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "PostComment", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostCommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });
PostCommentLikeSchema.index({ commentId: 1 });

export const PostCommentLikeModel =
  mongoose.models.PostCommentLike ||
  mongoose.model<IPostCommentLike>("PostCommentLike", PostCommentLikeSchema);

// PostSave (bookmark)
export interface IPostSave {
  _id: string;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostSaveSchema = new mongoose.Schema<IPostSave>(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostSaveSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostSaveModel =
  mongoose.models.PostSave || mongoose.model<IPostSave>("PostSave", PostSaveSchema);

// Q&A – Questions, Answers, Follows
export type QuestionStatus = "open" | "resolved" | "archived";
export type QuestionContextType = "none" | "event" | "trip" | "retreat" | "umrah" | "hajj" | "profile";

export interface IQuestion {
  _id: string;
  title: string;
  body?: string;
  topics?: string[];
  city?: string;
  contextType: QuestionContextType;
  contextId?: mongoose.Types.ObjectId | null;
  askedByUserId: mongoose.Types.ObjectId;
  isAnonymousToMembers: boolean;
  status: QuestionStatus;
  answerCount: number;
  followerCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const QuestionSchema = new mongoose.Schema<IQuestion>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String },
    topics: [{ type: String }],
    city: { type: String },
    contextType: {
      type: String,
      enum: ["none", "event", "trip", "retreat", "umrah", "hajj", "profile"],
      default: "none",
    },
    contextId: { type: mongoose.Schema.Types.ObjectId },
    askedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymousToMembers: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["open", "resolved", "archived"],
      default: "open",
    },
    answerCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    hasAcceptedAnswer: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ status: 1, createdAt: -1 });
QuestionSchema.index({ contextType: 1, contextId: 1, createdAt: -1 });
QuestionSchema.index({ topics: 1, createdAt: -1 });
QuestionSchema.index({ title: "text", body: "text" });

export const QuestionModel =
  mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);

export interface IAnswer {
  _id: string;
  questionId: mongoose.Types.ObjectId;
  body: string;
  answeredByUserId: mongoose.Types.ObjectId;
  isAnonymousToMembers: boolean;
  isAcceptedSolution: boolean;
  upvoteCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

const AnswerSchema = new mongoose.Schema<IAnswer>(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    body: { type: String, required: true },
    answeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymousToMembers: { type: Boolean, default: false },
    isAcceptedSolution: { type: Boolean, default: false },
    upvoteCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AnswerSchema.index({ questionId: 1, createdAt: 1 });

export const AnswerModel =
  mongoose.models.Answer || mongoose.model<IAnswer>("Answer", AnswerSchema);

export interface IQuestionFollow {
  _id: string;
  questionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  notifyOnNewAnswer: boolean;
  notifyOnSolution: boolean;
  createdAt: Date;
}

const QuestionFollowSchema = new mongoose.Schema<IQuestionFollow>(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    notifyOnNewAnswer: { type: Boolean, default: true },
    notifyOnSolution: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

QuestionFollowSchema.index({ questionId: 1, userId: 1 }, { unique: true });

export const QuestionFollowModel =
  mongoose.models.QuestionFollow ||
  mongoose.model<IQuestionFollow>("QuestionFollow", QuestionFollowSchema);

// CircleRelationship – Inner Circle / Trusted Circle (trust-based, not friend list)
export type CircleType = "TRUSTED" | "INNER";
export type CircleReason =
  | "mentor"
  | "collaborator"
  | "trusted_advisor"
  | "intellectual_companion"
  | "friend";
export interface ICircleRelationship {
  _id: string;
  userId: mongoose.Types.ObjectId;
  relatedUserId: mongoose.Types.ObjectId;
  circleType: CircleType;
  reason?: CircleReason;
  createdAt: Date;
  updatedAt?: Date;
}

const CircleRelationshipSchema = new mongoose.Schema<ICircleRelationship>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    circleType: {
      type: String,
      enum: ["TRUSTED", "INNER"],
      required: true,
    },
    reason: {
      type: String,
      enum: ["mentor", "collaborator", "trusted_advisor", "intellectual_companion", "friend"],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
CircleRelationshipSchema.index({ userId: 1, relatedUserId: 1 }, { unique: true });
CircleRelationshipSchema.index({ userId: 1, circleType: 1 });

export const CircleRelationshipModel =
  mongoose.models.CircleRelationship ||
  mongoose.model<ICircleRelationship>("CircleRelationship", CircleRelationshipSchema);

export const INNER_CIRCLE_MAX = 12;
export const TRUSTED_CIRCLE_MAX = 50;

// Event (curated events & trips) – elite extensions
export type EventCategory = "business" | "philanthropy" | "family" | "religious" | "luxury-trips" | "education";
export interface IEvent {
  _id: string;
  title: string;
  description?: string;
  hostId: mongoose.Types.ObjectId;
  location?: string;
  startAt: Date;
  endAt?: Date;
  capacity?: number;
  type: "event" | "trip" | "retreat" | "umrah" | "hajj";
  coverImage?: string;
  visibility: "network" | "invite-only";
  channelId?: string;
  /** Stream channel type: "team" for event chats (avoids ReadChannel permission issues), "messaging" for legacy */
  channelType?: "messaging" | "team";
  createdAt: Date;
  updatedAt?: Date;
  // Elite event extensions
  category?: EventCategory;
  dressCode?: string;
  etiquette?: string;
  halalMenuDetails?: string;
  prayerFacilityInfo?: string;
  seatingPlanId?: mongoose.Types.ObjectId;
  allowGuestRequest?: boolean;
  allowBringGuest?: boolean;
  /** Event lifecycle: active (default), cancelled, or postponed */
  status?: "active" | "cancelled" | "postponed";
  /** Spotlight / featured for discovery */
  featured?: boolean;
  /** Elite wizard: gathering format, atmosphere, hospitality, special guests, networking intent */
  gatheringFormat?: string;
  atmosphere?: string;
  hospitalityStyle?: string;
  specialGuestsNote?: string;
  networkingIntent?: string;
  /** Cultural / audience: open, men-only, family, business, members-only */
  audienceType?: string;
  /** online = virtual (meeting link); offline = in-person (location + venue) */
  eventFormat?: "online" | "offline";
  /** Venue name for offline events (e.g. "Grand Ballroom") */
  venue?: string;
  /** Join URL for online events (e.g. Zoom/Meet link) */
  meetingLink?: string;
  /** Optional instructions for online join (e.g. "Link shared 24h before") */
  meetingDetails?: string;
  /** Platform for online events: zoom, google-meet, teams, webex, other */
  meetingPlatform?: string;
}

const EventSchema = new mongoose.Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String },
    startAt: { type: Date, required: true },
    endAt: { type: Date },
    capacity: { type: Number },
    type: {
      type: String,
      enum: ["event", "trip", "retreat", "umrah", "hajj"],
      default: "event",
    },
    coverImage: { type: String },
    visibility: {
      type: String,
      enum: ["network", "invite-only"],
      default: "network",
    },
    channelId: { type: String },
    channelType: { type: String, enum: ["messaging", "team"] },
    createdAt: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: ["business", "philanthropy", "family", "religious", "luxury-trips", "education"],
    },
    dressCode: { type: String },
    etiquette: { type: String },
    halalMenuDetails: { type: String },
    prayerFacilityInfo: { type: String },
    seatingPlanId: { type: mongoose.Schema.Types.ObjectId },
    allowGuestRequest: { type: Boolean, default: false },
    allowBringGuest: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "cancelled", "postponed"],
      default: "active",
    },
    featured: { type: Boolean, default: false },
    gatheringFormat: { type: String },
    atmosphere: { type: String },
    hospitalityStyle: { type: String },
    specialGuestsNote: { type: String },
    networkingIntent: { type: String },
    audienceType: { type: String },
    eventFormat: { type: String, enum: ["online", "offline"], default: "offline" },
    venue: { type: String },
    meetingLink: { type: String },
    meetingDetails: { type: String },
    meetingPlatform: { type: String },
  },
  { timestamps: true }
);
EventSchema.index({ startAt: 1 });
EventSchema.index({ featured: 1, startAt: 1 });
EventSchema.index({ status: 1, startAt: 1 });
EventSchema.index({ type: 1, startAt: 1 });
EventSchema.index({ category: 1, startAt: 1 });

export const EventModel =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

// EventAttendee – elite extensions
export type EventAttendeeStatus =
  | "going"
  | "interested"
  | "waitlisted"
  | "declined"
  | "accepted"
  | "request-invite"
  | "invited";
export type NetworkingIntent = "business" | "philanthropy" | "social";
export interface IEventAttendee {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: EventAttendeeStatus;
  createdAt: Date;
  guestOf?: mongoose.Types.ObjectId;
  vipTag?: boolean;
  plusOneApproved?: boolean;
  networkingIntent?: NetworkingIntent;
  tableId?: string;
  checkedInAt?: Date;
  requestNote?: string;
  /** Host-assigned tier: host, distinguished, member, family, or custom */
  guestTier?: string;
}

const EventAttendeeSchema = new mongoose.Schema<IEventAttendee>(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["going", "interested", "waitlisted", "declined", "accepted", "request-invite", "invited"],
      default: "going",
    },
    createdAt: { type: Date, default: Date.now },
    guestOf: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    vipTag: { type: Boolean, default: false },
    plusOneApproved: { type: Boolean, default: false },
    networkingIntent: {
      type: String,
      enum: ["business", "philanthropy", "social"],
    },
    tableId: { type: String },
    checkedInAt: { type: Date },
    requestNote: { type: String },
    guestTier: { type: String },
  },
  { timestamps: true }
);
EventAttendeeSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventAttendeeSchema.index({ userId: 1 });

export const EventAttendeeModel =
  mongoose.models.EventAttendee ||
  mongoose.model<IEventAttendee>("EventAttendee", EventAttendeeSchema);

// Notification – in-app event + circle notifications
export type NotificationType =
  | "event_invite"
  | "event_request_approved"
  | "event_request_rejected"
  | "event_waitlisted"
  | "event_removed"
  | "circle_added"
  | "mutual_inner_circle"
  | "circle_event_invite"
  | "circle_opportunity"
  | "post_like"
  | "post_comment"
  | "story_reaction"
  | "new_post"
  | "new_story";
export interface INotification {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  eventId?: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  statusId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "event_invite",
        "event_request_approved",
        "event_request_rejected",
        "event_waitlisted",
        "event_removed",
        "circle_added",
        "mutual_inner_circle",
        "circle_event_invite",
        "circle_opportunity",
        "post_like",
        "post_comment",
        "story_reaction",
        "new_post",
        "new_story",
        "qa_new_answer",
        "qa_answer_accepted",
      ],
      required: true,
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: "Status" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

// EventEntryPass – for digital pass / QR check-in
export interface IEventEntryPass {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  checkedInAt?: Date;
  createdAt: Date;
}

const EventEntryPassSchema = new mongoose.Schema<IEventEntryPass>(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    checkedInAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
EventEntryPassSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventEntryPassSchema.index({ token: 1 }, { unique: true });

export const EventEntryPassModel =
  mongoose.models.EventEntryPass ||
  mongoose.model<IEventEntryPass>("EventEntryPass", EventEntryPassSchema);

// EventSeatingPlan – tables and assignments
export interface IEventSeatingPlan {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  tables: { id: string; name: string; capacity?: number }[];
  assignments: { userId: string; tableId: string }[];
  createdAt: Date;
  updatedAt?: Date;
}

const EventSeatingPlanSchema = new mongoose.Schema<IEventSeatingPlan>(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    tables: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        capacity: { type: Number },
      },
    ],
    assignments: [
      {
        userId: { type: String, required: true },
        tableId: { type: String, required: true },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
EventSeatingPlanSchema.index({ eventId: 1 }, { unique: true });

export const EventSeatingPlanModel =
  mongoose.models.EventSeatingPlan ||
  mongoose.model<IEventSeatingPlan>("EventSeatingPlan", EventSeatingPlanSchema);

// TripPlan – for curated group trips
export interface ITripPlan {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  destinationOptions: { name: string; votes: number; votedBy: mongoose.Types.ObjectId[] }[];
  selectedHotel?: string;
  activities: { name: string; date?: string }[];
  /** When voting closes; after this or when decided, no new votes. */
  votingDeadline?: Date;
  /** Set by host when they finalize; locks the winning destination. */
  decidedDestination?: string;
  /** When set by host, activities become read-only for everyone. */
  activitiesPublishedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

const TripPlanSchema = new mongoose.Schema<ITripPlan>(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    destinationOptions: [
      {
        name: { type: String, required: true },
        votes: { type: Number, default: 0 },
        votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    selectedHotel: { type: String },
    activities: [{ name: { type: String }, date: { type: String } }],
    votingDeadline: { type: Date },
    decidedDestination: { type: String },
    activitiesPublishedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
TripPlanSchema.index({ eventId: 1 }, { unique: true });

export const TripPlanModel =
  mongoose.models.TripPlan || mongoose.model<ITripPlan>("TripPlan", TripPlanSchema);

// PostEventConnection – people you met at an event
export interface IPostEventConnection {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  metUserId: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const PostEventConnectionSchema = new mongoose.Schema<IPostEventConnection>(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    metUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
PostEventConnectionSchema.index({ eventId: 1, userId: 1, metUserId: 1 }, { unique: true });

export const PostEventConnectionModel =
  mongoose.models.PostEventConnection ||
  mongoose.model<IPostEventConnection>("PostEventConnection", PostEventConnectionSchema);

// Group (interest/city/event channels for chat)
export interface IGroup {
  _id: string;
  name: string;
  description?: string;
  type: "interest" | "city" | "event";
  channelId: string;
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt?: Date;
}

const GroupSchema = new mongoose.Schema<IGroup>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["interest", "city", "event"],
      default: "interest",
    },
    channelId: { type: String, required: true },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
GroupSchema.index({ channelId: 1 }, { unique: true });
GroupSchema.index({ type: 1 });

export const GroupModel =
  mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);

// Invite (for invite-only onboarding)
export interface IInvite {
  _id: string;
  code: string;
  invitedBy: mongoose.Types.ObjectId;
  usedBy?: mongoose.Types.ObjectId;
  usedAt?: Date;
  createdAt: Date;
}

const InviteSchema = new mongoose.Schema<IInvite>(
  {
    code: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const InviteModel =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);

// Block (user blocks another user - app-level, for DMs/channel creation)
export interface IBlock {
  _id: string;
  userId: string;
  blockedUserId: string;
  createdAt: Date;
}

const BlockSchema = new mongoose.Schema<IBlock>(
  {
    userId: { type: String, required: true },
    blockedUserId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
BlockSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });
BlockSchema.index({ userId: 1 });

export const BlockModel =
  mongoose.models.Block || mongoose.model<IBlock>("Block", BlockSchema);

// Report (content/member reports for moderation)
export interface IReport {
  _id: string;
  reporterId: mongoose.Types.ObjectId;
  targetType: "post" | "event" | "user" | "message" | "channel";
  targetId: string;
  reason?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
  updatedAt?: Date;
}

const ReportSchema = new mongoose.Schema<IReport>(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "event", "user", "message", "channel"], required: true },
    targetId: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: ["pending", "reviewed", "resolved", "dismissed"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
ReportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
