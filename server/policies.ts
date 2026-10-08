import type { SessionUser } from "./auth";
import { schema } from "./db";

export type EntityName =
  | "Article"
  | "Comment"
  | "ArticleLike"
  | "SavedArticle"
  | "DigestPreference"
  | "PublisherProfile"
  | "NewsletterSubscriber"
  | "User";

export type ActionName = "read" | "list" | "create" | "update" | "delete";

export type Table =
  | typeof schema.articles
  | typeof schema.comments
  | typeof schema.articleLikes
  | typeof schema.savedArticles
  | typeof schema.digestPreferences
  | typeof schema.publisherProfiles
  | typeof schema.newsletterSubscribers
  | typeof schema.users;

export const EntityTable: Record<EntityName, Table> = {
  Article: schema.articles,
  Comment: schema.comments,
  ArticleLike: schema.articleLikes,
  SavedArticle: schema.savedArticles,
  DigestPreference: schema.digestPreferences,
  PublisherProfile: schema.publisherProfiles,
  NewsletterSubscriber: schema.newsletterSubscribers,
  User: schema.users,
};

/**
 * Fields the generic entity route must never accept from a client. These are
 * mutated only by named endpoints (submissions, counters, admin actions).
 */
export const ServerOwnedFields: Record<EntityName, Set<string>> = {
  Article: new Set([
    "status",
    "views_count",
    "likes_count",
    "comments_count",
    "created_by",
    "is_agent_authored",
    "moderation_notes",
    "ready_to_publish",
    "expert_review_required",
    "image_source",
    "image_source_ref",
    "published_date",
  ]),
  Comment: new Set(["created_by", "likes_count"]),
  ArticleLike: new Set(["created_by"]),
  SavedArticle: new Set(["created_by"]),
  DigestPreference: new Set(["created_by"]),
  PublisherProfile: new Set(["created_by", "is_approved"]),
  NewsletterSubscriber: new Set([
    "unsubscribe_token",
    "brevo_contact_id",
    "is_active",
    "created_by",
  ]),
  User: new Set([
    "clerk_id",
    "email",
    "role",
    "daily_post_limit_exempt",
    "is_banned",
    "created_by",
  ]),
};

export type PolicyDecision =
  | { allow: true; scope?: "own" }
  | { allow: false; reason: string };

export const Allow = (scope?: "own"): PolicyDecision => ({ allow: true, scope });
export const Deny = (reason: string): PolicyDecision => ({ allow: false, reason });

/**
 * Per-entity authorisation. Returns Allow() for anonymous public read, or
 * Allow("own") when the generic query layer must filter by created_by. The
 * generic /api/entities router honours the scope.
 */
export function policyFor(
  entity: EntityName,
  action: ActionName,
  user: SessionUser | null,
  record?: { created_by?: string | null }
): PolicyDecision {
  const isOwner =
    !!user && !!record?.created_by && record.created_by.toLowerCase() === user.email.toLowerCase();
  const admin = user?.role === "admin";

  switch (entity) {
    case "Article":
      if (action === "read" || action === "list") return Allow();
      if (action === "create") return user ? Allow() : Deny("sign in to publish");
      if (action === "update" || action === "delete") {
        return admin || isOwner ? Allow() : Deny("not your article");
      }
      break;

    case "Comment":
      if (action === "read" || action === "list") return Allow();
      if (action === "create") return user ? Allow() : Deny("sign in to comment");
      if (action === "update" || action === "delete") {
        return admin || isOwner ? Allow() : Deny("not your comment");
      }
      break;

    case "ArticleLike":
    case "SavedArticle":
    case "DigestPreference":
      if (!user) return Deny("sign in required");
      if (action === "list") return admin ? Allow() : Allow("own");
      if (action === "read" || action === "update" || action === "delete") {
        return admin || isOwner ? Allow() : Deny("not yours");
      }
      if (action === "create") return Allow();
      break;

    case "PublisherProfile":
      if (action === "read" || action === "list") return Allow();
      if (!user) return Deny("sign in required");
      if (action === "create") return Allow();
      if (action === "update" || action === "delete") {
        return admin || isOwner ? Allow() : Deny("not your profile");
      }
      break;

    case "NewsletterSubscriber":
      // Create is public (section 3.2 F4 fix). Everything else admin-only;
      // the public unsubscribe path uses a signed token, not this route.
      if (action === "create") return Allow();
      return admin ? Allow() : Deny("admin only");

    case "User":
      if (!user) return Deny("sign in required");
      if (admin) return Allow();
      if (action === "read" || action === "list") return Allow("own");
      return Deny("admin only");
  }
  return Deny("not permitted");
}
