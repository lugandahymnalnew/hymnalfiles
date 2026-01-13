// Songs-Abaana Database JavaScript - Uses SQLite localStorage like adult songs

let db;
let currentSongId = 1;
const totalSongs = 29;

document.addEventListener('DOMContentLoaded', async function() {
    // Get song ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentSongId = parseInt(urlParams.get('song')) || 1;

    // Ensure valid range
    if (currentSongId < 1) currentSongId = 1;
    if (currentSongId > totalSongs) currentSongId = totalSongs;

    await initDatabase();
});

async function initDatabase() {
    const SQL = await window.initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const savedDb = localStorage.getItem("myDatabase");
    if (savedDb) {
        db = new SQL.Database(new Uint8Array(JSON.parse(savedDb)));
        console.log("Loaded database from localStorage");

        // Check if children_songs table exists
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='children_songs'");
        if (result.length === 0) {
            // Table doesn't exist, create and populate
            await createChildrenTable();
        }
    } else {
        db = new SQL.Database();
        await createChildrenTable();
        saveDatabase();
    }

    // Load the current song
    loadSong(currentSongId);

    // Hide loading spinner
    document.getElementById("spinnerHolder").classList.add("hide-div");
}

async function createChildrenTable() {
    db.run(`CREATE TABLE IF NOT EXISTS children_songs (
        id INTEGER PRIMARY KEY,
        song_id INTEGER UNIQUE,
        title TEXT,
        english_title TEXT,
        doh TEXT,
        stanzas TEXT
    );`);

    // Fetch and store children songs
    await fetchAndStoreChildrenSongs();
    saveDatabase();
    console.log("Children songs table created and populated");
}

async function fetchAndStoreChildrenSongs() {
    try {
        const response = await fetch("/allChildrenSongs");
        const result = await response.json();
        const songs = result.data;

        songs.forEach(song => {
            db.run(`INSERT OR IGNORE INTO children_songs (song_id, title, english_title, doh, stanzas)
                    VALUES (?, ?, ?, ?, ?);`,
                [song.id, song.title, song.english_title, song.doh, JSON.stringify(song.stanzas)]);
        });

        console.log("Fetched and stored Children songs successfully!");
    } catch (error) {
        console.error("Error fetching Children songs:", error);
    }
}

function loadSong(songId) {
    const stmt = db.prepare("SELECT * FROM children_songs WHERE song_id = ?");
    stmt.bind([songId]);

    if (!stmt.step()) {
        document.getElementById('txt').innerHTML = '<p style="text-align:center;color:red;">Song not found</p>';
        return;
    }

    const song = stmt.getAsObject();
    renderSong(song);
    stmt.free();
}

function renderSong(song) {
    // Update header
    document.getElementById('number').textContent = `Abaana ${song.song_id}`;
    document.getElementById('song').textContent = song.title;
    document.getElementById('EngTit').textContent = song.english_title || '';
    document.getElementById('doh').textContent = song.doh ? `Key: ${song.doh}` : '';

    // Parse stanzas from JSON
    const stanzas = JSON.parse(song.stanzas);

    // Build song content
    let content = '';

    stanzas.forEach(stanza => {
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

    document.getElementById('txt').innerHTML = `<pre>${content.trim()}</pre>`;

    // Show elements
    document.querySelectorAll('.hiden-1').forEach(element => {
        element.style.display = 'flex';
    });
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
    const txt = document.getElementById('txt');
    if (txt) {
        txt.style.fontSize = `${size}rem`;
    }
}

function saveDatabase() {
    const data = db.export();
    localStorage.setItem("myDatabase", JSON.stringify(Array.from(data)));
    console.log("Database saved to localStorage");
}

function deleteDatabase() {
    localStorage.removeItem("myDatabase");
    console.log("Database deleted from localStorage");
}
