
let db;
const urlParams = new URLSearchParams(window.location.search);
let hymnal = urlParams.get('song');

async function initDatabase() {
    const SQL = await window.initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const savedDb = localStorage.getItem("myDatabase");
    if (savedDb) {
        db = new SQL.Database(new Uint8Array(JSON.parse(savedDb)));
        console.log("Loaded database from localStorage");
        
    } else {
        db = new SQL.Database();
        db.run(`CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY, 
            number TEXT UNIQUE,
            song TEXT, 
            EngNo TEXT,
            EngTit TEXT,
            composer TEXT,
            doh TEXT,
            signUp TEXT,
            signDown TEXT,
            luganda_lyrics TEXT DEFAULT '{"none":["Luganda lyrics not found"]}', 
            english_lyrics TEXT DEFAULT '{"none":["English lyrics not found"]}'
        );`);
        saveDatabase();
        console.log("New database created");
        await fetchAndStoreSongs();
        await fetchAndStoreEnglishSongs();
    }
    if(hymnal == null){
        window.location.href = "/src/menu.html";
    }
    loadSong(hymnal);
    oncSet();
    document.getElementById("spinnerHolder").classList.add("hide-div");        
}

async function fetchAndStoreSongs() { 
    try {
        const response = await fetch("/lugSongs"); // Replace with your API
        const songs = await response.json();
        // console.log(songs);
        songs.data.forEach(song => {
            db.run(`INSERT OR IGNORE INTO songs (number, song, EngNo, EngTit, composer, doh, signUp, signDown, luganda_lyrics) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [song .number, song.song, song.EngNo, song.EngTit, song.composer, song.doh, song.signUp, song.signDown, JSON.stringify(song.lyrics)]);
        });

        saveDatabase();
        console.log("Fetched and stored Luganda songs successfully!");
    } catch (error) {
        console.error("Error fetching Luganda songs:", error);
    }
}

async function fetchAndStoreEnglishSongs() {
    try {
        const response = await fetch("/engSongs");
        const songs = await response.json();

        for (const song of songs.data) {
            db.run(`UPDATE songs SET english_lyrics = ? WHERE number = ?;`,
                [JSON.stringify(song.english), song.number]);
        }

        saveDatabase();
        console.log("Fetched and stored English songs successfully!");
    } catch (error) {
        console.error("Error fetching English songs:", error);
    }
}

function loadSong(dum = null) {
    // console.log(dum)
    const songNumber = document.getElementById("songNumber").value;

    const language = localStorage.getItem("language") || "luganda";
    if (!songNumber && dum==null) {
        alert("Please enter a song number.");
        return;
    }
    document.getElementById("songNumber").value = "";
    const stmt = db.prepare("SELECT * FROM songs WHERE number = ?");
    stmt.bind([songNumber || dum]);

    if (!stmt.step()) {
        alert("Song not found.");
        return;
    }

    const song = stmt.getAsObject();

    const numberElement = document.getElementById("number");
    const engNoElement = document.getElementById("EngNo");
    const songElement = document.getElementById("song");
    const engTitElement = document.getElementById("EngTit");
    const anElement = document.querySelector(".An"); // Using querySelector for class
    const signUpElement = document.getElementById("signUp");
    const signDownElement = document.getElementById("signDown");
    const composerElement = document.getElementById("composer");
    const dohElement = document.getElementById("doh");
    const lyricsDisplay = document.getElementById("txt");

    numberElement.textContent = song.number;
    engNoElement.textContent = song.EngNo || "";
    songElement.textContent = song.song;
    document.title = song.song;
    // console.log(song.EngTit)
    engTitElement.textContent = song.EngTit;
    // anElement.textContent =  song.An ||"";
    setPrevNext(song.number);
    hymnal = song.number;
    player1Update();

    composerElement.textContent = song.composer || "Unknown";
    dohElement.textContent = song.doh || "";
    signUpElement.textContent = song.signUp || "";
    signDownElement.textContent = song.signDown || "";

    lyricsDisplay.innerHTML = language === "luganda" ? 
        formatLyrics(JSON.parse(song.luganda_lyrics)) : formatLyrics(JSON.parse(song.english_lyrics));
    lyricsDisplay.innerHTML = "\n"+ lyricsDisplay.innerHTML +"\n\n";
    document.querySelectorAll('.hiden-1').forEach(element => {
        element.style.display = 'flex';
    });
}

function formatLyrics(data) {
    // console.log(data);
    
    return Object.entries(data).map(([key, verses]) => key.includes("orus") ? `${verses.join("\n")}\n` : `${key}:\n${verses.join("\n")}\n`).join("\n");
}

function changeFontSize() {
    // const size = document.getElementById("siz").value;
    // document.getElementById("txt").style.fontSize = `${size}em`;
    onc(true);
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

function showSongs() {
    const result = db.exec("SELECT * FROM songs;");
    const songList = document.getElementById("songList");
    songList.innerHTML = result.length ? 
        result[0].values.map(song => `<li>ID: ${song[0]} - ${song[2]} (Composer: ${song[5]})</li>`).join("") 
        : "<li>No songs found</li>";
}

initDatabase();
function nextSong(){
    // console.log(nextR)
    loadSong(nextR.replace('/',"").replace(".html",""));
}
function prevSong(){
    // console.log(prevL)
    loadSong(prevL.replace('/',"").replace(".html",""));
}

function changeLanguage(){
    // Retrieve the current language from localStorage or default to 'english'
    let currentLanguage = localStorage.getItem('language') || 'english';

    // Toggle the language between 'english' and 'luganda'
    currentLanguage = currentLanguage === 'english' ? 'luganda' : 'english';

    // Update the button text
    $('.lang').text(currentLanguage == 'english' ? 'luganda' : 'english');

    // Save the updated language to localStorage
    localStorage.setItem('language', currentLanguage);
    loadSong(hymnal);

}