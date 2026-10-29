/**
 * Account control for the forum and admin pages.
 *
 * The session itself lives in public/js/auth.js. This file holds no session
 * state of its own — it reads from auth, and asks auth to sign out.
 *
 * A page that wants the control in its top right corner includes two lines:
 *
 *   <script src="/js/auth.js"></script>
 *   <script src="/js/forum-account.js"></script>
 *
 * auth.js has to come first. By default the control is placed at the top
 * right of the window and stays there while the page scrolls, so a visitor
 * can always reach it.
 *
 * A page that has a header bar of its own can have the control put inside
 * it instead, which looks more at home:
 *
 *   <body data-account-into="header .wrap" data-account-theme="dark">
 *
 * A page that keeps the floating control but has a header bar reaching the
 * top of the window can push the control clear of it:
 *
 *   <body data-account-below="header">
 */

(function () {
    if (window.forumAccount) {
        return;
    }

    var CONTAINER_ID = 'forumAccount';
    var STYLE_ID = 'forumAccountStyle';

    var STYLE = [
        '.forum-account {',
        '  position: fixed;',
        '  top: var(--forum-account-top, 12px);',
        '  right: 16px;',
        '  z-index: 60;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 10px;',
        '  padding: 6px 12px;',
        '  border: 1px solid var(--line, rgba(22, 40, 48, 0.12));',
        '  border-radius: 999px;',
        '  background: var(--panel, #fffdf8);',
        '  box-shadow: 0 6px 18px rgba(28, 40, 44, 0.10);',
        '  font-family: inherit;',
        '  font-size: 0.85rem;',
        '  line-height: 1.2;',
        '}',
        '.forum-account-name {',
        '  font-weight: 600;',
        '  color: var(--ink, #1d2a2f);',
        '  max-width: 150px;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '  white-space: nowrap;',
        '}',
        '.forum-account-link {',
        '  color: var(--accent, #0f766e);',
        '  font-weight: 600;',
        '  text-decoration: none;',
        '  white-space: nowrap;',
        '}',
        '.forum-account-link:hover {',
        '  text-decoration: underline;',
        '}',
        '.forum-account-signin {',
        '  color: var(--accent, #0f766e);',
        '  font-weight: 700;',
        '  text-decoration: none;',
        '  white-space: nowrap;',
        '}',
        '.forum-account-signin:hover {',
        '  text-decoration: underline;',
        '}',
        '.forum-account-signout {',
        '  appearance: none;',
        '  border: 1px solid var(--line, rgba(22, 40, 48, 0.12));',
        '  background: transparent;',
        '  color: var(--accent, #0f766e);',
        '  font-family: inherit;',
        '  font-size: 0.82rem;',
        '  font-weight: 700;',
        '  padding: 4px 10px;',
        '  border-radius: 999px;',
        '  cursor: pointer;',
        '  white-space: nowrap;',
        '}',
        '.forum-account-signout:hover {',
        '  background: var(--accent, #0f766e);',
        '  color: #fff;',
        '}',
        '.forum-account-signout:disabled {',
        '  opacity: 0.6;',
        '  cursor: default;',
        '}',
        // Put inside a page header rather than floating over it.
        '.forum-account-inline {',
        '  position: static;',
        '}',
        // For a header bar with a dark colour behind it.
        '.forum-account-on-dark {',
        '  background: rgba(255, 255, 255, 0.12);',
        '  border-color: rgba(255, 255, 255, 0.35);',
        '  box-shadow: none;',
        '}',
        '.forum-account-on-dark .forum-account-name { color: #fff; }',
        '.forum-account-on-dark .forum-account-link,',
        '.forum-account-on-dark .forum-account-signin { color: #f4d78a; }',
        '.forum-account-on-dark .forum-account-signout {',
        '  color: #f4d78a;',
        '  border-color: rgba(255, 255, 255, 0.35);',
        '}',
        '.forum-account-on-dark .forum-account-signout:hover {',
        '  background: #f4d78a;',
        '  color: #063f3b;',
        '}',
        '@media (max-width: 640px) {',
        '  .forum-account { top: 8px; right: 10px; padding: 5px 10px; gap: 8px; }',
        '  .forum-account-name { max-width: 72px; }',
        '}',
        // On a narrow screen the control and the page heading have to share
        // the top of the window, so the link to the visitor's own feedback
        // is the first thing to go.
        '@media (max-width: 560px) {',
        '  .forum-account-link { display: none; }',
        '}'
    ].join('\n');

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = STYLE;
        document.head.appendChild(style);
    }

    function currentPath() {
        return window.location.pathname + window.location.search;
    }

    function signInUrl() {
        return '/login?returnTo=' + encodeURIComponent(currentPath());
    }

    function displayName(user) {
        if (!user) return '';
        return user.fullName || user.userName || 'Account';
    }

    function container() {
        var el = document.getElementById(CONTAINER_ID);
        if (el) {
            return el;
        }

        el = document.createElement('div');
        el.id = CONTAINER_ID;
        el.className = 'forum-account';

        var theme = document.body.getAttribute('data-account-theme');
        if (theme) {
            el.className += ' forum-account-on-' + theme;
        }

        // A page can have the control put inside one of its own elements,
        // which suits a page with a header bar of its own.
        var selector = document.body.getAttribute('data-account-into');
        var host = selector ? document.querySelector(selector) : null;

        if (host) {
            el.className += ' forum-account-inline';
            host.appendChild(el);
        } else {
            document.body.insertBefore(el, document.body.firstChild);
        }

        return el;
    }

    function empty(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    function renderSignedOut(el) {
        empty(el);
        var link = document.createElement('a');
        link.className = 'forum-account-signin';
        link.href = signInUrl();
        link.textContent = 'Sign in';
        el.appendChild(link);
    }

    function renderSignedIn(el, user) {
        empty(el);

        var name = document.createElement('span');
        name.className = 'forum-account-name';
        name.textContent = displayName(user);
        if (user.email) {
            name.title = user.email;
        }
        el.appendChild(name);

        var mine = document.createElement('a');
        mine.className = 'forum-account-link';
        mine.href = '/feedback/my-feedback';
        mine.textContent = 'My feedback';
        el.appendChild(mine);

        var out = document.createElement('button');
        out.type = 'button';
        out.className = 'forum-account-signout';
        out.textContent = 'Sign out';
        out.addEventListener('click', function () {
            out.disabled = true;
            out.textContent = 'Signing out...';
            window.auth.logout().then(function () {
                window.location.href = '/login';
            }).catch(function () {
                window.location.href = '/login';
            });
        });
        el.appendChild(out);
    }

    /**
     * Put the control clear of a page header that reaches the top of the
     * window. The header is measured rather than given a fixed distance, so
     * it still clears when the header is taller than usual, which is what
     * happens on a narrow screen. The measurement is against the document,
     * not the window, so it does not move as the page is scrolled.
     */
    function applyOffset(el) {
        var selector = document.body.getAttribute('data-account-below');
        if (!selector) return;

        var anchor = document.querySelector(selector);
        if (!anchor) return;

        var bottom = anchor.getBoundingClientRect().bottom + window.scrollY;
        el.style.top = Math.round(bottom + 12) + 'px';
    }

    /**
     * Put the control over the right hand edge of the page's own column,
     * rather than out in the margin at the edge of the window. On a wide
     * screen the column is centred, and a control pinned to the window
     * would sit a long way from everything else on the page.
     */
    function alignToColumn(el) {
        if (el.className.indexOf('forum-account-inline') !== -1) return;

        var column = document.querySelector('.container, .wrap, main');
        if (!column) return;

        var rect = column.getBoundingClientRect();
        if (!rect || !rect.width) return;

        var right = Math.round(window.innerWidth - rect.right);
        el.style.right = (right > 16 ? right : 16) + 'px';
    }

    function render() {
        var auth = window.auth;
        var el = container();

        if (!auth) {
            el.style.display = 'none';
            return;
        }

        applyOffset(el);
        alignToColumn(el);

        // Paint straight away from what is already stored, so a signed in
        // visitor never sees "Sign in" flash past.
        var user = auth.getCurrentUser();
        if (user) {
            renderSignedIn(el, user);
        } else {
            renderSignedOut(el);
        }

        // Nothing to confirm when there is no refresh token, and asking
        // would only produce a request that cannot succeed.
        if (!auth.getRefreshToken()) return;

        // Then ask the server who this is. A session that has been ended
        // somewhere else shows as signed out, rather than as a name that is
        // no longer right.
        auth.apiRequest('/api/auth/me').then(function (response) {
            if (!response.ok) {
                renderSignedOut(el);
                return;
            }
            return response.json().then(function (data) {
                if (data && data.success && data.user) {
                    renderSignedIn(el, data.user);
                } else {
                    renderSignedOut(el);
                }
            });
        }).catch(function () {
            // The server could not be reached. What is on screen is left
            // alone; the next page load tries again.
        });
    }

    function init() {
        if (!window.auth) {
            console.warn('forum-account.js needs /js/auth.js to be loaded before it.');
            return;
        }
        ensureStyle();
        container();
        render();

        // The page can be resized, and the column it is measured against
        // moves with it.
        window.addEventListener('resize', function () {
            var el = document.getElementById(CONTAINER_ID);
            if (!el) return;
            applyOffset(el);
            alignToColumn(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.forumAccount = {
        render: render
    };

})();
