import { defineStore } from 'pinia';

// Defines a store for managing navigation-related state,
// such as passing information between routes.
export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    // Stores the ID of the album selected by the user.
    selectedAlbumId: '' 
  }),
  
  actions: {
    // Sets the selected album ID.
    setSelectedAlbumId(albumId: string) {
      this.selectedAlbumId = albumId;
      console.log(`[NavigationStore] Selected album ID set to: ${albumId}`);
    },
    
    // Clears the selected album ID.
    clearSelectedAlbumId() {
      this.selectedAlbumId = '';
      console.log('[NavigationStore] Selected album ID cleared');
    }
  }
});
