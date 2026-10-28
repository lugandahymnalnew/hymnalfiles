(function () {
    'use strict';

    var targets = document.querySelectorAll('[data-donor-shoutout]');
    if (!targets.length) return;

    function safeNames(wall) {
        return (Array.isArray(wall) ? wall : [])
            .map(function (item) { return item && item.name ? String(item.name).trim() : ''; })
            .filter(function (name) { return name && name.toLowerCase() !== 'anonymous'; })
            .slice(0, 2);
    }

    function titleFor(summary) {
        var names = safeNames(summary.wall);
        if (names.length) {
            var joined = names.length === 2 ? names[0] + ' and ' + names[1] : names[0];
            return 'Thank you, ' + joined + ', and everyone supporting the hymnal.';
        }
        if (summary.donorCount > 0) {
            return 'Thank you to our ' + summary.donorCount + (summary.donorCount === 1 ? ' supporter.' : ' supporters.');
        }
        return 'Help carry Luganda hymns to more phones and computers.';
    }

    function render(target, summary) {
        var mode = target.getAttribute('data-donor-mode') || 'compact';
        var percent = Math.max(0, Math.min(100, Number(summary.percent) || 0));
        var card = document.createElement('aside');
        card.className = 'donor-thanks' + (mode === 'feature' ? ' donor-thanks--feature' : '');
        card.setAttribute('aria-label', 'Support the hymnal');

        var row = document.createElement('div');
        row.className = 'donor-thanks__row';
        var mark = document.createElement('div');
        mark.className = 'donor-thanks__mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '♥';

        var copy = document.createElement('div');
        copy.className = 'donor-thanks__copy';
        var eyebrow = document.createElement('div');
        eyebrow.className = 'donor-thanks__eyebrow';
        eyebrow.textContent = 'Community supported';
        var title = document.createElement('div');
        title.className = 'donor-thanks__title';
        title.textContent = titleFor(summary);
        var meta = document.createElement('div');
        meta.className = 'donor-thanks__meta';
        meta.textContent = summary.reached
            ? 'The current community goal has been reached.'
            : percent + '% of the current goal · every contribution is optional and appreciated.';
        copy.appendChild(eyebrow);
        copy.appendChild(title);
        copy.appendChild(meta);

        var link = document.createElement('a');
        link.className = 'donor-thanks__cta';
        link.href = '/src/pages/mpagila.html';
        link.textContent = summary.reached ? 'See supporters' : 'Support the hymnal';

        row.appendChild(mark);
        row.appendChild(copy);
        row.appendChild(link);
        card.appendChild(row);

        var meter = document.createElement('div');
        meter.className = 'donor-thanks__meter';
        meter.setAttribute('role', 'progressbar');
        meter.setAttribute('aria-valuemin', '0');
        meter.setAttribute('aria-valuemax', '100');
        meter.setAttribute('aria-valuenow', String(percent));
        var fill = document.createElement('div');
        fill.className = 'donor-thanks__fill';
        fill.style.width = percent + '%';
        meter.appendChild(fill);
        card.appendChild(meter);

        target.innerHTML = '';
        target.appendChild(card);
    }

    fetch('/api/donations/summary')
        .then(function (response) {
            if (!response.ok) throw new Error('Donation summary unavailable');
            return response.json();
        })
        .then(function (payload) {
            if (!payload || !payload.success) throw new Error('Donation summary unavailable');
            Array.prototype.forEach.call(targets, function (target) { render(target, payload.data || {}); });
        })
        .catch(function () {
            var fallback = { percent: 0, donorCount: 0, wall: [], reached: false };
            Array.prototype.forEach.call(targets, function (target) { render(target, fallback); });
        });
})();
