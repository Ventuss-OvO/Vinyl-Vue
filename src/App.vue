<template>
  <div class="app-container relative">
    <!-- Fixed title area -->
    <div class="title-container fixed z-10 top-0 left-0 right-0">
      <h1>Vinyl Vue</h1>
    </div>

    <!-- Content area - only this part changes with the route -->
    <div class="content-container">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
  
  <!-- Footer area - fixed at the bottom -->
  <div class="footer fixed z-10 bottom-0 left-0 right-0">
    <div class="flex justify-end w-full px-4 items-center">
      <p class="text-sm footer-item flex items-center">
        <span class="online-dot"></span>
        Listening: {{ statsLoading ? '-' : (typeof activeUsers === 'number' ? activeUsers + 1 : activeUsers) }}
      </p>
      <p class="text-sm footer-item">|</p>
      <p class="text-sm footer-item">Today: {{ statsLoading ? '-' : (typeof todayVisitors === 'number' ? Math.max(todayVisitors, 1) : todayVisitors) }}</p>
      <p class="text-sm footer-item">|</p>
      <p class="text-sm footer-item">History: {{ statsLoading ? '-' : totalVisitors }}</p>
      <p class="text-sm footer-item">|</p>
      <p class="text-sm footer-item"><a href="https://ventuss.xyz" target="_blank" class="github-link">crafted by ventuss</a></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Statistics data
const totalVisitors = ref<number | string>('-');
const todayVisitors = ref<number | string>('-');
const activeUsers = ref<number | string>('-');
const statsLoading = ref<boolean>(true);
const statsError = ref<string | null>(null);

// Fetch statistics data
const fetchStats = async () => {
  try {
    statsLoading.value = true;
    statsError.value = null;
    
    // Fetch real data from the Worker
    const statsApiUrl = import.meta.env.VITE_STATS_API_URL || 'https://vinyl-vue-stats.ventuss.workers.dev/api/stats';
    const response = await fetch(statsApiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    
    const data = await response.json();
    totalVisitors.value = data.totalVisitors || 0;
    todayVisitors.value = data.todayVisitors || 0;
    // Store the original number of active users, will be incremented by 1 for display
    activeUsers.value = data.activeUsers || 0;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    statsError.value = error instanceof Error ? error.message : String(error);
    // Set default values on error
    totalVisitors.value = '-';
    todayVisitors.value = '-';
    activeUsers.value = '-';
  } finally {
    statsLoading.value = false;
  }
};

// Periodically refresh statistics
const setupStatsRefresh = () => {
  // Initial load
  fetchStats();
  
  // Refresh data every 60 seconds
  const intervalId = setInterval(fetchStats, 60000);
  
  // Clear the timer when the component is unmounted
  onUnmounted(() => {
    clearInterval(intervalId);
  });
};

// Fetch stats when the component is mounted
onMounted(() => {
  setupStatsRefresh();
});
</script>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  background-color: #121212;
  color: #f3f3f3;
  font-family: 'Noto Serif SC', serif;
  overflow-x: hidden;
}

.app-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
}

/* Page transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Desktop Styles ===== */

/* Title styles */
.title-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  width: 100%;
  display: flex;
  align-items: center;
  padding-left: 60px;
  z-index: 1000; /* Ensure it's on the top layer */
  box-sizing: border-box;
}

/* Title styles */
.title-container h1 {
  color: #FFFFFF;
  width: 150px;
  height: 40px;
  font-size: 32px;
  font-family: 'Pacifico', cursive;
  line-height: 40px;
  margin: 30px 0;
  padding: 0;
  text-align: left;
}

/* Content area styles */
.content-container {
  position: fixed;
  top: 120px; /* Same height as the title container */
  left: 30px;
  right: 30px;
  bottom: 60px; /* Leave space for the footer */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center; /* Vertically center */
}

/* Footer styles */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 60px;
  height: 60px;
  width: 100%;
  display: flex;
  align-items: center;
  color: #bbb;
  font-size: 12px;
  z-index: 1000; /* Ensure it's on the top layer */
  box-sizing: border-box;
}

.footer-item {
  margin-left: 8px;
  white-space: nowrap;
}

.online-dot {
  width: 5px;
  height: 5px;
  background-color: #4CAF50; /* Green */
  border-radius: 50%;
  display: inline-block;
  align-self: center;
  margin-right: 8px;
}

.github-link {
  color: #bbb;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.github-link:hover {
  color: #fff;
  text-decoration: underline;
}

/* ===== Mobile Styles ===== */
@media (max-width: 767px) {
  /* Mobile title styles */
  .title-container {
    height: 80px;
    padding-left: 30px;
  }
  
  .title-container h1 {
    width: 100%;
    font-size: 20px;
    margin: 0;
    text-align: left;
    margin-top: 10px;
  }

  /* Mobile content area styles */
  .content-container {
    top: 80px; /* Same height as the mobile title container */
    left: 30px;
    right: 30px;
    bottom: 50px; /* Leave space for the mobile footer */
  }
  
  /* Mobile footer styles */
  .footer {
    height: 50px;
    padding: 0 15px;
  }
  
  .footer-item {
    font-size: 10px;
    margin-left: 5px;
  }
  
  .online-dot {
    width: 6px;
    height: 6px;
    margin-right: 3px;
  }
  
  /* Adjust layout on very small screens */
  @media (max-width: 480px) {
    .footer .flex {
      flex-direction: row;
      justify-content: flex-end;
      align-items: center;
      height: 100%;
    }
    
    .footer-item {
      font-size: 9px;
      margin-left: 3px;
    }
    
    .online-dot {
      width: 5px;
      height: 5px;
      margin-right: 2px;
    }
  }
}
</style>
