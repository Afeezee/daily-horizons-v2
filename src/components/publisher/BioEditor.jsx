import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Upload, User } from "lucide-react";

export default function BioEditor({ profile, onSaved }) {
  const [formData, setFormData] = useState({
    bio: profile?.bio || "",
    contact_email: profile?.contact_email || "",
    phone_number: profile?.phone_number || "",
    website_url: profile?.website_url || "",
    twitter_handle: profile?.twitter_handle || "",
    linkedin_url: profile?.linkedin_url || "",
    facebook_url: profile?.facebook_url || "",
    avatar_url: profile?.avatar_url || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange("avatar_url", file_url);
    setIsUploading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await base44.entities.PublisherProfile.update(profile.id, formData);
    setIsSaving(false);
    if (onSaved) onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Author Bio & Contact Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {formData.avatar_url ? (
            <img src={formData.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--muted)] flex items-center justify-center">
              <User className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
          )}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatarUpload').click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Photo
            </Button>
            <input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Tell readers about yourself — your expertise, interests, and background..."
            rows={4}
          />
        </div>

        {/* Contact Fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact_email">Public Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => handleChange("phone_number", e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="website_url">Website</Label>
            <Input
              id="website_url"
              value={formData.website_url}
              onChange={(e) => handleChange("website_url", e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div>
            <Label htmlFor="twitter_handle">Twitter/X Handle</Label>
            <Input
              id="twitter_handle"
              value={formData.twitter_handle}
              onChange={(e) => handleChange("twitter_handle", e.target.value)}
              placeholder="@yourhandle"
            />
          </div>
          <div>
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              value={formData.linkedin_url}
              onChange={(e) => handleChange("linkedin_url", e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
          <div>
            <Label htmlFor="facebook_url">Facebook URL</Label>
            <Input
              id="facebook_url"
              value={formData.facebook_url}
              onChange={(e) => handleChange("facebook_url", e.target.value)}
              placeholder="https://facebook.com/yourprofile"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Bio & Contact Info
        </Button>
      </CardContent>
    </Card>
  );
}