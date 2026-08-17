(function () {
    let allEntries = [];
    let currentSearchMode = 'number';

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderEntries(entries, searchTerm = '') {
        const container = document.getElementById("ind");
        if (!container) {
            return;
        }

        if (!entries.length) {
            container.innerHTML = `
                <div class="tittle">
                    <div class="song" style="width:100%;">
                        <b>No songs found</b><br>${searchTerm ? `No matches for "${escapeHtml(searchTerm)}"` : 'Enter a song number or search term'}
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = entries.map((entry) => {
            const badge = entry.collection === "children" ? "Abaana" : (entry.an || "");
            const composer = entry.collection === "children"
                ? "Children Songs"
                : (entry.composer || "Unknown");
            const secondaryTitle = entry.EngTit || "";
            const signUp = entry.signUp || "";
            const signDown = entry.signDown || "";

            return `
                <a href="${escapeHtml(entry.href)}">
                    <div class="tittle">
                        <div class="No">
                            <b>${escapeHtml(entry.number)}</b><br>${escapeHtml(entry.EngNo || "")}
                        </div>
                        <div class="song">
                            <b>${escapeHtml(entry.song)}</b><br>${escapeHtml(secondaryTitle)}
                        </div>
                        <div class="an">${escapeHtml(badge)}</div>
                        <div class="sign">
                            ${escapeHtml(signUp)}<br>${escapeHtml(signDown)}
                        </div>
                        <div class="comp">
                            ${escapeHtml(composer)}<br><b>${escapeHtml(entry.doh || entry.collectionLabel || "")}</b>
                        </div>
                    </div>
                </a>
            `;
        }).join("");
    }

    function normaliseMainSongs(items) {
        return items.map((song) => ({
            collection: "main",
            collectionLabel: "Main Hymnal",
            href: `/songs.html?song=${encodeURIComponent(song.number)}`,
            number: song.number,
            EngNo: song.EngNo || "",
            song: song.song || "",
            EngTit: song.EngTit || "",
            an: song.An || "",
            signUp: song.signUp || "",
            signDown: song.signDown || "",
            composer: song.composer || "",
            doh: song.doh || ""
        }));
    }

    function normaliseChildrenSongs(items) {
        return items.map((song) => ({
            collection: "children",
            collectionLabel: "Children Songs",
            href: `/song.html?song=${encodeURIComponent(song.number)}`,
            number: song.number,
            EngNo: song.EngNo || "",
            song: song.song || "",
            EngTit: song.EngTit || "",
            an: song.An || "",
            signUp: song.signUp || "",
            signDown: song.signDown || "",
            composer: song.composer || "",
            doh: song.doh || ""
        }));
    }

    // Search by number - exact match or starts with
    function searchByNumberExact(number) {
        const num = number.trim();
        if (!num) {
            renderEntries([]);
            return;
        }

        // Find exact matches first (adult songs prioritized)
        const exactMatches = allEntries.filter(entry => entry.number === num);

        // If no exact match, find entries starting with the number
        let results = exactMatches;
        if (results.length === 0) {
            results = allEntries.filter(entry => entry.number.startsWith(num));
        }

        // Sort: adult songs first, then by number
        results.sort((a, b) => {
            if (a.collection !== b.collection) {
                return a.collection === "main" ? -1 : 1;
            }
            return parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number);
        });

        renderEntries(results, num);
    }

    // Text search across all fields
    function applyTextSearch() {
        const input = document.getElementById("ser");
        const filter = (input?.value || "").trim().toUpperCase();

        if (!filter) {
            renderEntries(allEntries);
            return;
        }

        const filtered = allEntries.filter((entry) => {
            const haystack = [
                entry.number,
                entry.song,
                entry.EngTit,
                entry.EngNo,
                entry.composer,
                entry.doh,
                entry.collectionLabel
            ].join(" ").toUpperCase();

            return haystack.includes(filter);
        });

        // Sort by number
        filtered.sort((a, b) => {
            if (a.collection !== b.collection) {
                return a.collection === "main" ? -1 : 1;
            }
            return parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number);
        });

        renderEntries(filtered, input.value);
    }

    // Global functions for HTML onclick handlers
    window.switchSearchMode = function(mode) {
        currentSearchMode = mode;
        const numPadSection = document.getElementById("number-pad-section");
        const textSearchSection = document.getElementById("text-search-section");
        const tabNumber = document.getElementById("tab-number");
        const tabText = document.getElementById("tab-text");

        if (mode === 'number') {
            numPadSection.classList.remove("hidden");
            textSearchSection.classList.add("hidden");
            tabNumber.classList.add("active");
            tabText.classList.remove("active");
        } else {
            numPadSection.classList.add("hidden");
            textSearchSection.classList.remove("hidden");
            tabNumber.classList.remove("active");
            tabText.classList.add("active");
            // Focus text input when switching to text mode
            setTimeout(() => document.getElementById("ser")?.focus(), 100);
        }
    };

    window.appendNumber = function(num) {
        const input = document.getElementById("numpad-input");
        if (input.value.length < 4) {
            input.value += num;
        }
    };

    window.backspace = function() {
        const input = document.getElementById("numpad-input");
        input.value = input.value.slice(0, -1);
    };

    window.clearNumpad = function() {
        const input = document.getElementById("numpad-input");
        input.value = '';
        renderEntries(allEntries);
    };

    window.searchByNumber = function() {
        const input = document.getElementById("numpad-input");
        searchByNumberExact(input.value);
    };

    window.serFunction = applyTextSearch;

    // Load all songs from backend
    async function loadIndex() {
        const container = document.getElementById("ind");

        try {
            // Load from backend API which queries song_index table
            const [mainResponse, childrenResponse] = await Promise.all([
                fetch("/api/songs/all"),
                fetch("/api/childrenSongs")
            ]);

            if (!mainResponse.ok) {
                throw new Error("Failed to load hymnal index");
            }

            const mainData = await mainResponse.json();
            const mainSongs = mainData.data || mainData.songs || [];

            let childrenSongs = [];
            if (childrenResponse.ok) {
                const childrenData = await childrenResponse.json();
                childrenSongs = childrenData.data || [];
            }

            allEntries = [
                ...normaliseChildrenSongs(childrenSongs),
                ...normaliseMainSongs(mainSongs)
            ];

            // Show all songs initially
            renderEntries(allEntries);

            // Add enter key handler for numpad input
            const numpadInput = document.getElementById("numpad-input");
            if (numpadInput) {
                numpadInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchByNumber();
                    }
                });
            }
        } catch (error) {
            if (container) {
                container.innerHTML = `
                    <div class="tittle">
                        <div class="song" style="width:100%;">
                            <b>Failed to load songs</b><br>${escapeHtml(error.message)}
                        </div>
                    </div>
                `;
            }
        }
    }

    document.addEventListener("DOMContentLoaded", loadIndex);
})();
