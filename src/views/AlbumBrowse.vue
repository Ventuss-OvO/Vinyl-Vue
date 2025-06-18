<template>
  <div class="relative h-full overflow-hidden">
    <!-- Content area that fills available space (body container) -->
    <div class="body-container pt-[0px] pl-[0px] pr-[0px] pb-[0px] flex flex-col items-center justify-center overflow-hidden">
      <!-- Create a viewport container, no overflow restrictions -->
      <div class="viewport-container w-full" style="padding: 0px;">
      <!-- Loading State -->
      <div v-if="libraryStore.isLoading" class="text-center loading-message w-full">
        Loading music library...
      </div>

      <!-- Error State -->
      <div v-else-if="libraryStore.error" class="text-center error-message p-4 rounded w-full">
        Failed to load: {{ libraryStore.error }}
      </div>

      <!-- Desktop View: Album Scroll Container (Allow horizontal scroll only) -->
      <div v-else-if="albums.length > 0 && !isMobile" class="album-scroll-container flex overflow-x-auto overflow-y-hidden gap-x-[30px] pb-4 w-full"> 
        <div
          v-for="album in albums"
          :key="album.id"
          @click="handleAlbumClick(album.id)"
          class="album-card block rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out w-[270px] flex-shrink-0 cursor-pointer"
        >
          <img
            :src="album.coverSrc"
            :alt="`${album.title} cover`"
            class="album-cover w-[270px] h-[270px] object-cover transition-all duration-200 ease-in-out"
            @error="handleImageError"
          />
          <div class="p-3 album-details">
            <h2 class="font-semibold text-md truncate" :title="album.title">{{ album.title }}</h2>
            <p class="text-sm truncate" :title="album.artist">{{ album.artist }}</p>
            <p class="text-xs album-year">{{ album.year }}</p>
          </div>
        </div>
      </div>

      <!-- Mobile View: Albums grouped by year -->
      <div v-else-if="albums.length > 0 && isMobile" class="mobile-album-container w-full overflow-y-auto">
        <div v-for="(yearGroup, year) in albumsByYear" :key="year" class="year-group mb-2">
          <h2 class="year-heading text-base font-bold mb-2 text-white sticky top-0 py-1 z-10 text-left">{{ year }}</h2>
          <div class="album-list">
            <div
              v-for="album in yearGroup"
              :key="album.id"
              @click="handleAlbumClick(album.id)"
              class="mobile-album-card flex items-center p-3 mb-4 rounded-lg cursor-pointer hover:bg-[#282828] transition-colors"
            >
              <img
                :src="album.coverSrc"
                :alt="`${album.title} cover`"
                class="mobile-album-cover w-[70px] h-[70px] object-cover rounded-md mr-6"
                @error="handleImageError"
              />
              <div class="mobile-album-details flex-1 overflow-hidden ml-2">
                <h3 class="font-semibold text-lg truncate text-left" :title="album.title">{{ album.title }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center empty-message w-full">
        No albums found in the library.
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, onActivated, ref, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../store/libraryStore'
import { useNavigationStore } from '../store/navigationStore'
import type { Album } from '../services/musicService'

const router = useRouter()
const libraryStore = useLibraryStore()
const navigationStore = useNavigationStore()

// Responsive Design - Detect if it's a mobile device
const isMobile = ref(false)

// Function to check device type
const checkDeviceType = () => {
  isMobile.value = window.innerWidth < 768
}

// Check device type before component mounts and on window resize
onBeforeMount(() => {
  checkDeviceType()
  window.addEventListener('resize', checkDeviceType)
})

// Remove event listener when the component unmounts
onMounted(() => {
  return () => {
    window.removeEventListener('resize', checkDeviceType)
  }
})

// Debugging info
console.log('[AlbumBrowse] Component initialized')

// Get the computed ref for all albums from the store
const albums = computed(() => libraryStore.getAllAlbums)

// Albums grouped by year (for mobile view)
const albumsByYear = computed(() => {
  const groupedAlbums: Record<string, Album[]> = {}
  
  // Group albums by year
  albums.value.forEach(album => {
    if (!groupedAlbums[album.year]) {
      groupedAlbums[album.year] = []
    }
    groupedAlbums[album.year].push(album)
  })
  
  // Convert to an object sorted by year
  const sortedYears = Object.keys(groupedAlbums).sort((a, b) => parseInt(a) - parseInt(b))
  const result: Record<string, Album[]> = {}
  
  sortedYears.forEach(year => {
    result[year] = groupedAlbums[year]
  })
  
  return result
})

// Handle album click, set the selected album ID, and navigate to the home page
const handleAlbumClick = (albumId: string) => {
  // Set the selected album ID
  navigationStore.setSelectedAlbumId(albumId)
  // Navigate to the home page
  router.push('/')
}

// Function to handle image loading errors
const handleImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  // Optional: Replace with a placeholder image path
  // imgElement.src = '/path/to/placeholder-cover.jpg';
  console.warn("Failed to load cover image:", imgElement.src);
  // You could set a default image or style
  imgElement.alt = "Cover failed to load"; 
  // Add a simple visual indicator if you like
  imgElement.style.border = '1px solid red'; 
};

// Function to load album data
const loadAlbumData = async () => {
  console.log('[AlbumBrowse] Loading album data...')
  
  // Check if there is data first, and use it if available
  if (albums.value.length > 0) {
    console.log('[AlbumBrowse] Using existing data, album count:', albums.value.length)
    return
  }
  
  // If no data, then load it
  try {
    console.log('[AlbumBrowse] Starting to load data')
    await libraryStore.fetchLibrary()
    console.log('[AlbumBrowse] Data loaded, album count:', albums.value.length)
  } catch (error) {
    console.error('[AlbumBrowse] Error loading data:', error)
  }
}

// Load data when the component is mounted
onMounted(() => {
  console.log('[AlbumBrowse] Component mounted')
  loadAlbumData()
})

// Also load data when the component is activated (redisplayed from cache)
onActivated(() => {
  console.log('[AlbumBrowse] Component activated')
  loadAlbumData()
})
</script>

<style scoped>
/* Styles for Album Browse View */
.body-container {
  width: 100%;
  height: 100%;
  max-height: 100%;
  position: relative;
  overflow: hidden; /* Prevent content overflow */
  padding-left: 30px;
  padding-right: 30px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* Vertically center */
}

/* Viewport container to handle overflow issues */
.viewport-container {
  position: relative;
  height: 100%; /* Fill parent height */
  width: 100%;
  overflow: hidden; /* Prevent vertical overflow */
  display: flex;
  flex-direction: column;
  justify-content: center; /* Vertically center */
}

/* ===== Common Styles ===== */

/* Loading and empty state messages */
.loading-message,
.empty-message {
  color: #f3f3f3;
  padding-top: 2rem;
  font-family: 'Noto Serif SC', serif; /* Use Noto Serif SC font */
}

.error-message {
  color: #ffdddd;
  background-color: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.5);
  font-family: 'Noto Serif SC', serif; /* Use Noto Serif SC font */
}


/* ===== Desktop Styles ===== */

/* Album card */
.album-card {
  transition: box-shadow 0.3s ease-in-out; 
}

.album-cover {
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transform: translateY(0);
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  z-index: 1;
}

.album-card:hover .album-cover {
  transform: translateY(-15px); /* Upward movement animation */
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.album-card:hover .album-details {
  opacity: 1;
}

.album-details {
  color: #fff;
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

/* Album list scroll container */
.album-scroll-container {
  width: calc(100% + 60px); /* 适应左右内边距 */
  padding: 0 30px;
  margin-left: -30px;
  margin-right: -30px;
  box-sizing: border-box;
}

/* Custom scrollbar for better aesthetics */
.album-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.album-scroll-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.album-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
}

.album-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.6);
}

/* ===== Mobile Styles ===== */

/* Album list for mobile view */
.mobile-album-container {
  padding: 0 20px;
  height: 100%;
}

.year-group .year-heading {
  background-color: #121212; /* Match the body background color */
}

.mobile-album-card {
  background-color: transparent;
}
</style>
