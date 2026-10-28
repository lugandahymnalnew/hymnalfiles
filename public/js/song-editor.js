(function () {
    'use strict';

    var hymnNumber = document.body.getAttribute('data-hymn-number');
    var changes = new Map();
    var pair = null;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function showMessage(target, text, kind) {
        target.textContent = text || '';
        target.className = 'editor-message' + (text ? ' is-' + kind : '');
    }

    function labelForPath(path) {
        return path
            .replace(/^luganda\./, 'Luganda · ')
            .replace(/^english\./, 'English · ')
            .replace(/lyrics\./, '')
            .replace(/english\./, '')
            .replace(/\.(\d+)$/, function (_match, index) { return ' · line ' + (Number(index) + 1); });
    }

    function syncChange(input) {
        var path = input.getAttribute('data-path');
        var original = input.getAttribute('data-original') || '';
        var value = input.value.trim();
        if (value !== original) {
            input.classList.add('is-changed');
            changes.set(path, { path: path, from: original, to: value });
        } else {
            input.classList.remove('is-changed');
            changes.delete(path);
        }
        updateChangeBar();
    }

    function makeField(label, value, path, wide, multiline) {
        var wrap = el('div', 'editor-field' + (wide ? ' editor-field--wide' : ''));
        var fieldLabel = el('label', '', label);
        var input = el(multiline ? 'textarea' : 'input');
        input.value = value === undefined || value === null ? '' : String(value);
        input.setAttribute('data-path', path);
        input.setAttribute('data-original', input.value.trim());
        input.setAttribute('aria-label', label);
        input.addEventListener('input', function () { syncChange(input); });
        wrap.appendChild(fieldLabel);
        wrap.appendChild(input);
        return wrap;
    }

    function renderSections(container, language, rootName, sections) {
        var keys = Object.keys(sections || {});
        if (!keys.length) {
            container.appendChild(el('div', 'editor-empty', 'No lyric sections were found for this language.'));
            return;
        }

        keys.forEach(function (section) {
            var lines = sections[section];
            if (!Array.isArray(lines)) return;
            var card = el('section', 'editor-card');
            card.appendChild(el('h3', '', section));
            var fields = el('div', 'editor-fields');
            lines.forEach(function (line, index) {
                fields.appendChild(makeField('Line ' + (index + 1), line, language + '.' + rootName + '.' + section + '.' + index, true, true));
            });
            card.appendChild(fields);
            container.appendChild(card);
        });
    }

    function renderLuganda(data) {
        var target = document.getElementById('editorLuganda');
        target.querySelector('.editor-empty').remove();
        if (!data) {
            target.appendChild(el('div', 'editor-empty', 'The Luganda record is missing.'));
            return;
        }

        var meta = el('section', 'editor-card');
        meta.appendChild(el('h3', '', 'Hymn details'));
        var fields = el('div', 'editor-fields');
        fields.appendChild(makeField('Luganda title', data.song, 'luganda.song', true));
        fields.appendChild(makeField('English title', data.EngTit, 'luganda.EngTit', true));
        fields.appendChild(makeField('English number', data.EngNo, 'luganda.EngNo'));
        fields.appendChild(makeField('Author / source', data.An, 'luganda.An'));
        fields.appendChild(makeField('Composer', data.composer, 'luganda.composer', true));
        fields.appendChild(makeField('Key / Doh', data.doh, 'luganda.doh'));
        fields.appendChild(makeField('Time signature top', data.signUp, 'luganda.signUp'));
        fields.appendChild(makeField('Time signature bottom', data.signDown, 'luganda.signDown'));
        meta.appendChild(fields);
        target.appendChild(meta);
        renderSections(target, 'luganda', 'lyrics', data.lyrics);
    }

    function renderEnglish(data) {
        var target = document.getElementById('editorEnglish');
        target.querySelector('.editor-empty').remove();
        if (!data) {
            target.appendChild(el('div', 'editor-empty', 'The English record is missing.'));
            return;
        }

        var meta = el('section', 'editor-card');
        meta.appendChild(el('h3', '', 'English details'));
        var fields = el('div', 'editor-fields');
        var titleField = makeField('English title', data.title || '', 'english.title', true);
        if (!data.title && pair.suggestedEnglishTitle) {
            titleField.querySelector('input').placeholder = 'Suggested: ' + pair.suggestedEnglishTitle;
        }
        fields.appendChild(titleField);
        meta.appendChild(fields);
        target.appendChild(meta);
        renderSections(target, 'english', 'english', data.english);
    }

    function updateChangeBar() {
        var count = changes.size;
        document.getElementById('changeCount').textContent = count ? count + (count === 1 ? ' change' : ' changes') : 'No changes yet';
        document.getElementById('reviewEdits').disabled = !count;
        document.getElementById('resetEdits').disabled = !count;
        document.getElementById('editorTopState').textContent = count ? count + ' unsent' : 'Ready';
    }

    function resetAll() {
        document.querySelectorAll('[data-path]').forEach(function (input) {
            input.value = input.getAttribute('data-original') || '';
            input.classList.remove('is-changed');
        });
        changes.clear();
        updateChangeBar();
    }

    function openReview() {
        var list = document.getElementById('reviewDiffs');
        list.innerHTML = '';
        changes.forEach(function (change) {
            var diff = el('div', 'editor-diff');
            diff.appendChild(el('div', 'editor-diff__path', labelForPath(change.path)));
            diff.appendChild(el('del', '', change.from || '(empty)'));
            diff.appendChild(el('ins', '', change.to || '(empty)'));
            list.appendChild(diff);
        });
        var panel = document.getElementById('reviewPanel');
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
    }

    function closeReview() {
        var panel = document.getElementById('reviewPanel');
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        showMessage(document.getElementById('submitMessage'), '', 'error');
    }

    async function submitEdits() {
        var button = document.getElementById('submitEdits');
        var message = document.getElementById('submitMessage');
        button.disabled = true;
        button.textContent = 'Sending…';
        showMessage(message, '', 'error');
        try {
            var options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: hymnNumber,
                    changes: Array.from(changes.values()).map(function (change) { return { path: change.path, to: change.to }; }),
                    note: document.getElementById('editNote').value
                })
            };
            var response = window.auth && auth.apiRequest
                ? await auth.apiRequest('/api/song-edits', options)
                : await fetch('/api/song-edits', options);
            var data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not submit this correction.');
            showMessage(message, data.message, 'success');
            resetAll();
            document.getElementById('editNote').value = '';
            button.textContent = 'Submitted';
            setTimeout(closeReview, 1600);
        } catch (error) {
            showMessage(message, error.message, 'error');
            button.disabled = false;
            button.textContent = 'Send for review';
        }
    }

    function setLanguage(language) {
        document.querySelectorAll('.editor-tab').forEach(function (tab) {
            tab.classList.toggle('is-active', tab.getAttribute('data-editor-tab') === language);
        });
        document.querySelectorAll('.editor-language').forEach(function (section) {
            section.classList.toggle('is-active', section.getAttribute('data-language') === language);
        });
    }

    function showAccessDenied(message) {
        document.body.classList.remove('is-access-check');
        document.body.classList.add('is-access-denied');
        document.getElementById('editorHeading').textContent = 'Hymn editor access is restricted';
        document.querySelector('.editor-intro p').textContent = 'Only approved Editors and Administrators can prepare direct hymn corrections. You can still report an issue through the feedback forum.';
        document.getElementById('editorIdentity').innerHTML = '';
        document.getElementById('editorIdentity').appendChild(document.createTextNode(message + ' '));
        var feedbackLink = el('a', 'editor-access-link', 'Open feedback forum');
        feedbackLink.href = '/feedback/hymn/' + encodeURIComponent(hymnNumber);
        document.getElementById('editorIdentity').appendChild(feedbackLink);
        document.getElementById('editorTopState').textContent = 'Restricted';
    }

    async function loadEditor(user) {
        var message = document.getElementById('editorMessage');
        try {
            var response = await auth.apiRequest('/api/song-editor/' + encodeURIComponent(hymnNumber));
            var data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not load this hymn.');
            pair = data.data;
            renderLuganda(pair.luganda);
            renderEnglish(pair.english);
            var title = pair.luganda && pair.luganda.song ? pair.luganda.song : pair.suggestedEnglishTitle;
            document.getElementById('editorHeading').textContent = 'Help correct ' + hymnNumber + '. ' + title;
            document.getElementById('editorNavTitle').textContent = hymnNumber + '. ' + title;
            document.getElementById('editorTopState').textContent = 'Ready';
            document.getElementById('editorIdentity').innerHTML = 'Editing as <b></b>. Changes still require administrator review.';
            document.getElementById('editorIdentity').querySelector('b').textContent = user.userName || user.fullName || 'Editor';
            document.body.classList.remove('is-access-check');
        } catch (error) {
            if (error.message && /access|Authentication|token/i.test(error.message)) {
                showAccessDenied(error.message);
            } else {
                showMessage(message, error.message, 'error');
                document.getElementById('editorTopState').textContent = 'Could not load';
            }
        }
    }

    async function authorizeAndLoad() {
        var returnTo = '/hymns/' + hymnNumber + '/edit';
        if (!window.auth || !auth.isLoggedIn || !auth.isLoggedIn()) {
            window.location.replace('/login?returnTo=' + encodeURIComponent(returnTo));
            return;
        }

        try {
            var response = await auth.apiRequest('/api/auth/me');
            var data = await response.json();
            if (!response.ok || !data.success || !data.user) {
                throw new Error(data.message || 'Authentication required');
            }
            var user = data.user;
            if (user.status !== 'approved' || (user.role !== 'editor' && user.role !== 'admin')) {
                showAccessDenied('Ask an administrator to assign the Editor role to your approved account.');
                return;
            }
            await loadEditor(user);
        } catch (error) {
            if (/Authentication|token/i.test(error.message || '')) {
                window.location.replace('/login?returnTo=' + encodeURIComponent(returnTo));
                return;
            }
            showAccessDenied(error.message || 'Editor access could not be verified.');
        }
    }

    document.querySelectorAll('.editor-tab').forEach(function (tab) {
        tab.addEventListener('click', function () { setLanguage(tab.getAttribute('data-editor-tab')); });
    });
    document.getElementById('resetEdits').addEventListener('click', resetAll);
    document.getElementById('reviewEdits').addEventListener('click', openReview);
    document.getElementById('closeReview').addEventListener('click', closeReview);
    document.getElementById('reviewPanel').addEventListener('click', function (event) {
        if (event.target.id === 'reviewPanel') closeReview();
    });
    document.getElementById('submitEdits').addEventListener('click', submitEdits);

    authorizeAndLoad();
})();
