import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LS_NAME = 'bb_display_name'
const LS_AVATAR = 'bb_avatar_url'
const LS_LETTER = 'bb_avatar_letter'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(LS_NAME) || 'MaggieP')
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem(LS_AVATAR) || '')
  const [avatarLetter, setAvatarLetter] = useState(() => localStorage.getItem(LS_LETTER) || 'M')

  useEffect(() => {
    localStorage.setItem(LS_NAME, displayName)
  }, [displayName])

  useEffect(() => {
    if (avatarUrl && !avatarUrl.startsWith('blob:')) localStorage.setItem(LS_AVATAR, avatarUrl)
    else if (!avatarUrl) localStorage.removeItem(LS_AVATAR)
  }, [avatarUrl])

  useEffect(() => {
    localStorage.setItem(LS_LETTER, avatarLetter)
  }, [avatarLetter])

  const value = useMemo(
    () => ({
      displayName,
      setDisplayName,
      avatarUrl,
      setAvatarUrl,
      avatarLetter,
      setAvatarLetter,
    }),
    [displayName, avatarUrl, avatarLetter],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
