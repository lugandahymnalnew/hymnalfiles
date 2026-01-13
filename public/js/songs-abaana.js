// Songs-Abaana JavaScript - Fetches and renders children songs from API

let currentSongId = 1;
let totalSongs = 29;
let songData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get song ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentSongId = parseInt(urlParams.get('song')) || 1;

    // Ensure valid range
    if (currentSongId < 1) currentSongId = 1;
    if (currentSongId > totalSongs) currentSongId = totalSongs;

    loadSong(currentSongId);
});

// Load a specific song
async function loadSong(songId) {
    showLoading(true);

    try {
        const response = await fetch(`/oneChildrenSong/${songId}`);
        const result = await response.json();

        if (result.data && result.data !== "Song not found") {
            songData = result.data;
            renderSong(songData);
        } else {
            document.getElementById('txt').innerHTML = '<p style="text-align:center;color:red;">Song not found</p>';
        }
    } catch (error) {
        console.error('Error loading song:', error);
        document.getElementById('txt').innerHTML = '<p style="text-align:center;color:red;">Error loading song</p>';
    }

    showLoading(false);
}

// Render song to DOM
function renderSong(song) {
    // Update header
    document.getElementById('number').textContent = `Abaana ${song.id}`;
    document.getElementById('song').textContent = song.title;
    document.getElementById('EngTit').textContent = song.english_title || '';
    document.getElementById('doh').textContent = song.doh ? `Key: ${song.doh}` : '';

    // Build song content
    let content = '';

    song.stanzas.forEach(stanza => {
        // Add stanza label (Chorus gets special styling)
        if (stanza.type === 'chorus') {
            content += '<span style="color: #e91e63; font-weight: bold;">CHORUS</span>\n';
        } else {
            content += `<span style="color: #333;">Verse ${stanza.number}</span>\n`;
        }

        // Add stanza lines
        stanza.lines.forEach(line => {
            content += `${line}\n`;
        });

        content += '\n'; // Add spacing between stanzas
    });

    document.getElementById('txt').textContent = content.trim();
}

// Navigate to previous/next song
function navigateSong(direction) {
    currentSongId += direction;

    // Wrap around
    if (currentSongId > totalSongs) currentSongId = 1;
    if (currentSongId < 1) currentSongId = totalSongs;

    // Update URL without reloading
    const newUrl = `${window.location.pathname}?song=${currentSongId}`;
    window.history.pushState({songId: currentSongId}, '', newUrl);

    loadSong(currentSongId);
}

// Handle browser back/forward
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.songId) {
        currentSongId = event.state.songId;
        loadSong(currentSongId);
    }
});

// Change font size
function changeFontSize() {
    const size = document.getElementById('siz').value;
    document.getElementById('txt').style.fontSize = `${size}rem`;
}

// Show/hide loading spinner
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}
