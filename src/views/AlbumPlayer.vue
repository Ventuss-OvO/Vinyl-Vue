<script setup lang="ts">
console.log('--- AlbumPlayer.vue script setup started ---'); // Add log at the very top

import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlayerStore } from '@/store/playerStore'; // Import the player store
import { useNavigationStore } from '@/store/navigationStore'; // Import the navigation store
import type { Album } from '@/services/musicService';

// Import SVG assets
import nextButtonSvg from '@/assets/NEXT.svg';
import prevButtonSvg from '@/assets/PREV.svg';
import playButtonSvg from '@/assets/Start Stop Button.svg';
import playButtonOuterSvg from '@/assets/start stop outer.svg';
import infoOuterSvg from '@/assets/info outer.svg';

// Define component props
const props = defineProps<{
  albumId?: string
}>();

const route = useRoute();
const router = useRouter(); // Add router instance
const libraryStore = useLibraryStore();
const playerStore = usePlayerStore(); // Get instance of player store
const navigationStore = useNavigationStore(); // Get instance of navigation store

// Prioritize albumId from props, otherwise use the route parameter
const albumId = computed(() => props.albumId || route.params.albumId as string);
const localCurrentAlbum = ref<Album | null>(null); // Keep a local ref for initial load

// Tracks if playback has started, to prevent the tone arm from jumping back to the start when changing tracks
const hasStartedPlaying = ref(false);
// Stores the index of the previous track to detect song changes
const previousTrackIndex = ref(0);

// Responsive design - detect if the device is mobile
const isMobile = ref(false);

// Function to check the device type
const checkDeviceType = () => {
  isMobile.value = window.innerWidth < 768;
  console.log('[AlbumPlayer] Device type checked, isMobile:', isMobile.value);
};

// --- Store-based computed properties ---
const currentAlbumFromStore = computed(() => playerStore.currentAlbum);
const currentTrackIndex = computed(() => playerStore.currentTrackIndex);
const isPlaying = computed(() => playerStore.isPlaying);
const currentSong = computed(() => playerStore.currentSong);
const totalTracks = computed(() => playerStore.currentAlbum?.songs.length ?? 0);

// --- Tone arm rotation computed property ---
const toneArmRotation = computed(() => {
  // If there's no album or track, return the initial angle
  if (!playerStore.currentAlbum || !playerStore.currentSong || totalTracks.value === 0) {
    return -15; // Initial angle, tone arm is away from the record
  }
  
  // If not playing, keep it at the initial angle
  if (!playerStore.isPlaying) {
    return -15;
  }
  
  // Only return the starting playback position when playback begins for the first time
  if (!hasStartedPlaying.value && playerStore.currentTime < 0.5) {
    // Mark as started to avoid jumping back on track change
    hasStartedPlaying.value = true;
    previousTrackIndex.value = currentTrackIndex.value;
    return -5; // Starting playback position
  }
  
  // Calculate total album progress
  // 1. Progress of completed tracks
  const completedTracksProgress = currentTrackIndex.value / totalTracks.value;
  
  // 2. Progress of the current track
  const currentTrackProgress = playerStore.currentTime / (playerStore.duration || 1);
  
  // 3. Portion of the current track within the total album
  const currentTrackPortion = 1 / totalTracks.value;
  
  // 4. Total progress = completed tracks progress + (current track progress * current track portion)
  const totalProgress = completedTracksProgress + (currentTrackProgress * currentTrackPortion);
  
  // Calculate rotation angle: from -5 degrees (record edge) to 33 degrees (record center)
  // Total rotation angle is 38 degrees
  const startAngle = -5;
  const totalRotationAngle = 38;
  
  return startAngle + (totalProgress * totalRotationAngle);
});

// Ref for the actual HTML audio element
const audioRef = ref<HTMLAudioElement | null>(null);

// Ref for the scratch sound effect audio element
const scratchSoundRef = ref<HTMLAudioElement | null>(null);

// Import the needle scratch sound effect file
import scratchSound from '@/assets/scratch.m4a';

// --- Load Album Data --- (Runs when albumId changes or library is loaded)
watchEffect(async () => {
  // First, check if there's a selected album ID in the navigation store
  const selectedId = navigationStore.selectedAlbumId;
  let id = albumId.value;
  
  // If a selected album ID exists in the navigation store, prioritize it
  if (selectedId && selectedId !== '') {
    console.log(`[AlbumPlayer] watchEffect: Using selected album ID from navigation store: ${selectedId}`);
    id = selectedId;
    // Clear it after use to avoid affecting subsequent navigation
    navigationStore.clearSelectedAlbumId();
  }
  
  // Ensure the music library is loaded
  if (!libraryStore.isLoaded) {
    console.log('[AlbumPlayer] watchEffect: Library not loaded, fetching...');
    await libraryStore.fetchLibrary();
  }
  
  // If the ID is 'first', load the first album
  if (id === 'first' && libraryStore.isLoaded) {
    console.log('[AlbumPlayer] watchEffect: Loading first album');
    const albums = libraryStore.getAllAlbums;
    if (albums.length > 0) {
      const firstAlbum = albums[0];
      console.log(`[AlbumPlayer] watchEffect: First album found: ${firstAlbum.title} (${firstAlbum.id})`);
      localCurrentAlbum.value = firstAlbum;
      if (!currentAlbumFromStore.value || currentAlbumFromStore.value.id !== firstAlbum.id) {
        console.log("[AlbumPlayer] watchEffect: Calling playerStore.loadAlbum with first album");
        playerStore.loadAlbum(firstAlbum);
      }
    } else {
      console.log('[AlbumPlayer] watchEffect: No albums found in library');
    }
  } 
  // If there's another ID, try to load the album by ID
  else if (id && id !== 'first' && libraryStore.isLoaded) {
    console.log(`[AlbumPlayer] watchEffect: Loading album data for ID: ${id}`);
    const albumData = await libraryStore.getAlbumById(id);
    if (albumData) {
      localCurrentAlbum.value = albumData; // Set local ref first for template display
      if (!currentAlbumFromStore.value || currentAlbumFromStore.value.id !== albumData.id) {
          console.log("[AlbumPlayer] watchEffect: Calling playerStore.loadAlbum");
          playerStore.loadAlbum(albumData); // Load album into the player store
      }
    } else {
      console.log(`[AlbumPlayer] watchEffect: Album with ID ${id} not found, loading first album instead`);
      // If the specified album doesn't exist, load the first album
      const albums = libraryStore.getAllAlbums;
      if (albums.length > 0) {
        const firstAlbum = albums[0];
        localCurrentAlbum.value = firstAlbum;
        playerStore.loadAlbum(firstAlbum);
      }
    }
  }
});

// --- Sync Audio Element with Store State ---

// Watch for changes in the current song from the store
watch(() => playerStore.currentSong, (newSong) => {
  if (audioRef.value && newSong?.src) {
    console.log(`[AlbumPlayer] watch currentSong: Setting audio src to ${newSong.src}`);
    const newSrcUrl = new URL(newSong.src, window.location.origin).toString();
    if (!audioRef.value.src || audioRef.value.src !== newSrcUrl) {
        // Check if the track has changed
        if (previousTrackIndex.value !== currentTrackIndex.value) {
          // Update the previous track index
          previousTrackIndex.value = currentTrackIndex.value;
          // Don't reset hasStartedPlaying on track change, to keep the tone arm from jumping back to the start
        }
        
        audioRef.value.src = newSong.src;
        audioRef.value.load(); // Important: load the new source
        console.log('[AlbumPlayer] Audio source loaded:', newSong.src);
        
        // Delay playback slightly to ensure the audio has loaded
        if (playerStore.isPlaying) {
            setTimeout(() => {
                if (audioRef.value && playerStore.isPlaying) {
                    console.log('[AlbumPlayer] Attempting to play after source change');
                    audioRef.value.play().catch(error => {
                        console.error("Audio play failed after src change:", error);
                        // If playback fails, update the state
                        playerStore.pause();
                    });
                }
            }, 100); // A short delay to ensure the audio is ready
        }
    }
  } else if (audioRef.value && !newSong) {
      // If no song, clear src and pause
      audioRef.value.removeAttribute('src');
      audioRef.value.pause();
      console.log("[AlbumPlayer] watch currentSong: No song, cleared audio src.");
  }
}, { immediate: true }); // Changed to immediate: true to ensure it runs immediately after component mount

// Watch for changes in the playing state from the store
watch(isPlaying, (newIsPlaying) => {
  if (audioRef.value) {
    if (newIsPlaying) {
      console.log('[AlbumPlayer] watch isPlaying: Calling audio.play()');
      
      // Ensure the audio source is set
      if (playerStore.currentSong?.src && (!audioRef.value.src || audioRef.value.src === '')) {
        console.log('[AlbumPlayer] Setting missing audio src before playing');
        audioRef.value.src = playerStore.currentSong.src;
        audioRef.value.load();
      }
      
      // Check if the audio is ready to play
      if (audioRef.value.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        // Audio is ready, can play
        audioRef.value.play().catch(error => {
          console.error("Audio play failed:", error);
          playerStore.pause();
        });
      } else {
        // Audio is not ready yet, add an event listener to wait for it to be ready
        console.log('[AlbumPlayer] Audio not ready, waiting for canplay event');
        const canPlayHandler = () => {
          if (playerStore.isPlaying) { // Check again if playback is still needed
            audioRef.value?.play().catch(error => {
              console.error("Audio play failed after canplay:", error);
              playerStore.pause();
            });
          }
          // Remove the event listener
          audioRef.value?.removeEventListener('canplay', canPlayHandler);
        };
        audioRef.value.addEventListener('canplay', canPlayHandler);
      }
    } else {
      console.log('[AlbumPlayer] watch isPlaying: Calling audio.pause()');
      audioRef.value.pause();
      // If playback is paused, don't reset hasStartedPlaying, so it won't jump back to the start on resume
    }
  }
});

// Watch for changes in the volume from the store
watch(() => playerStore.volume, (newVolume) => {
    if (audioRef.value) {
        console.log(`[AlbumPlayer] watch volume: Setting audio volume to ${newVolume}`);
        audioRef.value.volume = newVolume;
    }
});

// --- Audio Element Event Handlers ---

const handleTimeUpdate = () => {
  if (audioRef.value) {
    playerStore.updateCurrentTime(audioRef.value.currentTime);
    // No other handling is needed here; the computed property will automatically update the tone arm angle
  }
};

const handleLoadedMetadata = () => {
  if (audioRef.value) {
    console.log(`[AlbumPlayer] handleLoadedMetadata: Duration is ${audioRef.value.duration}`);
    playerStore.updateDuration(audioRef.value.duration);
  }
};

const handleEnded = () => {
  console.log('[AlbumPlayer] handleEnded: Calling nextTrack');
  playerStore.nextTrack(); // Play next track when current one finishes
};

const handlePlay = () => {
    if (!playerStore.isPlaying) {
        console.log('[AlbumPlayer] handlePlay: Syncing store state to playing');
        playerStore.play(); // Sync store if play is triggered externally/automatically
    }
};

const handlePause = () => {
    if (playerStore.isPlaying) {
        console.log('[AlbumPlayer] handlePause: Syncing store state to paused');
        playerStore.pause(); // Sync store if pause is triggered externally
    }
};

const handleError = (event: Event) => {
  console.error("[AlbumPlayer] handleError: Audio error occurred", event);
  // Optionally pause the store state if an error occurs
  playerStore.pause();
};

// Handle play button click: play the needle scratch sound and toggle playback state
const handlePlayButtonClick = () => {
  // Play the needle scratch sound effect
  if (scratchSoundRef.value) {
    // Reset the sound effect's playback position to ensure it starts from the beginning every time
    scratchSoundRef.value.currentTime = 0;
    // Set the volume
    scratchSoundRef.value.volume = 1.0;
    // Play the sound effect and log to console for debugging
    console.log("Playing scratch sound effect...");
    scratchSoundRef.value.play().then(() => {
      console.log("Scratch sound played successfully!");
    }).catch(error => {
      console.error("Scratch sound play failed:", error);
    });
  } else {
    console.error("Scratch sound reference is null");
  }
  
  // Ensure the current song is loaded
  if (playerStore.currentSong && audioRef.value) {
    // Ensure the audio source is set
    if (playerStore.currentSong?.src && (!audioRef.value.src || audioRef.value.src === '')) {
      console.log('[AlbumPlayer] Setting audio src before playing:', playerStore.currentSong.src);
      audioRef.value.src = playerStore.currentSong.src;
      audioRef.value.load(); // Load the audio source
    }
  }
  
  // Toggle playback state
  playerStore.togglePlayPause();
};

// Navigate to the album browse page
const navigateToAlbumBrowse = () => {
  console.log('[AlbumPlayer] Navigating to album browse');
  router.push('/tower');
};

// Handle record click event
const handleRecordClick = () => {
  console.log('[AlbumPlayer] Record clicked, isMobile:', isMobile.value);
  if (isMobile.value) {
    navigateToAlbumBrowse();
  } else {
    console.log('[AlbumPlayer] Desktop mode, calling handlePlayButtonClick');
    handlePlayButtonClick();
  }
};

// --- Component Lifecycle Hooks ---
onMounted(() => {
  console.log('[AlbumPlayer] Component Mounted');
  // Initial volume sync
  if (audioRef.value) {
      audioRef.value.volume = playerStore.volume;
  }
  
  // Check device type
  checkDeviceType();
  // Listen for window resize events
  window.addEventListener('resize', checkDeviceType);
});

onUnmounted(() => {
  console.log('[AlbumPlayer] Component Unmounted');
  // Remove window resize listener
  window.removeEventListener('resize', checkDeviceType);
  // Consider if we should reset the player state when leaving the page
  // playerStore.resetPlayer(); // Uncomment if desired
});

</script>

<template>
  <!-- Body area: use specified container and styles -->
  <div class="body-container flex items-center justify-center overflow-visible pt-[120px] pl-[60px] pr-[60px] pb-[60px]">
    <!-- Loading state -->
    <div v-if="!localCurrentAlbum && !currentAlbumFromStore" class="loading-state">
      <p>Loading Album...</p>
    </div>
    
    <!-- Content area - inside the body container -->
    <div v-else class="player-content" style="overflow: visible;">
      <!-- Outer container: player-all -->
      <div class="player-all">
        <!-- Player view container: player-view -->
        <div class="player-view" style="overflow: visible;">
          <!-- Album cover container: cover -->
          <div class="cover" style="overflow: visible; padding-top: 25px;">
            <router-link to="/tower" class="cover-link">
              <img 
                :src="(localCurrentAlbum || currentAlbumFromStore)?.coverSrc" 
                :alt="(localCurrentAlbum || currentAlbumFromStore)?.title" 
                class="album-cover"
              >
            </router-link>
          </div>

          <!-- Record and tone arm container: player-record -->
          <div class="player-record" :class="{ 'playing': playerStore.isPlaying }"
               :style="{ '--album-cover-url': `url('${(localCurrentAlbum || currentAlbumFromStore)?.coverSrc}')` }">
            <!-- Record combination container -->
            <div class="record-container" @click="handleRecordClick">
              <img src="@/assets/record.svg" alt="Vinyl Record" class="vinyl-svg" />
              <!-- Record label area -->
              <div class="record-album-title">
                <div class="record-label-top">
                  <span class="album-title-text">{{ (localCurrentAlbum || currentAlbumFromStore)?.title }}</span>
                </div>
                <div class="record-label-bottom">
                  <span class="album-year-text">{{ (localCurrentAlbum || currentAlbumFromStore)?.year }}</span>
                </div>
              </div>
              <!-- Record spindle -->
              <div class="record-axis"></div>
            </div>
            <div class="tone-arm" 
              :style="{ transform: `rotate(${toneArmRotation}deg)` }" 
              @click.stop="handlePlayButtonClick"
              title="Click to Play/Pause">
              <img src="@/assets/Tone Arm.svg" alt="Tone Arm" class="tone-arm-svg" />
            </div>
          </div>
        </div>

        <!-- Playback control buttons container: player-button -->
        <div class="player-button">
          <!-- Center Play/Pause button -->
          <button 
            @click="handlePlayButtonClick" 
            :disabled="totalTracks === 0" 
            class="play-button">
            <img :src="playButtonSvg" width="75" height="60" alt="Play/Pause Button">
          </button>

          <!-- Track info container -->
          <div class="info-container">
            <!-- Outer frame SVG -->
            <img :src="infoOuterSvg" class="info-frame" width="160" height="70" alt="Info Frame">
            
            <div class="info">
              <p class="track-number">Track: {{ currentTrackIndex + 1 }}/{{ totalTracks }}</p>
              <h2 class="track-title">
                {{ currentSong?.title ?? 'No Track Loaded' }}
              </h2>
            </div>
          </div>

          <!-- Previous/Next buttons container -->
          <div class="nav-buttons-container">
            <!-- Outer frame SVG -->
            <img :src="playButtonOuterSvg" class="nav-buttons-frame" width="75" height="60" alt="Button Frame">
            
            <!-- Previous button -->
            <button 
              @click="playerStore.previousTrack" 
              :disabled="totalTracks === 0" 
              class="prev-button">
              <img :src="prevButtonSvg" width="67" height="25" alt="Previous Button" style="width: 100%; height: 100%; object-fit: contain;">
            </button>
            
            <!-- Next button -->
            <button 
              @click="playerStore.nextTrack" 
              :disabled="totalTracks === 0" 
              class="next-button">
              <img :src="nextButtonSvg" width="67" height="25" alt="Next Button" style="width: 100%; height: 100%; object-fit: contain;">
            </button>
          </div>
        </div>
      </div>
    </div>
  </div> <!-- End body-container -->

  <!-- Audio element -->
  <audio
    ref="audioRef"
    @timeupdate="handleTimeUpdate"
    @loadedmetadata="handleLoadedMetadata"
    @ended="handleEnded"
    @play="handlePlay"
    @pause="handlePause"
    @error="handleError"
    preload="metadata">
    Your browser does not support the audio element.
  </audio>
  
  <!-- Needle scratch sound effect -->
  <audio ref="scratchSoundRef" :src="scratchSound" preload="auto">
    Your browser does not support the audio element.
  </audio>
</template>

<style scoped>

/* Body container styles */
.body-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* No extra padding-top needed, as pt-[130px] is already added in the template */
}

/* Correct the layout inside the body container */
.player-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative; /* Add relative positioning for child element positioning */
  min-width: 725px; /* Ensure the content area is wide enough */
}

/* Album cover container */
.cover {
  position: absolute;
  z-index: 1; /* Lower z-index than the player */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  left: 0px; /* Adjust cover position to ensure it's fully visible */
  top: 5px; /* Fine-tune vertical position */
  cursor: pointer; /* Show hand cursor on hover */
}

.cover-link {
  display: block;
  cursor: pointer; /* Show hand cursor on hover */
}

/* Add album cover hover effect */
.cover-link:hover .album-cover {
  transform: rotate(-5deg) translateY(-15px); /* Maintain rotation angle, move up 15px */
  box-shadow: 0 16px 24px rgba(0, 0, 0, 0.4); /* Enhance shadow effect */
  filter: brightness(1.1); /* Increase brightness */
  opacity: 1; /* Increase opacity */
}

/* Album cover */
.album-cover {
  width: 320px;
  height: 320px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  margin-bottom: 0; /* Remove bottom margin */
  transform: rotate(-5deg) translateY(0); /* Rotate 5 degrees counter-clockwise, initial position not shifted up */
  transition: all 0.2s ease; /* Add transition effect, extend duration for smoother animation */
  opacity: 0.9; /* Slightly reduce opacity to enhance depth */
}

/* Album title removed */

/* Player view container */
.player-view {
  display: flex;
  position: relative;
  width: 725px; /* Increase width to accommodate overlapping cover and record */
  height: 380px;
  align-items: center;
  justify-content: center;
  z-index: 2; /* Ensure player is above the cover */
}

/* Outer container: entire player */
.player-all {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto; /* Horizontally center */
  width: 100%; /* Full width */
}

/* Inner container: record and tone arm */
.player-record {
  position: absolute;
  right: 0; /* Position the record container on the right */
  width: 450px; /* Width remains unchanged */
  height: 380px;
  border-radius: 8px;
  padding: 10px;
  z-index: 3; /* Ensure record is above the cover */
}

/* Record combination container styles */
.record-container {
  position: relative;
  width: 380px;
  height: 380px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Remove container's rotation animation */
  cursor: pointer; /* Indicates clickable */
  transition: transform 0.2s ease, filter 0.2s ease; /* Add transition effect */
}

/* Desktop mode vinyl record hover effect */
@media (min-width: 768px) {
  .record-container:hover .vinyl-svg {
    filter: drop-shadow(-15px 10px 20px rgba(0, 0, 0, 0.8)) brightness(1.1); /* Highlight effect */
  }
}

.vinyl-svg {
  position: absolute;
  width: 380px;
  height: 380px;
  filter: drop-shadow(-15px 10px 20px rgba(0, 0, 0, 0.8)); /* Add double shadow effect */
  transition: transform 0.2s ease, filter 0.2s ease; /* Add transition effect */
}

/* Record label area styles */
.record-album-title {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #f3f3f3;
  z-index: 4; /* Positioned above the record */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  padding: 0;
  overflow: hidden;
  animation: rotate 20s linear infinite;
  animation-play-state: paused;
}

/* Top label area (Album Title) */
.record-label-top {
  width: 72%;
  padding: 5px;
  margin-top: 20px;
}

/* Bottom label area (Year) */
.record-label-bottom {
  width: 100%;
  padding: 5px;
  margin-bottom: 15px;
}

/* Album title text styles */
.album-title-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 10px;
  font-weight: 600;
  color: #000;
  line-height: 1.2;
  display: -webkit-box;
  display: box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 30px;
}

/* Year text styles */
.album-year-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 10px;
  font-weight: 600;
  color: #000;
  line-height: 1.2;
  display: inline-block;
  transform: rotate(180deg); /* Rotate 180 degrees to invert the text */
}

/* Record spindle styles */
.record-axis {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #000000;
  z-index: 5; /* Positioned above the record label area */
  /* Spindle does not rotate */
  animation: none !important;
}

/* Control rotation animation of the record label area */
.player-record.playing .record-album-title {
  animation-play-state: running;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tone-arm {
  position: absolute;
  top: 10px;
  right: 20px; /* Adjust position to be clearly inside the container */
  transform-origin: 78.82% 20.28%; /* Set rotation origin to the right side of the tone arm (red arrow position) */
  z-index: 6; /* Ensure tone arm is above all other elements */
  transition: transform 0.5s ease, filter 0.2s ease; /* Add smooth transition effect */
  display: inline-block; /* Make container fit its content size */
  line-height: 0; /* Remove line-height gap */
  font-size: 0; /* Remove text gap */
  cursor: pointer; /* Cursor becomes pointer, indicating it's clickable */
}

.tone-arm-svg {
  width: 85px; /* 180px * 0.4 = 72px */
  height: auto;
  display: block; /* Remove image bottom gap */
}

/* Tone arm hover effect */
.tone-arm:hover {
  filter: brightness(1.1) drop-shadow(0 0 3px rgba(255, 255, 255, 0.047)); /* Highlight effect */
}

/* Track info container */
.info {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Left align */
  justify-content: center;
  width: 160px; /* Fixed width */
  height: 60px; /* Fixed height */
  /* Center position */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7); /* Black background */
  border-radius: 5px; /* Rounded corners */
  box-sizing: border-box; /* Ensure padding doesn't change element size */
}

/* Track info container */
.info-container {
  position: relative;
  width: 160px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Outer frame styles */
.info-frame {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

/* Track info */
.info {
  position: absolute;
  z-index: 2;
  padding: 0 0 0 15px; /* 10px from the left of the container */
  width: 156px;
  height: 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start; /* Left align */
  text-align: left;
}

.track-number {
  color: #9ca3af;
  margin: 2px 0;
  font-size: 14px;
  font-family: 'WenQuanYiBitmapSong', monospace; /* WenQuanYi Bitmap Song font */
  width: 100%;
  text-align: left;
  letter-spacing: 0.5px; /* Increase letter spacing for a more pixelated feel */
}

.track-title {
  color: white;
  font-size: 14px; /* Reduce font size, same as track */
  font-weight: 600;
  margin: 2px 0;
  text-align: left; /* Left align */
  max-width: 140px; /* Adjust to fit the new container */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'WenQuanYiBitmapSong', monospace; /* WenQuanYi Bitmap Song font */
  width: 100%;
  letter-spacing: 0.5px; /* Increase letter spacing for a more pixelated feel */
}

/* Inner container: playback control buttons */
.player-button {
  display: flex;
  flex-direction: row;
  justify-content: space-between; /* Justify space between, align to container edges */
  align-items: flex-end; /* Use flex-end instead of bottom, as bottom is not a valid align-items value */
  width: 450px; /* Match the width of the player-record container */
  padding: 10px; /* Add padding */
  margin-top: 30px;
  border-radius: 8px;
  position: relative; /* Provide a reference point for absolutely positioned inner elements */
  min-height: 60px; /* Ensure height is sufficient to contain the info container */
}

/* Skeuomorphic play/pause button */
.play-button {
  margin: 0 15px;
  width: 75px; /* Calculated based on original ratio: (60/66)*82 is approx 75 */
  height: 60px; /* Adjust to 60px */
  border: none;
  cursor: pointer;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  outline: none;
  align-self: flex-end; /* Align to the bottom of the parent container */
}

.play-button:hover {
  opacity: 0.9;
}

.play-button:active {
  transform: translateY(1px);
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-icon, .pause-icon {
  width: 40px;
  height: 40px;
  fill: white;
}

/* Navigation buttons container */
.nav-buttons-container {
  position: relative;
  margin: 0 15px;
  width: 75px; /* Same width as the play button */
  height: 60px; /* Same height as the play button */
  display: flex;
  flex-direction: column; /* Vertical layout */
  justify-content: space-between; /* Space-between to ensure buttons are flush with container edges */
  align-items: center; /* Horizontally center */
  align-self: flex-end; /* Align to the bottom within the parent container */
  padding: 4px 0; /* 4px padding top and bottom */
  box-sizing: border-box; /* Ensure padding is included in total height */
  max-width: 450px; /* Limit max width */
  left: 0; /* Reset potential positioning */
  right: 0; /* Reset potential positioning */
}

/* Outer frame styles */
.nav-buttons-frame {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

/* Previous/Next button styles */
.prev-button, .next-button {
  position: relative;
  z-index: 2;
  background: transparent; /* Remove background color */
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  width: 67px; /* Same width as container */
  height: 25px; /* Adjust height to fit container */
  display: flex;
  align-items: stretch; /* Ensure child elements stretch to fill the container */
  justify-content: stretch; /* Ensure child elements stretch to fill the container */
  transition: opacity 0.2s ease;
  outline: none;
  overflow: visible; /* Allow content to overflow to show the full SVG */
  border-radius: 0; /* Remove potential border-radius */
}

/* Remove extra margin from buttons, controlled by container padding */
.prev-button, .next-button {
  margin: 0;
}

.prev-button:hover, .next-button:hover {
  opacity: 0.9;
}

.prev-button:active, .next-button:active {
  opacity: 0.8;
  transform: translateY(1px);
}

.prev-button:disabled, .next-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading state */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 300px;
}

.loading-state p {
  color: white;
  font-size: 20px;
}

/* Responsive adjustments */
/* Styles for medium screen devices */
@media (max-width: 767px) {
  .body-container {
    padding-top: 80px;
    padding-left: 0;
    padding-right: 0;
    display: flex;
    justify-content: center;
  }
  
  .player-all {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc((100vh - 580px)/3); /* Add adaptive spacing */
  }
  
  .player-button {
    margin: 0 auto;  /* Horizontally center */
    transform: scale(0.9);
    width: 90%;  /* Adjust width to fit mobile */
    justify-content: center;  /* Center inner elements */
    padding: 10px 0;  /* Remove left/right padding */
    box-sizing: border-box;  /* Ensure padding is included in total width */
    max-width: 500px;  /* Limit max width */
    left: 0;  /* Reset potential positioning */
    right: 0;  /* Reset potential positioning */
  }
  
  /* Adjust inner element margins for a more compact layout */
  .play-button {
    margin: 0 15px;
  }
  
  .info-container {
    margin: 0 15px;
  }
  
  .nav-buttons-container {
    margin: 0 15px;
  }
  
  .player-view {
    width: 450px;
    padding: 0;
    position: relative !important; /* Override absolute positioning from desktop styles */
    right: 0 !important; /* Reset right positioning */
    margin-right: 10vw !important; /* Keep a distance of 10% of the viewport width from the right edge */
  }
  .player-record {
    padding: 0;
  }
  .player-content {
    flex-direction: column;
    gap: 0;
    height: auto;
    min-height: 0;
  }

  .album-cover {
    width: 320px;
    height: 320px;
  }
  
  .album-title {
    max-width: 320px;
  }
  
  .track-title {
    max-width: 320px;
  }
  
  .record-axis {
    display: none;
  }
  
  .vinyl-svg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width:342px;
    height: 342px;
  }

  /* Adjust tone arm size and position */
  .tone-arm {
    top: 10px;
    right: 35px;
    transform: scale(0.9);
  }

  .tone-arm-svg {
    width: 76.5px;
  }
  
  /* Mobile-specific styles */
  /* Hide album cover container */
  .cover {
    display: none;
  }
  
  /* Hide record center label area */
  .record-album-title {
    display: none;
  }
  
  /* Center player-record on mobile */
  .player-record {
    position: relative;
    right: auto;
    left: auto;
    margin: 0 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  /* Add album cover to the center of the record */
  .record-container {
    position: relative;
    width: 342px;
    height: 342px;
  }
  
  .record-container::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 108px;
    height: 108px;
    border-radius: 50%;
    background-image: var(--album-cover-url);
    background-size: cover;
    background-position: center;
    z-index: 4;
    /* Add black border */
    border: 2px solid #000;
    /* Add dark overlay */
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.6);
    /* Slightly reduce brightness, increase contrast */
    filter: brightness(0.8) contrast(1.2);
    /* Rotate with the record */
    animation: rotate 20s linear infinite;
    animation-play-state: paused;
  }
  
  /* When the record spins, the cover image spins too */
  .player-record.playing .record-container::after {
    animation-play-state: running;
  }
}

</style>
