import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MARKET_POSTS_SEED } from '../data/appData'

const PostsContext = createContext(null)

function seedPosts() {
  const t0 = Date.UTC(2026, 3, 18)
  return MARKET_POSTS_SEED.map((p, i) => ({
    ...p,
    postedAt: t0 + i * 3_600_000,
  }))
}

export function PostsProvider({ children }) {
  const [posts, setPosts] = useState(seedPosts)

  const findPost = useCallback((id) => posts.find((p) => p.id === id), [posts])

  const addPost = useCallback((post) => {
    const id = `p-${Date.now()}`
    setPosts((prev) => [...prev, { ...post, id, postedAt: Date.now() }])
    return id
  }, [])

  const updatePost = useCallback((id, patch) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const value = useMemo(() => ({ posts, findPost, addPost, updatePost }), [posts, findPost, addPost, updatePost])

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export function usePosts() {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePosts must be used within PostsProvider')
  return ctx
}
