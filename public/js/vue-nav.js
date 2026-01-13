// Vue 3 Navigation Component with Drawer and Smooth Transitions
// Works alongside existing jQuery code for progressive enhancement

(function() {
    'use strict';

    // Vue 3 App for Navigation
    const { createApp, ref, computed, watch, onMounted, nextTick } = Vue;

    const VueNavApp = {
        setup() {
            // State
            const isDrawerOpen = ref(false);
            const searchQuery = ref('');
            const activeCategory = ref('all');
            const currentLanguage = ref(localStorage.getItem('language') || 'luganda');
            const fontSize = ref(parseFloat(localStorage.getItem('fontSize')) || 2);
            const allSongs = ref([]);
            const filteredSongs = ref([]);
            const isLoading = ref(true);

            // Categories
            const categories = [
                { id: 'all', label: 'All Songs', icon: '📚' },
                { id: 'main', label: 'Main Hymns', icon: '🎵' },
                { id: 'children', label: 'Children', icon: '👶' }
            ];

            // Computed counts
            const songCounts = computed(() => {
                const main = allSongs.value.filter(s => s.category === 'main').length;
                const children = allSongs.value.filter(s => s.category === 'children').length;
                return { main, children, total: allSongs.value.length };
            });

            // Filter and search songs
            const filterSongs = () => {
                let result = allSongs.value;

                // Category filter
                if (activeCategory.value !== 'all') {
                    result = result.filter(s => s.category === activeCategory.value);
                }

                // Search filter
                if (searchQuery.value.trim()) {
                    const query = searchQuery.value.toLowerCase().trim();
                    result = result.filter(s =>
                        s.title.toLowerCase().includes(query) ||
                        (s.eng_title && s.eng_title.toLowerCase().includes(query)) ||
                        String(s.id).includes(query) ||
                        (s.ch && s.ch.toLowerCase().includes(query))
                    );
                }

                filteredSongs.value = result;
            };

            // Watch for changes
            watch([searchQuery, activeCategory], () => {
                filterSongs();
            });

            // Fetch songs
            const fetchSongs = async () => {
                try {
                    const response = await fetch('../search/songs-index.json');
                    const data = await response.json();

                    allSongs.value = [
                        ...data.main.map(s => ({ ...s, category: 'main' })),
                        ...data.children.map(s => ({ ...s, category: 'children' }))
                    ];

                    filterSongs();
                } catch (error) {
                    console.error('Error loading songs:', error);
                } finally {
                    isLoading.value = false;
                }
            };

            // Toggle drawer
            const toggleDrawer = () => {
                isDrawerOpen.value = !isDrawerOpen.value;
            };

            // Close drawer
            const closeDrawer = () => {
                isDrawerOpen.value = false;
            };

            // Set category
            const setCategory = (cat) => {
                activeCategory.value = cat;
                closeDrawer();
            };

            // Toggle language
            const toggleLanguage = () => {
                currentLanguage.value = currentLanguage.value === 'luganda' ? 'english' : 'luganda';
                localStorage.setItem('language', currentLanguage.value);
            };

            // Change font size
            const changeFontSize = (delta) => {
                const newSize = Math.max(1, Math.min(5, fontSize.value + delta));
                fontSize.value = newSize;
                localStorage.setItem('fontSize', newSize);
                document.getElementById('txt')?.style?.setProperty('font-size', `${newSize}rem`);
            };

            // Navigate to song
            const navigateToSong = (song) => {
                const url = song.category === 'children'
                    ? `songs-abaana.html?song=${song.id}`
                    : `/songs.html?song=${song.id}`;
                window.location.href = url;
            };

            // Format song number display
            const formatSongNumber = (song) => {
                if (song.category === 'children') {
                    return `Abaana ${song.id.replace('abaana_', '')}`;
                }
                return song.id;
            };

            // Get Doh display
            const getDohDisplay = (song) => {
                return song.doh || '-';
            };

            onMounted(() => {
                fetchSongs();
            });

            return {
                isDrawerOpen,
                searchQuery,
                activeCategory,
                currentLanguage,
                fontSize,
                allSongs,
                filteredSongs,
                isLoading,
                categories,
                songCounts,
                toggleDrawer,
                closeDrawer,
                setCategory,
                toggleLanguage,
                changeFontSize,
                navigateToSong,
                formatSongNumber,
                getDohDisplay
            };
        },
        template: `
            <div class="vue-nav-container">
                <!-- Hamburger Menu Button -->
                <button class="nav-hamburger" @click="toggleDrawer" aria-label="Open menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <!-- Navigation Drawer -->
                <transition name="drawer-slide">
                    <div v-if="isDrawerOpen" class="nav-drawer-overlay" @click="closeDrawer"></div>
                </transition>

                <transition name="drawer-slide">
                    <div v-if="isDrawerOpen" class="nav-drawer">
                        <div class="drawer-header">
                            <h3>Ennyimba Za Kristo</h3>
                            <button class="drawer-close" @click="closeDrawer">&times;</button>
                        </div>

                        <!-- Quick Search in Drawer -->
                        <div class="drawer-search">
                            <input
                                type="text"
                                v-model="searchQuery"
                                placeholder="Search songs..."
                                class="drawer-search-input"
                            >
                        </div>

                        <!-- Category Tabs -->
                        <div class="drawer-categories">
                            <button
                                v-for="cat in categories"
                                :key="cat.id"
                                :class="['category-btn', { active: activeCategory === cat.id }]"
                                @click="setCategory(cat.id)"
                            >
                                <span class="cat-icon">{{ cat.icon }}</span>
                                <span>{{ cat.label }}</span>
                                <span class="cat-count" v-if="cat.id !== 'all'">
                                    {{ cat.id === 'main' ? songCounts.main : songCounts.children }}
                                </span>
                            </button>
                        </div>

                        <!-- Settings -->
                        <div class="drawer-settings">
                            <h4>Settings</h4>

                            <!-- Language Toggle -->
                            <div class="setting-row">
                                <span>Language</span>
                                <button @click="toggleLanguage" class="lang-toggle-btn">
                                    {{ currentLanguage === 'luganda' ? 'Luganda' : 'English' }}
                                </button>
                            </div>

                            <!-- Font Size -->
                            <div class="setting-row">
                                <span>Font Size</span>
                                <div class="font-controls">
                                    <button @click="changeFontSize(-0.2)">A-</button>
                                    <span>{{ fontSize.toFixed(1) }}</span>
                                    <button @click="changeFontSize(0.2)">A+</button>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Links -->
                        <div class="drawer-links">
                            <a href="menu.html">Back to Menu</a>
                            <a href="#" @click.prevent="toggleLanguage">
                                Switch to {{ currentLanguage === 'luganda' ? 'English' : 'Luganda' }}
                            </a>
                        </div>
                    </div>
                </transition>

                <!-- Song List with Transitions -->
                <div class="vue-song-list">
                    <!-- Results Count -->
                    <div class="results-count vue-results">
                        <span v-if="activeCategory === 'all'">
                            Found {{ filteredSongs.length }} songs ({{ songCounts.main }} hymns, {{ songCounts.children }} children)
                        </span>
                        <span v-else-if="activeCategory === 'main'">
                            Found {{ songCounts.main }} hymns
                        </span>
                        <span v-else>
                            Found {{ songCounts.children }} children songs
                        </span>
                    </div>

                    <!-- Loading -->
                    <div v-if="isLoading" class="vue-loading">
                        <div class="spinner-1"></div>
                        <p>Loading songs...</p>
                    </div>

                    <!-- Song List -->
                    <transition-group name="song-list" tag="div" id="ind">
                        <a
                            v-for="song in filteredSongs"
                            :key="song.id"
                            :href="song.category === 'children' ? 'songs-abaana.html?song=' + song.id : '/songs.html?song=' + song.id"
                            class="song-item-link"
                        >
                            <div :class="['tittle', { 'children-song': song.category === 'children' }]">
                                <div class="No">
                                    <b>{{ formatSongNumber(song) }}</b>
                                    <span v-if="song.category === 'children'" class="children-badge">👶</span>
                                    <span v-else-if="song.ch" v-html="song.ch"></span>
                                </div>
                                <div class="song">
                                    <b>{{ song.title }}</b>
                                    <br v-if="song.eng_title">
                                    <span v-if="song.eng_title">{{ song.eng_title }}</span>
                                </div>
                                <div class="sign">{{ getDohDisplay(song) }}</div>
                                <div class="comp">{{ song.composer || '' }}</div>
                            </div>
                        </a>
                    </transition-group>

                    <!-- No Results -->
                    <div v-if="!isLoading && filteredSongs.length === 0" class="no-results">
                        <p>No songs found</p>
                    </div>
                </div>
            </div>
        `
    };

    // Create and mount Vue app when DOM is ready
    function initVueNav() {
        const container = document.getElementById('vue-nav-app');
        if (container) {
            createApp(VueNavApp).mount('#vue-nav-app');
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVueNav);
    } else {
        initVueNav();
    }

    // Export for manual initialization
    window.initVueNav = initVueNav;
})();
