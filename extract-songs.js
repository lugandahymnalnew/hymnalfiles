const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'public/src/pages');

// Function to extract song data from HTML
function parseSongFile(html, filename) {
    const isChildren = filename.startsWith('abaana');
    const idMatch = filename.match(/^(\d+)\.html$/) || filename.match(/^abaana(\d+)\.html$/);
    const id = isChildren ? `abaana_${idMatch[1]}` : parseInt(idMatch[1]);

    // Extract title
    const titleMatch = html.match(/<div class="song">\s*<b>([^<]+)<\/b>/);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract English title
    const engTitleMatch = html.match(/<div class="song">[^<]*<b>[^<]*<\/b>\s*<br>\s*([^<<]+)</);
    const engTitle = engTitleMatch ? engTitleMatch[1].trim() : null;

    // Extract CH/CS number
    const chMatch = html.match(/<div class="No">[^<]*<b>\d+<\/b>\s*<br>\s*([A-Za-z]+\s*\d+)/);
    const ch = chMatch ? chMatch[1].trim() : null;

    // Extract time signature (e.g., "4\n4")
    const signMatch = html.match(/<div class="sign">\s*(\d+)\s*<br>\s*(\d+)/);
    const signUp = signMatch ? signMatch[1] : null;
    const signDown = signMatch ? signMatch[2] : null;

    // Extract composer and Doh
    const compMatch = html.match(/<div class="comp">([^<]+)<br><b>Doh is ([^<]+)<\/b>/);
    const composer = compMatch ? compMatch[1].trim() : null;
    const doh = compMatch ? compMatch[2].trim() : null;

    return {
        id,
        title,
        eng_title: engTitle,
        ch,
        doh,
        composer,
        category: isChildren ? 'children' : 'main'
    };
}

// Main function
function main() {
    const mainSongs = [];
    const childrenSongs = [];

    // Read all files in pages directory
    const files = fs.readdirSync(pagesDir);

    files.forEach(file => {
        if (file.endsWith('.html') && !file.includes('agree') && !file !== 'abaana.html') {
            const filePath = path.join(pagesDir, file);
            const html = fs.readFileSync(filePath, 'utf8');

            const songData = parseSongFile(html, file);

            if (songData.title) {
                if (songData.category === 'children') {
                    childrenSongs.push(songData);
                } else {
                    mainSongs.push(songData);
                }
                console.log(`Parsed: ${file} - ${songData.title}`);
            }
        }
    });

    // Sort by ID
    mainSongs.sort((a, b) => a.id - b.id);
    childrenSongs.sort((a, b) => {
        const numA = parseInt(a.id.split('_')[1]);
        const numB = parseInt(b.id.split('_')[1]);
        return numA - numB;
    });

    // Create output JSON
    const output = {
        metadata: {
            version: "1.0",
            description: "Complete song index - Main Hymns and Children Songs",
            generated: new Date().toISOString(),
            counts: {
                main_hymns: mainSongs.length,
                children_songs: childrenSongs.length,
                total: mainSongs.length + childrenSongs.length
            }
        },
        main: mainSongs,
        children: childrenSongs
    };

    // Write to file
    const outputPath = path.join(__dirname, 'public/search/songs-index.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n✅ Extracted ${mainSongs.length} main hymns`);
    console.log(`✅ Extracted ${childrenSongs.length} children songs`);
    console.log(`💾 Saved to: ${outputPath}`);
}

main();
