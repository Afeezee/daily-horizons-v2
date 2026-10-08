import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Mail, Phone, Globe, Twitter, Linkedin, Facebook, User } from "lucide-react";

export default function AuthorBioCard({ profile, authorName, authorEmail, compact = false }) {
  if (!profile || !profile.bio) return null;

  return (
    <div className={`bg-[var(--muted)] rounded-lg border border-[var(--border)] ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Link
          to={createPageUrl("Author") + `?email=${encodeURIComponent(authorEmail)}&name=${encodeURIComponent(authorName)}`}
          className="shrink-0"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={authorName} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xl font-bold">
              {authorName?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Name and Title */}
          <Link
            to={createPageUrl("Author") + `?email=${encodeURIComponent(authorEmail)}&name=${encodeURIComponent(authorName)}`}
            className="font-bold text-lg hover:text-[var(--accent)] transition-colors"
          >
            {authorName}
          </Link>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{profile.bio}</p>

          {/* Contact Info */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {profile.contact_email && (
              <a href={`mailto:${profile.contact_email}`} className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">{profile.contact_email}</span>
              </a>
            )}
            {profile.phone_number && (
              <a href={`tel:${profile.phone_number}`} className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{profile.phone_number}</span>
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Website</span>
              </a>
            )}
            {profile.twitter_handle && (
              <a href={`https://x.com/${profile.twitter_handle.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {profile.facebook_url && (
              <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}