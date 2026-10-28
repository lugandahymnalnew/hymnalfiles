(function () {
    'use strict';

    var list = document.getElementById('reviewList');
    var message = document.getElementById('adminMessage');

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function showMessage(text, kind) {
        message.textContent = text || '';
        message.className = 'editor-message' + (text ? ' is-' + kind : '');
    }

    function formatDate(value) {
        try { return new Date(value).toLocaleString(); } catch (_error) { return ''; }
    }

    function renderProposal(proposal) {
        var card = el('article', 'review-card');
        var head = el('div', 'review-card__head');
        var titleWrap = el('div');
        titleWrap.appendChild(el('h2', '', 'Hymn ' + proposal.hymnNumber + ' · ' + (proposal.hymnTitle || 'Untitled')));
        titleWrap.appendChild(el('div', 'review-card__meta', (proposal.changes || []).length + ' change(s) · by ' + (proposal.submittedByName || 'Anonymous') + ' · ' + formatDate(proposal.createdAt)));
        head.appendChild(titleWrap);
        head.appendChild(el('span', 'review-status review-status--' + proposal.status, proposal.status));
        card.appendChild(head);

        (proposal.changes || []).forEach(function (change) {
            var diff = el('div', 'editor-diff');
            diff.appendChild(el('div', 'editor-diff__path', change.path));
            diff.appendChild(el('del', '', change.from || '(empty)'));
            diff.appendChild(el('ins', '', change.to || '(empty)'));
            card.appendChild(diff);
        });

        if (proposal.note) {
            var note = el('div', 'review-conflict', 'Submitter note: ' + proposal.note);
            card.appendChild(note);
        }
        if (proposal.conflicts && proposal.conflicts.length) {
            proposal.conflicts.forEach(function (conflict) {
                card.appendChild(el('div', 'review-conflict', 'Conflict at ' + conflict.path + '. Current text: ' + (conflict.current || '(empty)')));
            });
        }

        if (proposal.status === 'pending' || proposal.status === 'conflict') {
            var actions = el('div', 'review-actions');
            var approve = el('button', 'editor-btn editor-btn--primary', proposal.status === 'conflict' ? 'Check and retry approval' : 'Approve and apply');
            var reject = el('button', 'editor-btn editor-btn--secondary', 'Reject');
            approve.addEventListener('click', function () { decide(proposal._id, 'approve'); });
            reject.addEventListener('click', function () { decide(proposal._id, 'reject'); });
            actions.appendChild(approve);
            actions.appendChild(reject);
            card.appendChild(actions);
        }
        return card;
    }

    async function api(path, options) {
        if (!window.auth || !auth.isLoggedIn || !auth.isLoggedIn()) {
            window.location.href = '/login?returnTo=' + encodeURIComponent('/admin/song-edits');
            throw new Error('Please sign in as an administrator.');
        }
        var response = await auth.apiRequest(path, options || {});
        var data = await response.json();
        if (!response.ok || !data.success) {
            var error = new Error(data.message || 'Request failed.');
            error.payload = data;
            throw error;
        }
        return data;
    }

    async function load() {
        showMessage('', 'error');
        list.innerHTML = '<div class="editor-empty">Loading proposals…</div>';
        try {
            var status = document.getElementById('statusFilter').value;
            var data = await api('/api/admin/song-edits' + (status ? '?status=' + encodeURIComponent(status) : ''));
            list.innerHTML = '';
            document.getElementById('reviewTotal').textContent = data.data.total + ' proposal(s)';
            if (!data.data.items.length) {
                list.appendChild(el('div', 'editor-empty', 'No proposals match this status.'));
                return;
            }
            data.data.items.forEach(function (proposal) { list.appendChild(renderProposal(proposal)); });
        } catch (error) {
            showMessage(error.message, 'error');
            list.innerHTML = '';
        }
    }

    async function decide(id, action) {
        var verb = action === 'approve' ? 'approve and apply' : 'reject';
        if (!window.confirm('Do you want to ' + verb + ' this proposal?')) return;
        var note = window.prompt('Optional review note:', '') || '';
        showMessage('', 'error');
        try {
            await api('/api/admin/song-edits/' + encodeURIComponent(id) + '/' + action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: note })
            });
            showMessage(action === 'approve' ? 'Correction applied.' : 'Correction rejected.', 'success');
            await load();
        } catch (error) {
            if (error.payload && error.payload.data && error.payload.data.status === 'conflict') {
                showMessage(error.message, 'error');
                await load();
                return;
            }
            showMessage(error.message, 'error');
        }
    }

    window.decide = decide;
    document.getElementById('refreshReviews').addEventListener('click', load);
    document.getElementById('statusFilter').addEventListener('change', load);
    load();
})();
