import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadMusicLibrary, type Album } from '../services/musicService' // Import the loading function and Album type

// Define the store using the setup store pattern (more Composition API like)
export const useLibraryStore = defineStore('library', () => {
  // --- State --- 
  // Reactive reference to hold the array of albums
  const albums = ref<Album[]>([])
  // Reactive reference to track the loading state
  const isLoading = ref<boolean>(false)
  // Reactive reference to store any potential error during loading
  const error = ref<string | null>(null)
  // Reactive reference to track if the library is loaded
  const isLoaded = ref<boolean>(false)

  // --- Getters --- 
  // Computed property to get all albums (read-only)
  const getAllAlbums = computed(() => albums.value)

  // Function (acting like a getter) to find an album by its ID
  const getAlbumById = (id: string): Album | undefined => {
    return albums.value.find(album => album.id === id)
  }

  // --- Actions --- 
  // Action to fetch the music library data from the service
  const fetchLibrary = async (forceRefresh = false) => {
    // Don't fetch if already loaded, unless forced
    if (albums.value.length > 0 && !forceRefresh) {
      console.log("[LibraryStore] Using cached data, albums length:", albums.value.length)
      return;
    }

    console.log("[LibraryStore] Fetching library data...")
    isLoading.value = true // Set loading state to true
    error.value = null // Reset any previous error
    isLoaded.value = false // Reset loaded flag before fetching
    try {
      // Call the loading function from the music service
      const data = await loadMusicLibrary()
      
      // Get the base URL for R2 from environment variables, with a fallback
      const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';

      // If the R2 public URL is defined, dynamically replace placeholders
      if (r2PublicUrl) {
        data.forEach(album => {
          if (album.coverSrc && album.coverSrc.includes('${R2_PUBLIC_URL}')) {
            album.coverSrc = album.coverSrc.replace('${R2_PUBLIC_URL}', r2PublicUrl);
          }
          album.songs.forEach(song => {
            if (song.src && song.src.includes('${R2_PUBLIC_URL}')) {
              song.src = song.src.replace('${R2_PUBLIC_URL}', r2PublicUrl);
            }
          });
        });
      }
      
      albums.value = data // Update the state with the processed data
      isLoaded.value = true // Set loaded flag to true after successful fetch
      console.log("[LibraryStore] Library data loaded successfully, albums length:", albums.value.length)
    } catch (err) {
      // If an error occurs, store the error message
      console.error("[LibraryStore] Error fetching music library:", err)
      error.value = err instanceof Error ? err.message : 'An unknown error occurred'
      albums.value = [] // Ensure albums is empty on error
      isLoaded.value = false // Ensure loaded is false on error
    } finally {
      // Set loading state back to false regardless of success or failure
      isLoading.value = false
    }
  }
  
  // Action to force refresh the library data
  const refreshLibrary = async () => {
    console.log("[LibraryStore] Forcing library refresh")
    // Clear the current albums array
    albums.value = []
    // Call fetchLibrary with force refresh flag
    return fetchLibrary(true)
  }

  // --- Return state, getters, and actions --- 
  return {
    albums,         // Expose state: the list of albums
    isLoading,      // Expose state: the loading status
    error,          // Expose state: any loading error
    isLoaded,       // Expose state: if the library is loaded
    getAllAlbums,   // Expose getter: function to get all albums
    getAlbumById,   // Expose getter: function to find an album by ID
    fetchLibrary,   // Expose action: function to trigger loading the library
    refreshLibrary  // Expose action: function to force refresh the library
  }
})
