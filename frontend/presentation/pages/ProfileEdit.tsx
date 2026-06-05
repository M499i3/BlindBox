import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import UserAvatar from '@/frontend/presentation/components/UserAvatar';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';
import { updateProfile } from '@/frontend/infrastructure/api/profileApi';
import { uploadImageToStorage } from '@/frontend/infrastructure/storage/supabaseStorage';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { avatarDataUrl, displayName: currentName, setAvatarDataUrl } = useAppState();
  const [localDisplayName, setLocalDisplayName] = useState(currentName || 'Yu');
  const [localBio, setLocalBio] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (currentName) setLocalDisplayName(currentName);
  }, [currentName]);

  const onUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const avatarUrl = await uploadImageToStorage({ file, folder: 'avatars' });
      await setAvatarDataUrl(avatarUrl);
    } catch (err) {
      console.error(err);
      alert('頭貼上傳失敗，請稍後再試');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    await updateProfile({ displayName: localDisplayName, bio: localBio });
    navigate('/profile');
  };

  return (
    <div className="animate-in fade-in duration-500 pb-28">
      <TopBar title="編輯個人檔案" showBack />

      <main className="pt-topbar-content px-5 space-y-6 w-full min-w-0 max-w-full">
        <section className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-black/[0.12]" />
            ) : (
              <UserAvatar size="xl" />
            )}
            <div className="space-y-2">
              <label className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-black/[0.08] text-sm font-semibold cursor-pointer">
                {uploadingAvatar ? '上傳中…' : '上傳頭像'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0])}
                  disabled={uploadingAvatar}
                />
              </label>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl(null)}
                  className="block text-xs text-on-surface-variant underline"
                >
                  移除頭像
                </button>
              )}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              顯示名稱
            </span>
            <input
              value={localDisplayName}
              onChange={(e) => setLocalDisplayName(e.target.value)}
              className="mt-2 w-full bg-white border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              自我介紹
            </span>
            <textarea
              value={localBio}
              onChange={(e) => setLocalBio(e.target.value)}
              rows={4}
              placeholder="簡短介紹你的收藏偏好、交易方式…"
              className="mt-2 w-full bg-white border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none resize-none"
            />
          </label>
        </section>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onSave}
          className="doodle-press w-full py-4 premium-gradient rounded-full text-white font-bold"
        >
          儲存
        </motion.button>
      </main>
    </div>
  );
}
