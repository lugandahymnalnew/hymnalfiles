const fs = require('fs');
const path = require('path');

// Read the index.html file
const indexPath = path.join(__dirname, 'public/src/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const mainSongs = [];

// Regex to match each song card
// Pattern: <a href="/songs.html?song=X">...<div class="tittle">...<div class="No"><b>X</b><br>CH XXX</div>...<div class="song"><b>TITLE</b><br>ENGLISH TITLE</div>...<div class="comp">COMPOSER<br><b>Doh is KEY</b></div>
const songCardRegex = /<a href="\/songs\.html\?song=([^"]+)"[^>]*>[\s\S]*?<div class="tittle">[\s\S]*?<div class="No">[\s\S]*?<b>([^<]+)<\/b>[\s\S]*?<br>\s*([^<]*)[\s\S]*?<\/div>[\s\S]*?<div class="song">[\s\S]*?<b>([^<]+)<\/b>[\s\S]*?<br>\s*([^<]*)[\s\S]*?<\/div>[\s\S]*?<div class="comp">([^<]+)<br><b>Doh is ([^<]+)<\/b>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/a>/g;

let match;
while ((match = songCardRegex.exec(html)) !== null) {
    const song = {
        id: match[1],
        number: match[2],
        ch: match[3].trim(),
        title: match[4],
        eng_title: match[5].trim(),
        composer: match[6].trim(),
        doh: match[7],
        category: 'main'
    };
    mainSongs.push(song);
}

// Now get children songs from abaana.html
const abaanaPath = path.join(__dirname, 'public/src/pages/abaana.html');
const abaanaHtml = fs.readFileSync(abaanaPath, 'utf8');

const childrenSongs = [];
const childrenRegex = /<details>[\s\S]*?<summary>\s*(\d+)\.\s*([^<]+)<\/summary>[\s\S]*?<div class="song-h">[\s\S]*?<h2>\d+\.\s*([^<]+)<\/h2>[\s\S]*?(?:<h[23]>([^<]*)<\/h[23]>)?[\s\S]*?<\/div>/g;

let childMatch;
while ((childMatch = childrenRegex.exec(abaanaHtml)) !== null) {
    const song = {
        id: `abaana_${childMatch[1]}`,
        number: parseInt(childMatch[1]),
        title: childMatch[2].trim(),
        eng_title: childMatch[4] ? childMatch[4].trim() : null,
        category: 'children'
    };
    childrenSongs.push(song);
}

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

console.log(`✅ Extracted ${mainSongs.length} main hymns`);
console.log(`✅ Extracted ${childrenSongs.length} children songs`);
console.log(`💾 Saved to: ${outputPath}`);

// Show first 5 songs from each category
console.log('\n📋 Sample main songs:');
mainSongs.slice(0, 3).forEach(s => console.log(`  ${s.id}: ${s.title} (${s.eng_title})`));

console.log('\n📋 Sample children songs:');
childrenSongs.slice(0, 3).forEach(s => console.log(`  ${s.id}: ${s.title} (${s.eng_title})`));
