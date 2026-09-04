(function () {
    var bookSelect = document.getElementById('bookSelect');
    var chapterSelect = document.getElementById('chapterSelect');
    var content = document.getElementById('content');
    var searchForm = document.getElementById('searchForm');
    var searchInput = document.getElementById('searchInput');

    var booksBySlug = {};
    var chapterCache = {};

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function setUrl(book, chapter) {
        var params = new URLSearchParams();
        params.set('book', book);
        if (chapter) params.set('chapter', chapter);
        window.history.replaceState({}, '', '/bible.html?' + params.toString());
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    async function loadBooks() {
        var res = await fetch('/api/bible/books');
        var data = await res.json();
        if (!data.success) throw new Error('Failed to load books');

        var groups = [
            { label: 'Old Testament', books: data.data.oldTestament },
            { label: 'New Testament', books: data.data.newTestament }
        ];

        bookSelect.innerHTML = '';
        groups.forEach(function (group) {
            var optgroup = document.createElement('optgroup');
            optgroup.label = group.label;
            group.books.forEach(function (book) {
                booksBySlug[book.slug] = book;
                var opt = document.createElement('option');
                opt.value = book.slug;
                opt.textContent = book.name;
                optgroup.appendChild(opt);
            });
            bookSelect.appendChild(optgroup);
        });
    }

    async function loadChapterList(slug) {
        var res = await fetch('/api/bible/' + encodeURIComponent(slug));
        var data = await res.json();
        if (!data.success) throw new Error('Failed to load chapters');

        chapterSelect.innerHTML = '';
        data.data.chapters.forEach(function (chapterNum) {
            var opt = document.createElement('option');
            opt.value = chapterNum;
            opt.textContent = 'Chapter ' + chapterNum;
            chapterSelect.appendChild(opt);
        });
        return data.data.chapters;
    }

    async function loadChapter(slug, chapter) {
        content.innerHTML = '<div class="loading">Loading...</div>';

        var cacheKey = slug + ':' + chapter;
        var data = chapterCache[cacheKey];
        if (!data) {
            var res = await fetch('/api/bible/' + encodeURIComponent(slug) + '/' + encodeURIComponent(chapter));
            var json = await res.json();
            if (!json.success) {
                content.innerHTML = '<div class="empty">Chapter not found.</div>';
                return;
            }
            data = json.data;
            chapterCache[cacheKey] = data;
        }

        var versesHtml = data.verses.map(function (v) {
            return '<span class="verse"><span class="vnum">' + v.verse + '</span>' + escapeHtml(v.text) + ' </span>';
        }).join('');

        content.innerHTML =
            '<h2 class="chapter-title">' + escapeHtml(data.book.name) + ' ' + data.chapter + '</h2>' +
            '<div>' + versesHtml + '</div>' +
            '<div class="nav-buttons">' +
            '<button id="prevChapterBtn" type="button">&#8592; Previous</button>' +
            '<button id="nextChapterBtn" type="button">Next &#8594;</button>' +
            '</div>';

        setUrl(slug, data.chapter);

        var chapters = Array.from(chapterSelect.options).map(function (o) { return Number(o.value); });
        var idx = chapters.indexOf(data.chapter);

        var prevBtn = document.getElementById('prevChapterBtn');
        var nextBtn = document.getElementById('nextChapterBtn');
        prevBtn.disabled = idx <= 0;
        nextBtn.disabled = idx === -1 || idx >= chapters.length - 1;

        prevBtn.addEventListener('click', function () {
            var target = chapters[idx - 1];
            chapterSelect.value = target;
            loadChapter(slug, target);
        });
        nextBtn.addEventListener('click', function () {
            var target = chapters[idx + 1];
            chapterSelect.value = target;
            loadChapter(slug, target);
        });
    }

    async function onBookChange(preferredChapter) {
        var slug = bookSelect.value;
        var chapters = await loadChapterList(slug);
        var chapter = preferredChapter && chapters.includes(Number(preferredChapter)) ? Number(preferredChapter) : chapters[0];
        chapterSelect.value = chapter;
        await loadChapter(slug, chapter);
    }

    bookSelect.addEventListener('change', function () { onBookChange(); });
    chapterSelect.addEventListener('change', function () {
        loadChapter(bookSelect.value, Number(chapterSelect.value));
    });

    async function runSearch(query) {
        content.innerHTML = '<div class="loading">Searching...</div>';
        try {
            var res = await fetch('/api/bible/search?q=' + encodeURIComponent(query));
            var data = await res.json();
            if (!data.success || !data.data.length) {
                content.innerHTML = '<div class="empty">No verses found for "' + escapeHtml(query) + '".</div>';
                return;
            }

            content.outerHTML = '<div id="content" class="search-results"></div>';
            content = document.getElementById('content');

            data.data.forEach(function (result) {
                var card = document.createElement('div');
                card.className = 'search-result';
                card.innerHTML =
                    '<div class="ref">' + escapeHtml(result.bookName) + ' ' + result.chapter + ':' + result.verse + '</div>' +
                    '<div>' + result.snippet + '</div>';
                card.addEventListener('click', function () {
                    bookSelect.value = result.bookSlug;
                    onBookChange(result.chapter).then(function () {
                        content = document.getElementById('content') || content;
                    });
                });
                content.appendChild(card);
            });
        } catch (e) {
            content.innerHTML = '<div class="empty">Search failed. Try a simpler query.</div>';
        }
    }

    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = searchInput.value.trim();
        if (q) runSearch(q);
    });

    async function init() {
        await loadBooks();
        var initialBook = getQueryParam('book');
        var initialChapter = getQueryParam('chapter');
        if (initialBook && booksBySlug[initialBook]) {
            bookSelect.value = initialBook;
        }
        await onBookChange(initialChapter);
    }

    init();
})();
