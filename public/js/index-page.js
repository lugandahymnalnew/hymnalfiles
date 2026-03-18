(function () {
    let allEntries = [];

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderEntries(entries) {
        const container = document.getElementById("ind");
        if (!container) {
            return;
        }

        if (!entries.length) {
            container.innerHTML = `
                <div class="tittle">
                    <div class="song" style="width:100%;">
                        <b>No songs found</b><br>Try another search term
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
            href: song.href,
            number: song.number,
            EngNo: "",
            song: song.song,
            EngTit: song.EngTit || "",
            an: "",
            signUp: "",
            signDown: "",
            composer: "",
            doh: song.doh || ""
        }));
    }

    function applySearch() {
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

        renderEntries(filtered);
    }

    window.serFunction = applySearch;

    async function loadIndex() {
        const container = document.getElementById("ind");

        try {
            const [mainResponse, childrenResponse] = await Promise.all([
                fetch("/lugSongs"),
                fetch("/data/children-songs.json")
            ]);

            if (!mainResponse.ok) {
                throw new Error("Failed to load hymnal index");
            }
            if (!childrenResponse.ok) {
                throw new Error("Failed to load children songs");
            }

            const mainSongs = await mainResponse.json();
            const childrenSongs = await childrenResponse.json();

            allEntries = [
                ...normaliseChildrenSongs(childrenSongs),
                ...normaliseMainSongs(mainSongs.data || [])
            ];

            renderEntries(allEntries);
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
