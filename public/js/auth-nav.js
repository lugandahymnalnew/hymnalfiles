/**
 * Renders account/login state into any element with id="authNav".
 * Depends on window.auth (js/auth.js) being loaded first.
 */
(function () {
    function render() {
        var el = document.getElementById('authNav');
        if (!el || !window.auth) return;

        if (window.auth.isLoggedIn()) {
            var user = window.auth.getCurrentUser();
            var name = (user && (user.fullName || user.userName)) || 'Account';
            el.innerHTML =
                '<span class="auth-nav__greeting">Signed in as <strong>' + escapeHtml(name) + '</strong></span>' +
                '<a href="/dashboard" class="auth-nav__link">Dashboard</a>' +
                '<button type="button" id="authNavLogout" class="auth-nav__link auth-nav__logout">Log out</button>';

            var logoutBtn = document.getElementById('authNavLogout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async function () {
                    logoutBtn.disabled = true;
                    logoutBtn.textContent = 'Logging out...';
                    await window.auth.logout();
                    render();
                });
            }
        } else {
            el.innerHTML = '<a href="/login" class="auth-nav__link">Sign In</a>';
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
