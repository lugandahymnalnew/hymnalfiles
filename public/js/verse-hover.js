/**
 * Verse hover bubbles.
 *
 * Mark any element with data-verse="Book Chapter:Verse" (e.g. data-verse="Yokaana 3:16"
 * or a range "Yokaana 3:16-18") and this script turns it into a hoverable/tappable
 * link that shows the verse text in a floating bubble, fetched from /api/bible/...
 * and cached so repeat hovers don't re-fetch.
 *
 * Usage: <span data-verse="Yokaana 3:16">Yokaana 3:16</span>
 * Include this script once per page (after the DOM contains the marked elements).
 */
(function () {
    var cache = {};
    var bubble = null;
    var hideTimer = null;
    var activeTrigger = null;

    function slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function parseReference(raw) {
        var match = String(raw || '').trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (!match) return null;
        return {
            bookName: match[1].trim(),
            bookSlug: slugify(match[1].trim()),
            chapter: match[2],
            verseRange: match[4] ? match[3] + '-' + match[4] : match[3],
            display: match[1].trim() + ' ' + match[2] + ':' + (match[4] ? match[3] + '-' + match[4] : match[3])
        };
    }

    function ensureBubble() {
        if (bubble) return bubble;
        bubble = document.createElement('div');
        bubble.className = 'verse-hover-bubble';
        bubble.setAttribute('role', 'tooltip');
        document.body.appendChild(bubble);

        var style = document.createElement('style');
        style.textContent = [
            '.verse-hover-bubble {',
            '  position: fixed;',
            '  z-index: 1000;',
            '  max-width: 320px;',
            '  background: #1d2a2f;',
            '  color: #fdfaf3;',
            '  padding: 12px 14px;',
            '  border-radius: 12px;',
            '  font-size: 0.88rem;',
            '  line-height: 1.55;',
            '  box-shadow: 0 12px 30px rgba(0,0,0,0.25);',
            '  opacity: 0;',
            '  transform: translateY(4px);',
            '  transition: opacity 0.15s ease, transform 0.15s ease;',
            '  pointer-events: none;',
            '}',
            '.verse-hover-bubble.show { opacity: 1; transform: translateY(0); }',
            '.verse-hover-bubble .vhb-ref { font-weight: 700; color: #d9a441; margin-bottom: 4px; display: block; }',
            '[data-verse] { cursor: help; border-bottom: 1px dotted currentColor; }'
        ].join('\n');
        document.head.appendChild(style);
        return bubble;
    }

    function positionBubble(trigger) {
        var rect = trigger.getBoundingClientRect();
        var b = ensureBubble();
        var top = rect.bottom + 8;
        var left = rect.left;

        // Keep on-screen horizontally.
        var maxLeft = window.innerWidth - 340;
        if (left > maxLeft) left = Math.max(8, maxLeft);

        // Flip above if it would overflow the bottom of the viewport.
        b.style.left = left + 'px';
        b.style.top = top + 'px';
        var bubbleRect = b.getBoundingClientRect();
        if (bubbleRect.bottom > window.innerHeight) {
            b.style.top = (rect.top - bubbleRect.height - 8) + 'px';
        }
    }

    function showBubble(trigger, html) {
        var b = ensureBubble();
        b.innerHTML = html;
        positionBubble(trigger);
        b.classList.add('show');
    }

    function hideBubble() {
        if (bubble) bubble.classList.remove('show');
        activeTrigger = null;
    }

    async function fetchVerse(ref) {
        var cacheKey = ref.bookSlug + ':' + ref.chapter + ':' + ref.verseRange;
        if (cache[cacheKey]) return cache[cacheKey];

        var url = '/api/bible/' + encodeURIComponent(ref.bookSlug) + '/' + encodeURIComponent(ref.chapter) + '/' + encodeURIComponent(ref.verseRange);
        var res = await fetch(url);
        var data = await res.json();
        if (!data.success) throw new Error(data.message || 'Verse not found');

        var text = data.data.verses.map(function (v) { return v.text; }).join(' ');
        cache[cacheKey] = text;
        return text;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    async function handleTrigger(trigger) {
        var raw = trigger.getAttribute('data-verse');
        var ref = parseReference(raw);
        if (!ref) return;

        activeTrigger = trigger;
        showBubble(trigger, '<span class="vhb-ref">' + escapeHtml(ref.display) + '</span>Loading…');

        try {
            var text = await fetchVerse(ref);
            if (activeTrigger !== trigger) return; // hovered away before the fetch resolved
            showBubble(trigger, '<span class="vhb-ref">' + escapeHtml(ref.display) + '</span>' + escapeHtml(text));
        } catch (e) {
            if (activeTrigger !== trigger) return;
            showBubble(trigger, '<span class="vhb-ref">' + escapeHtml(ref.display) + '</span>Couldn\'t load this verse.');
        }
    }

    function init() {
        document.addEventListener('mouseover', function (e) {
            var trigger = e.target.closest('[data-verse]');
            if (!trigger) return;
            clearTimeout(hideTimer);
            handleTrigger(trigger);
        });

        document.addEventListener('mouseout', function (e) {
            var trigger = e.target.closest('[data-verse]');
            if (!trigger) return;
            hideTimer = setTimeout(hideBubble, 150);
        });

        // Touch/keyboard support: tap or focus toggles the bubble.
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-verse]');
            if (!trigger) {
                hideBubble();
                return;
            }
            if (activeTrigger === trigger && bubble && bubble.classList.contains('show')) {
                hideBubble();
            } else {
                handleTrigger(trigger);
            }
        });

        document.addEventListener('focusin', function (e) {
            var trigger = e.target.closest('[data-verse]');
            if (trigger) handleTrigger(trigger);
        });
        document.addEventListener('focusout', function (e) {
            var trigger = e.target.closest('[data-verse]');
            if (trigger) hideTimer = setTimeout(hideBubble, 150);
        });

        window.addEventListener('scroll', hideBubble, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
