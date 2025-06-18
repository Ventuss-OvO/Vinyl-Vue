import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AlbumBrowse from '../views/AlbumBrowse.vue'
import AlbumPlayer from '../views/AlbumPlayer.vue'
import { useLibraryStore } from '../store/libraryStore'
import { updateCanonicalLink } from '../utils/seo'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/',
    name: 'AlbumPlayer',
    component: AlbumPlayer,
    props: () => ({ albumId: 'first' }),
    beforeEnter: async (_to, _from, next) => {
      // Ensure the music library is loaded, but do not modify route parameters
      const libraryStore = useLibraryStore()
      if (!libraryStore.isLoaded) {
        await libraryStore.fetchLibrary()
      }
      next()
    }
  },
  {
    path: '/tower',
    name: 'AlbumBrowse',
    component: AlbumBrowse
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Add a global before-guard to update the canonical tag
router.beforeEach((to, _from, next) => {
  // Update the canonical link on route change
  updateCanonicalLink(to.path)
  next()
})

export default router
