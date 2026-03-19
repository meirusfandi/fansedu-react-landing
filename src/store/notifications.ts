import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppNotification {
  id: string
  title: string
  message: string
  href?: string
  level?: 'info' | 'success' | 'warning'
  read?: boolean
  createdAt: string
}

interface NotificationsStore {
  items: AppNotification[]
  setItems: (items: AppNotification[]) => void
  upsertItems: (items: AppNotification[]) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  unreadCount: () => number
}

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      upsertItems: (items) =>
        set((state) => {
          const map = new Map(state.items.map((item) => [item.id, item]))
          for (const item of items) {
            map.set(item.id, { ...map.get(item.id), ...item })
          }
          return { items: Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }
        }),
      markAsRead: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
        })),
      markAllAsRead: () =>
        set((state) => ({
          items: state.items.map((item) => ({ ...item, read: true })),
        })),
      unreadCount: () => get().items.filter((item) => !item.read).length,
    }),
    { name: 'fansedu-notifications' }
  )
)
