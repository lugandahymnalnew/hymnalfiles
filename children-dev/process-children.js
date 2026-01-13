const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonPath = path.join(__dirname, 'children-songs.json');
const songs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

/**
 * Detect and extract chorus from stanzas.
 * Rule: If the first stanza has significantly more lines than other stanzas,
 * the extra lines (beyond the average) are considered the chorus.
 */
function processStanzas(stanzas) {
    if (stanzas.length < 2) return stanzas;

    // Get line counts for each stanza
    const lineCounts = stanzas.map(s => s.lines.length);

    // Find the most common line count (likely verse length)
    const counts = {};
    lineCounts.forEach(c => counts[c] = (counts[c] || 0) + 1);
    const verseLineCount = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0][0];

    const verseLineCountNum = parseInt(verseLineCount);

    // Check if first stanza has more lines than typical verse
    const firstStanza = stanzas[0];
    const firstStanzaLines = firstStanza.lines.length;

    if (firstStanzaLines > verseLineCountNum) {
        // Extract chorus lines from first stanza
        const verseLines = firstStanza.lines.slice(0, verseLineCountNum);
        const chorusLines = firstStanza.lines.slice(verseLineCountNum);

        // Replace first stanza with just the verse part
        stanzas[0].lines = verseLines;

        // Insert chorus as second stanza (after first verse)
        stanzas.splice(1, 0, {
            type: 'chorus',
            number: 1,
            lines: chorusLines
        });

        // Renumber stanzas
        stanzas.forEach((s, i) => {
            if (s.type === 'verse') {
                s.number = i + 1;
            } else {
                // For choruses, assign a letter or keep sequential
                s.number = i + 1;
            }
        });
    }

    return stanzas;
}

// Process all songs
let chorusCount = 0;
songs.songs.forEach(song => {
    const originalStanzaCount = song.stanzas.length;
    song.stanzas = processStanzas(song.stanzas);
    song.stanzas.forEach(s => {
        if (s.type === 'chorus') chorusCount++;
    });

    // Log songs that had choruses extracted
    if (song.stanzas.some(s => s.type === 'chorus')) {
        console.log(`Song ${song.id}: "${song.title}" - chorus extracted`);
    }
});

// Update the total
songs.total_songs = songs.songs.length;
songs.processed = true;
songs.processed_at = new Date().toISOString();

// Write to processed file
const outputPath = path.join(__dirname, 'children-songs-processed.json');
fs.writeFileSync(outputPath, JSON.stringify(songs, null, 2));

console.log(`\n✅ Processed ${songs.songs.length} songs`);
console.log(`📝 Total choruses detected: ${chorusCount}`);
console.log(`💾 Saved to: children-songs-processed.json`);

// Show sample of a song with chorus
const sampleSong = songs.songs.find(s => s.stanzas.some(st => st.type === 'chorus'));
if (sampleSong) {
    console.log(`\n📋 Sample song with chorus (Song ${sampleSong.id}):`);
    console.log(JSON.stringify(sampleSong, null, 2));
}
