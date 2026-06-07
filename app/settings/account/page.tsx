'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef, useCallback } from 'react';

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const [usage, setUsage] = useState({ messages: 0, tokens: 0, conversations: 0 });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });

  // Sync form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: (user.unsafeMetadata?.bio as string) || '',
      });
    }
  }, [user]);

  // Fetch usage stats
  useEffect(() => {
    fetch('/api/usage')
      .then((res) => res.json())
      .then((data) => setUsage(data))
      .catch((err) => console.error('Failed to fetch usage:', err));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          bio: formData.bio,
        },
      });
      setEditing(false);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [user, formData]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image must be under 5MB' });
      setTimeout(() => setSaveMessage(null), 4000);
      return;
    }

    setUploadingImage(true);
    setSaveMessage(null);
    try {
      await user.setProfileImage({ file });
      setSaveMessage({ type: 'success', text: 'Profile image updated' });
    } catch (error) {
      console.error('Failed to update profile image:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update profile image' });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setSaveMessage(null), 4000);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user]);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[#1E1B18] rounded w-64 mb-4" />
          <div className="h-4 bg-[#1E1B18] rounded w-96 mb-8" />
          <div className="h-48 bg-[#1E1B18] rounded-2xl mb-6" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-[#1E1B18] rounded-2xl" />
            <div className="h-24 bg-[#1E1B18] rounded-2xl" />
            <div className="h-24 bg-[#1E1B18] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Architectural Dossier</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Manage your sovereign identity and neural subscription</p>
      </div>

      {/* Save Message Toast */}
      {saveMessage && (
        <div
          className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-[#C7B8EA]/10 border-[#C7B8EA]/30 text-[#C7B8EA]'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Profile Info — Editable */}
      <div className="bg-[#12110F] border border-[#66CCCC]/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 relative overflow-hidden group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#66CCCC]/5 to-transparent pointer-events-none" />

        {/* Edit / Save / Cancel Buttons */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 flex gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-[#66CCCC]/10 hover:bg-[#66CCCC]/20 border border-[#66CCCC]/30 rounded-xl text-[#66CCCC] text-[10px] font-black uppercase tracking-widest transition-all duration-300"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  // Reset form to current user data
                  if (user) {
                    setFormData({
                      firstName: user.firstName || '',
                      lastName: user.lastName || '',
                      bio: (user.unsafeMetadata?.bio as string) || '',
                    });
                  }
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[#8C8476] text-[10px] font-black uppercase tracking-widest transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#66CCCC] hover:bg-[#66CCCC]/80 disabled:opacity-50 rounded-xl text-[#0A0908] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10">
          {/* Profile Image — Clickable */}
          <div className="relative group/img cursor-pointer" onClick={() => !editing && fileInputRef.current?.click()}>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover border border-[#66CCCC]/30 shadow-[0_0_30px_rgba(102,204,204,0.1)] transition-all duration-300 group-hover/img:brightness-75"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-[#1E1B18] border border-[#66CCCC]/30 flex items-center justify-center text-[#66CCCC] text-2xl font-black">
                {(user?.firstName?.[0] || 'H').toUpperCase()}
              </div>
            )}
            {/* Overlay indicator */}
            <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
              {uploadingImage ? (
                <svg className="animate-spin h-6 w-6 text-[#66CCCC]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#F5F0E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#66CCCC] text-[#0A0908] px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">Verified</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-4 w-full max-w-md">
                {/* First Name */}
                <div>
                  <label className="block text-[9px] text-[#8C8476] font-black uppercase tracking-widest mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1E1B18] border border-[#66CCCC]/20 rounded-xl text-[#F5F0E8] text-sm font-medium focus:outline-none focus:border-[#66CCCC]/50 focus:ring-1 focus:ring-[#66CCCC]/30 transition-all"
                    placeholder="Enter first name"
                  />
                </div>
                {/* Last Name */}
                <div>
                  <label className="block text-[9px] text-[#8C8476] font-black uppercase tracking-widest mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1E1B18] border border-[#66CCCC]/20 rounded-xl text-[#F5F0E8] text-sm font-medium focus:outline-none focus:border-[#66CCCC]/50 focus:ring-1 focus:ring-[#66CCCC]/30 transition-all"
                    placeholder="Enter last name"
                  />
                </div>
                {/* Bio */}
                <div>
                  <label className="block text-[9px] text-[#8C8476] font-black uppercase tracking-widest mb-1.5">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#1E1B18] border border-[#66CCCC]/20 rounded-xl text-[#F5F0E8] text-sm font-medium focus:outline-none focus:border-[#66CCCC]/50 focus:ring-1 focus:ring-[#66CCCC]/30 transition-all resize-none"
                    placeholder="Tell Holly about yourself..."
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-[#F5F0E8] uppercase tracking-widest">
                  {user?.fullName || 'Sovereign User'}
                </h3>
                {formData.bio && (
                  <p className="text-[#8C8476] text-xs mt-1 max-w-md">{formData.bio}</p>
                )}
                <p className="text-[#8C8476] text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 bg-[#66CCCC]/10 text-[#66CCCC] text-[9px] font-black uppercase tracking-widest border border-[#66CCCC]/20 rounded-lg">
                    Sentient Founding Member
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div>
        <h3 className="text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-4">Neural Consumption Index</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-[#1E1B18] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all hover:border-[#66CCCC]/20 group">
            <div className="text-xl sm:text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#66CCCC] transition-colors">{usage.conversations}</div>
            <div className="text-[8px] sm:text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-1 sm:mt-2">Chronicles</div>
          </div>
          <div className="bg-[#1E1B18] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all hover:border-[#66CCCC]/20 group">
            <div className="text-xl sm:text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#C7B8EA] transition-colors">{usage.messages}</div>
            <div className="text-[8px] sm:text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-1 sm:mt-2">Exchanges</div>
          </div>
          <div className="bg-[#1E1B18] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all hover:border-[#66CCCC]/20 group">
            <div className="text-xl sm:text-3xl font-black text-[#F5F0E8] uppercase tracking-tighter group-hover:text-[#66CCCC] transition-colors">
              {(usage.tokens / 1000).toFixed(1)}K
            </div>
            <div className="text-[8px] sm:text-[9px] text-[#8C8476] font-black uppercase tracking-widest mt-1 sm:mt-2">Neural Bits</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em]">Administrative Protocols</h3>

        <button
          className="block w-full px-6 py-4 bg-[#1E1B18] hover:bg-[#24211D] rounded-2xl border border-white/5 transition-all duration-300 text-left group"
          onClick={() => alert('Subscription management coming soon!')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#66CCCC] transition-colors">Elevate Tier</div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Unlock sovereign architectural features</div>
            </div>
            <span className="px-2.5 py-0.5 bg-[#66CCCC]/10 text-[#66CCCC] text-[8px] font-black uppercase tracking-tighter rounded-md border border-[#66CCCC]/20">Pending</span>
          </div>
        </button>

        <button
          className="block w-full px-6 py-4 bg-[#1E1B18] hover:bg-[#24211D] rounded-2xl border border-white/5 transition-all duration-300 text-left group"
          onClick={() => {
            if (confirm('Export all your conversation data? This may take a moment.')) {
              window.location.href = '/api/export-data';
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#66CCCC] transition-colors">Extract Archive</div>
              <div className="text-[9px] text-[#8C8476] uppercase tracking-widest mt-1">Download a local chronicle of all exchanges</div>
            </div>
            <svg
              className="w-4 h-4 text-[#5C564D] group-hover:text-[#66CCCC] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="pt-8 border-t border-white/5">
        <h3 className="text-[10px] font-black text-[#C7B8EA] uppercase tracking-[0.2em] mb-4">Finality Protocols</h3>
        <button
          onClick={() => {
            if (
              confirm(
                'Delete all conversations? This will permanently delete all your chat history. This cannot be undone!'
              )
            ) {
              fetch('/api/conversations', { method: 'DELETE' })
                .then(() => window.location.reload())
                .catch((err) => alert('Failed to delete conversations'));
            }
          }}
          className="w-full px-6 py-5 bg-[#C7B8EA]/5 hover:bg-[#C7B8EA]/10 rounded-2xl border border-[#C7B8EA]/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] font-black text-[#C7B8EA] uppercase tracking-widest">Collapse All Chronicles</div>
              <div className="text-[9px] text-[#C7B8EA]/60 uppercase tracking-widest mt-1">Permanently sever all neural history and history data</div>
            </div>
            <svg
              className="w-5 h-5 text-[#C7B8EA]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
