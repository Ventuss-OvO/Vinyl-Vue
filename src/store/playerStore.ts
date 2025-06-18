import { defineStore } from 'pinia';
import type { Album, Song } from '@/services/musicService';

// Define the state structure for the player
interface PlayerState {
  currentAlbum: Album | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  // TODO: Add other states like loop mode, shuffle mode if needed
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    currentAlbum: null,
    currentTrackIndex: -1, // Use -1 to indicate no track is loaded/selected initially
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8, // Default volume
  }),

  getters: {
    // Getter to get the current song object based on the index
    currentSong(state): Song | null {
      if (state.currentAlbum && state.currentTrackIndex >= 0 && state.currentTrackIndex < state.currentAlbum.songs.length) {
        return state.currentAlbum.songs[state.currentTrackIndex];
      }
      return null;
    },
    // Getter to check if a track is currently loaded
    isTrackLoaded(state): boolean {
      return state.currentAlbum !== null && state.currentTrackIndex !== -1;
    },
    // Formatted current time (e.g., "01:23")
    formattedCurrentTime(state): string {
      const minutes = Math.floor(state.currentTime / 60);
      const seconds = Math.floor(state.currentTime % 60);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    // Formatted duration (e.g., "03:45")
    formattedDuration(state): string {
      const minutes = Math.floor(state.duration / 60);
      const seconds = Math.floor(state.duration % 60);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
  },

  actions: {
    // Action to load a new album and optionally start playing the first track
    loadAlbum(album: Album, startPlaying: boolean = false) {
      console.log(`[PlayerStore] Loading album: ${album.title}`);
      this.currentAlbum = album;
      this.currentTrackIndex = album.songs.length > 0 ? 0 : -1; // Start with the first track if available
      this.isPlaying = startPlaying && this.currentTrackIndex !== -1;
      this.currentTime = 0;
      this.duration = 0; // Reset duration, actual duration comes from the audio element
      // TODO: Trigger actual audio loading here or in the component
    },

    // Action to play the current track
    play() {
      if (this.isTrackLoaded) {
        console.log('[PlayerStore] Play action');
        this.isPlaying = true;
        // TODO: Interact with the audio element to play
      }
    },

    // Action to pause the current track
    pause() {
      if (this.isPlaying) {
        console.log('[PlayerStore] Pause action');
        this.isPlaying = false;
        // TODO: Interact with the audio element to pause
      }
    },

    // Action to toggle play/pause
    togglePlayPause() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    // Action to play the next track
    nextTrack() {
      if (!this.currentAlbum || !this.isTrackLoaded) return;
      console.log('[PlayerStore] Next track action');
      const totalTracks = this.currentAlbum.songs.length;
      if (totalTracks > 0) {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % totalTracks;
        this.play(); // Automatically play the next track
      }
    },

    // Action to play the previous track
    previousTrack() {
      if (!this.currentAlbum || !this.isTrackLoaded) return;
      console.log('[PlayerStore] Previous track action');
      const totalTracks = this.currentAlbum.songs.length;
      if (totalTracks > 0) {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + totalTracks) % totalTracks;
        this.play(); // Automatically play the previous track
      }
    },

    // Action to seek to a specific time
    seek(time: number) {
      if (this.isTrackLoaded) {
        console.log(`[PlayerStore] Seek action to: ${time}`);
        this.currentTime = time;
        // TODO: Interact with the audio element to set currentTime
      }
    },

    // Action to update the current time (usually called by the audio element's timeupdate event)
    updateCurrentTime(time: number) {
      if (this.isPlaying) { // Only update if playing to avoid unnecessary updates when paused/seeking
          this.currentTime = time;
      }
    },

    // Action to update the duration (usually called when audio metadata is loaded)
    updateDuration(duration: number) {
        console.log(`[PlayerStore] Duration updated: ${duration}`);
        this.duration = duration;
    },

    // Action to set the volume
    setVolume(volume: number) {
      // Clamp volume between 0 and 1
      this.volume = Math.max(0, Math.min(1, volume));
      console.log(`[PlayerStore] Set volume action to: ${this.volume}`);
      // TODO: Interact with the audio element to set volume
    },

    // Action to clear the player state (e.g., when leaving the player view)
    resetPlayer() {
      console.log('[PlayerStore] Resetting player state');
      this.pause(); // Ensure audio stops if playing
      this.currentAlbum = null;
      this.currentTrackIndex = -1;
      this.currentTime = 0;
      this.duration = 0;
      // Keep volume setting?
    },
  },
});
