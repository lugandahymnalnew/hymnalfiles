const db = require('./mongoDBApi');
const sqlite3 = require('sqlite3');

const sqlitedb = new sqlite3.Database('public/db/songs.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Song table for storing the song metadata
sqlitedb.run(`
    CREATE TABLE IF NOT EXISTS song_table (
        song_id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        eng_title TEXT,
        an TEXT,
        up TEXT,
        down TEXT
    );
`);

// Stanza table to store stanzas, including type for chorus/verse (0 = chorus, 1 = verse)
sqlitedb.run(`
    CREATE TABLE IF NOT EXISTS stanza_en_table (
        stanza_id INTEGER PRIMARY KEY AUTOINCREMENT,
        stanza_number INTEGER NOT NULL,
        song_id TEXT NOT NULL,
        type INTEGER NOT NULL CHECK (type IN (0, 1)), -- 0 for chorus, 1 for verse
        FOREIGN KEY(song_id) REFERENCES song_table(song_id)
    );
`);

// Lines table to store the lines of each stanza
sqlitedb.run(`
    CREATE TABLE IF NOT EXISTS lines_en_table (
        line_id INTEGER PRIMARY KEY AUTOINCREMENT,
        stanza_id INTEGER NOT NULL,
        line TEXT NOT NULL,
        FOREIGN KEY(stanza_id) REFERENCES stanza_table(stanza_id)
    );
`);

// Create an index on the song title for faster searches
sqlitedb.run(`
    CREATE INDEX IF NOT EXISTS idx_title ON song_table (title);
`);

// const sampleSong = {
//     "_id": "64ccfc7c6ebaa35ab3dd4be3",
//     "An": "",
//     "EngNo": "CH 73",
//     "EngTit": "Holy, Holy, Holy",
//     "composer": "John B.Dykes",
//     "doh": "Doh is E",
//     "lyrics": {
//         "stanza 1": [
//             "Gw'oli mutukuvu, Ayinza byonna!",
//             "Buli ku nkya tunaakutenderezanga;",
//             "Oli Mutukuvu! W'akisa wa maanyi!",
//             "Katond(a) afuga ebintu byonna"
//         ],
//         "stanza 2": [
//             "Gw'oli Mutukuvu, Bakutendereza,",
//             "Bamalayika bo bakuvunnamira;",
//             "(E)nkumi n'obukumi, Bakusinza wonna,",
//             "Gwe (e)yaliwo era olibaawo."
//         ],
//         "stanza 3": [
//             "Gw'oli Mutukuvu, Newaankubadde,",
//             "Nga tetukulaba n'amaaso g'obuntu;",
//             "Gw'oli Mutukuvu, Tewali mulala,",
//             "Atuukiridde mu maanyi gonna"
//         ],
//         "stanza 4": [
//             "Gw'oli Mutukuvu, Ayinza byonna!",
//             "Emirimu gyo gitenda erinnya lyo;",
//             "Gw'oli Mutukuvu, W'akisa wa maanyi;",
//             "Katond(a) omu, Ali mu busatu."
//         ]
//     },
//     "number": "1",
//     "signDown": "4",
//     "signUp": "4",
//     "song": "Gw'oli Mutukuvi"
// };

// Step 1: Insert the song metadata into song_table
const insertSongQuery = `
    UPDATE song_table SET doh = ? WHERE title = ?
`;

// sqlitedb.run(insertSongQuery, [
//     sampleSong.number,
//     sampleSong.song,  // title
//     sampleSong.composer, // artist (composer)
//     sampleSong.EngTit, // English title
//     sampleSong.An, // An (if needed)
//     sampleSong.signUp, // Up sign
//     sampleSong.signDown // Down sign
// ], function(err) {
//     if (err) {
//         return console.error(err.message);
//     }

//     console.log(`Inserted song with id ${sampleSong._id}`);
    
//     // Step 2: Insert the stanzas into stanza_table
//     let stanzaNumber = 1;
//     for (let stanza in sampleSong.lyrics) {
//         const isChorus = stanza.toLowerCase().includes('chorus') ? 0 : 1; // 0 if chorus, 1 otherwise
//         const insertStanzaQuery = `
//             INSERT INTO stanza_table (stanza_number, song_id, type)
//             VALUES (?, ?, ?)
//         `;
//         sqlitedb.run(insertStanzaQuery, [stanzaNumber, sampleSong.number, isChorus], function(err) {
//             if (err) {
//                 return console.error(err.message);
//             }
//             const stanzaId = this.lastID; // Get the inserted stanza's id
            
//             // Step 3: Insert the lines for this stanza into lines_table
//             const lines = sampleSong.lyrics[stanza];
//             lines.forEach((line) => {
//                 const insertLineQuery = `
//                     INSERT INTO lines_table (stanza_id, line)
//                     VALUES (?, ?)
//                 `;
//                 sqlitedb.run(insertLineQuery, [stanzaId, line], function(err) {
//                     if (err) {
//                         console.error(err.message);
//                     } else {
//                         console.log(`Inserted line into stanza ${stanzaNumber}`);
//                     }
//                 });
//             });
//         });
//         stanzaNumber++;
//     }
// });

async function getSongs(){
    const songs = await db.readRows({}, "lugandaHymnal", "luganda");
    for(i in songs.listings){
        // console.log(songs.listings[i]);
        let sampleSong = songs.listings[i];
        sqlitedb.run(insertSongQuery, [
            // sampleSong.EngTit, // English title
            // sampleSong.number,
            sampleSong.doh,
            sampleSong.song,  // title
            // sampleSong.composer, // artist (composer)
            // sampleSong.An, // An (if needed)
            // sampleSong.signUp, // Up sign
            // sampleSong.signDown // Down sign
        ], function(err) {
            if (err) {
                return console.error(err.message);
            }
        
            console.log(`Inserted song with id ${sampleSong.number}`);
            
            // Step 2: Insert the stanzas into stanza_table
            let stanzaNumber = 1;
            // for (let stanza in sampleSong.english) {
            //     const isChorus = stanza.toLowerCase().includes('chorus') ? 0 : 1; // 0 if chorus, 1 otherwise
            //     const insertStanzaQuery = `
            //         INSERT INTO stanza_en_table (stanza_number, song_id, type)
            //         VALUES (?, ?, ?)
            //     `;
            //     sqlitedb.run(insertStanzaQuery, [stanzaNumber, sampleSong.number, isChorus], function(err) {
            //         if (err) {
            //             return console.error(err.message);
            //         }
            //         const stanzaId = this.lastID; // Get the inserted stanza's id
                    
            //         // Step 3: Insert the lines for this stanza into lines_table
            //         const lines = sampleSong.english[stanza];
            //         lines.forEach((line) => {
            //             const insertLineQuery = `
            //                 INSERT INTO lines_en_table (stanza_id, line)
            //                 VALUES (?, ?)
            //             `;
            //             sqlitedb.run(insertLineQuery, [stanzaId, line], function(err) {
            //                 if (err) {
            //                     console.error(err.message);
            //                 } else {
            //                     console.log(`Inserted line into stanza ${stanzaNumber}`);
            //                 }
            //             });
            //         });
            //     });
            //     stanzaNumber++;
            // }
        
        });
    }
}
getSongs();