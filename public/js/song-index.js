// Song Index JavaScript - Fetches JSON, renders songs, handles search & filter

let allSongs = [];
let currentFilter = 'all';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', function() {
    fetchSongs();
    setupFilterTabs();
});

// Fetch songs from JSON file
async function fetchSongs() {
    try {
        const response = await fetch('../search/songs-index.json');
        const data = await response.json();

        // Combine main and children songs with category tag
        allSongs = [
            ...data.main.map(s => ({ ...s, category: 'main' })),
            ...data.children.map(s => ({ ...s, category: 'children' }))
        ];

        renderSongs(allSongs);
    } catch (error) {
        console.error('Error loading songs:', error);
        document.getElementById('ind').innerHTML = '<p style="text-align:center;color:red;">Error loading songs</p>';
    }
}

// Setup filter tab buttons
function setupFilterTabs() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Set filter and re-render
            currentFilter = this.dataset.filter;
            filterAndRender();
        });
    });
}

// Search function - called from input onkeyup
function serFunction() {
    searchTerm = document.getElementById('ser').value.toLowerCase().trim();
    filterAndRender();
}

// Combined filter and render
function filterAndRender() {
    let filtered = allSongs;

    // Apply category filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(s => s.category === currentFilter);
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(s => {
            return s.title.toLowerCase().includes(searchTerm) ||
                   (s.eng_title && s.eng_title.toLowerCase().includes(searchTerm)) ||
                   String(s.id).includes(searchTerm) ||
                   (s.ch && s.ch.toLowerCase().includes(searchTerm));
        });
    }

    renderSongs(filtered);
}

// Render songs to DOM
function renderSongs(songs) {
    const container = document.getElementById('ind');
    const countEl = document.getElementById('results-count');

    // Update count
    const mainCount = songs.filter(s => s.category === 'main').length;
    const childrenCount = songs.filter(s => s.category === 'children').length;

    if (currentFilter === 'all') {
        countEl.textContent = `Found ${songs.length} songs (${mainCount} hymns, ${childrenCount} children)`;
    } else if (currentFilter === 'main') {
        countEl.textContent = `Found ${mainCount} hymns`;
    } else {
        countEl.textContent = `Found ${childrenCount} children songs`;
    }

    if (songs.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;">No songs found</p>';
        return;
    }

    // Generate HTML for each song
    let html = '';

    songs.forEach(song => {
        const isChildren = song.category === 'children';

        // Build URL based on category
        const url = isChildren
            ? `songs-abaana.html?song=${song.id}`
            : `/songs.html?song=${song.id}`;

        // Build song number display
        const numberDisplay = isChildren
            ? `Abaana ${song.id.replace('abaana_', '')}`
            : `<b>${song.id}</b>`;

        // Build extra info (CH number or children badge)
        const extraInfo = isChildren
            ? '<span class="children-badge">👶 Children</span>'
            : (song.ch ? `<br>${song.ch}` : '');

        // Get Doh if available
        const dohInfo = song.doh ? `<br><b>Doh is ${song.doh}</b>` : '';

        html += `
            <a href="${url}">
                <div class="tittle ${isChildren ? 'children-song' : ''}">
                    <div class="No">${numberDisplay}${extraInfo}</div>
                    <div class="song">
                        <b>${song.title}</b><br>
                        ${song.eng_title ? song.eng_title : ''}
                    </div>
                    <div class="sign">${song.doh || '-'}</div>
                    <div class="comp">${song.composer || ''}${dohInfo}</div>
                </div>
            </a>
        `;
    });

    container.innerHTML = html;
}
