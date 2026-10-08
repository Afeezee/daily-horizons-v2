import { describe, expect, it } from "vitest";
import { policyFor, ServerOwnedFields } from "../policies";
import type { SessionUser } from "../auth";

const anon: SessionUser | null = null;
const user: SessionUser = {
  id: "u1",
  clerk_id: "clerk1",
  email: "writer@example.com",
  display_name: "W",
  role: "user",
  daily_post_limit_exempt: false,
  is_banned: false,
};
const admin: SessionUser = { ...user, id: "a1", email: "admin@example.com", role: "admin" };

describe("policies", () => {
  it("article list is public", () => {
    expect(policyFor("Article", "list", anon).allow).toBe(true);
    expect(policyFor("Article", "read", anon).allow).toBe(true);
  });
  it("article create needs sign-in", () => {
    expect(policyFor("Article", "create", anon).allow).toBe(false);
    expect(policyFor("Article", "create", user).allow).toBe(true);
  });
  it("article update: own or admin", () => {
    expect(policyFor("Article", "update", user, { created_by: "writer@example.com" }).allow).toBe(true);
    expect(policyFor("Article", "update", user, { created_by: "other@example.com" }).allow).toBe(false);
    expect(policyFor("Article", "update", admin, { created_by: "other@example.com" }).allow).toBe(true);
  });
  it("newsletter create is public, everything else admin-only", () => {
    expect(policyFor("NewsletterSubscriber", "create", anon).allow).toBe(true);
    expect(policyFor("NewsletterSubscriber", "list", anon).allow).toBe(false);
    expect(policyFor("NewsletterSubscriber", "list", user).allow).toBe(false);
    expect(policyFor("NewsletterSubscriber", "list", admin).allow).toBe(true);
  });
  it("article likes list for non-admin is scoped to own", () => {
    const d = policyFor("ArticleLike", "list", user);
    expect(d.allow).toBe(true);
    expect(d.allow && d.scope).toBe("own");
  });
  it("server-owned fields are protected", () => {
    expect(ServerOwnedFields.Article.has("status")).toBe(true);
    expect(ServerOwnedFields.Article.has("views_count")).toBe(true);
    expect(ServerOwnedFields.Article.has("created_by")).toBe(true);
    // Title is author-settable:
    expect(ServerOwnedFields.Article.has("title")).toBe(false);
  });
});
