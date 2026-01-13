const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlPath = path.join(__dirname, 'public/src/pages/abaana.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract the body content
const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
const bodyContent = bodyMatch ? bodyMatch[1] : '';

const songs = [];
const detailsRegex = /<details>\s*<summary>\s*(\d+)\.\s*([^<]+)<\/summary>\s*<pre class="txt">([\s\S]*?)<\/pre>\s*<\/details>/g;

let match;
while ((match = detailsRegex.exec(bodyContent)) !== null) {
    const songNumber = parseInt(match[1]);
    const title = match[2].trim();
    const content = match[3];

    // Extract header info
    let doh = '';
    let engTitle = '';

    // Get DOH - look for "Doh is X" pattern
    const dohMatch = content.match(/<h[23]>Doh is\s*([^<]+)<\/h[23]>/i) ||
                    content.match(/<h3>([^<]+)<\/h3>/);
    if (dohMatch) {
        const val = dohMatch[1].trim();
        // Only use as DOH if it contains "Doh" or is a key signature
        if (val.toLowerCase().startsWith('doh') || /^[A-G][b#]?\s*$/.test(val)) {
            doh = val;
        }
    }

    // Get English title - look for h2 or h3 that's not DOH and not same as Luganda title
    const titleMatches = [...content.matchAll(/<h[23]>([^<]+)<\/h[23]>/g)];
    for (const m of titleMatches) {
        const val = m[1].trim();
        const lowerVal = val.toLowerCase();
        // Skip if it's DOH, starts with the song number, or is same as title
        if (lowerVal.startsWith('doh is')) continue;
        if (val.includes(songNumber + '.') || val.startsWith(songNumber + '. ')) continue;
        if (val === title || val === title.replace(/^\d+\.\s*/, '')) continue;
        if (!engTitle) engTitle = val;
    }

    // Clean up english title if still has "Doh is" remnants
    if (engTitle) {
        engTitle = engTitle.replace(/^Doh is\s+/i, '').trim();
    }

    // Extract stanzas
    const stanzas = [];

    // Remove the header div first
    const contentWithoutHeader = content.replace(/<div class="song-h">[\s\S]*?<\/div>/, '');

    // Split into lines and clean
    const lines = contentWithoutHeader
        .split('\n')
        .map(line => line.trim().replace(/<\/?b>/g, '').trim())
        .filter(line => line && !line.startsWith('<') && line !== title);

    let currentStanza = null;
    let chorusLines = [];

    for (const line of lines) {
        // Check for verse number
        const verseMatch = line.match(/^(\d+)\.\s*(.+)/);

        if (verseMatch) {
            // Save previous chorus if exists
            if (chorusLines.length > 0) {
                stanzas.push({
                    type: 'chorus',
                    lines: [...chorusLines]
                });
                chorusLines = [];
            }

            // Save previous stanza
            if (currentStanza && currentStanza.lines.length > 0) {
                stanzas.push(currentStanza);
            }

            currentStanza = {
                type: 'verse',
                number: parseInt(verseMatch[1]),
                lines: [verseMatch[2]]
            };
        } else if (line.match(/^\[.+\]\s*x\d+$/)) {
            // Handle [Gwakenga] x3 style
            if (currentStanza) {
                currentStanza.lines.push(line);
            }
        } else if (line && currentStanza) {
            currentStanza.lines.push(line);
        } else if (line) {
            // Likely a chorus line (not in a stanza yet)
            chorusLines.push(line);
        }
    }

    // Don't forget the last stanza and any remaining chorus
    if (currentStanza && currentStanza.lines.length > 0) {
        stanzas.push(currentStanza);
    }
    if (chorusLines.length > 0) {
        stanzas.push({
            type: 'chorus',
            lines: [...chorusLines]
        });
    }

    songs.push({
        id: songNumber,
        title: title,
        english_title: engTitle || null,
        doh: doh || null,
        stanzas: stanzas
    });
}

// Create the final JSON structure
const output = {
    category: "children_songs",
    total_songs: songs.length,
    songs: songs
};

// Write to JSON file
const outputPath = path.join(__dirname, 'children-songs.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Successfully extracted ${songs.length} children songs to children-songs.json`);
console.log('\nSample output (first song):');
console.log(JSON.stringify(songs[0], null, 2));
