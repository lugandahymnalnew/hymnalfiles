/**
 * Auth Utility - JWT Token Management with Refresh Support
 * Handles login, logout, token refresh, and authenticated API requests
 *
 * This is the one place the sign-in state lives. Pages that need an account
 * call `auth.guard()` instead of checking localStorage themselves.
 */

(function() {
    const ACCESS_TOKEN_KEY = 'accessToken';
    const REFRESH_TOKEN_KEY = 'refreshToken';
    const USER_KEY = 'authUser';
    const TOKEN_EXPIRY_KEY = 'tokenExpiry';

    // Token refresh threshold (refresh when less than 5 minutes remaining)
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

    let refreshTimer = null;

    // Set while a refresh is in flight, so that several requests hitting an
    // expired token at once share one refresh instead of racing each other.
    let refreshInFlight = null;

    /**
     * Get stored access token
     */
    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    /**
     * Get stored refresh token
     */
    function getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    /**
     * Get stored user data
     */
    function getUser() {
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            // A corrupted entry should not break every page that reads it.
            localStorage.removeItem(USER_KEY);
            return null;
        }
    }

    /**
     * Check if user is logged in
     */
    function isLoggedIn() {
        return !!getAccessToken() && !!getUser();
    }

    /**
     * Check if user is admin
     */
    function isAdmin() {
        return hasPermission('admin:access');
    }

    function hasPermission(permission) {
        const user = getUser();
        const permissions = user && Array.isArray(user.permissions) ? user.permissions : [];
        return !!user && user.status === 'approved' && (permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1);
    }

    function canEditSongs() {
        return hasPermission('songEdits:read');
    }

    /**
     * Decode JWT token to get expiry time
     */
    function getTokenExpiry(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.exp ? payload.exp * 1000 : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Is the stored access token already past its expiry?
     * A token with no expiry claim is left alone.
     */
    function isAccessTokenExpired() {
        const expiry = getTokenExpiry(getAccessToken());
        if (!expiry) return false;
        return Date.now() >= expiry;
    }

    /**
     * Store auth tokens and user data
     */
    function storeAuth(accessToken, refreshToken, user) {
        if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));

        const expiry = getTokenExpiry(accessToken);
        if (expiry) {
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
        }

        scheduleRefresh();
    }

    /**
     * Clear all auth data
     */
    function clearAuth() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);

        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }

    /**
     * Schedule token refresh before expiry
     */
    function scheduleRefresh() {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }

        let expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY), 10);

        if (!expiry) {
            // The stored expiry can be missing — the login form used to leave
            // it out — but the token itself says when it expires, so fall
            // back to reading it from there rather than giving up.
            expiry = getTokenExpiry(getAccessToken());
        }

        if (!expiry) return;

        const now = Date.now();
        const timeUntilExpiry = expiry - now;

        if (timeUntilExpiry <= REFRESH_THRESHOLD_MS) {
            // Token already expired or about to expire, refresh now
            refreshAccessToken();
        } else {
            // Schedule refresh 5 minutes before expiry
            const refreshTime = timeUntilExpiry - REFRESH_THRESHOLD_MS;
            refreshTimer = setTimeout(refreshAccessToken, refreshTime);
        }
    }

    /**
     * Refresh access token using refresh token
     *
     * A failed refresh does not throw the session away unless the server
     * rejected the refresh token itself. A server error or a dropped
     * connection is a bad moment, not a reason to sign the user out — the
     * refresh token is still good and the next attempt will succeed.
     */
    async function refreshAccessToken() {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async function() {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                return { success: false, error: 'No refresh token', fatal: true };
            }

            try {
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });

                let data = null;
                try {
                    data = await response.json();
                } catch (e) {
                    data = null;
                }

                if (response.ok && data && data.success) {
                    storeAuth(data.accessToken, data.refreshToken, getUser());
                    return { success: true, accessToken: data.accessToken, fatal: false };
                }

                const message = (data && data.message) || 'Refresh failed';

                // Only a refusal means the token is no longer good. Anything
                // else is a hiccup, so the session is kept.
                const fatal = response.status === 401 || response.status === 403;
                if (fatal) clearAuth();

                return { success: false, error: message, fatal: fatal };
            } catch (error) {
                console.error('Token refresh error:', error);
                return { success: false, error: error.message, fatal: false };
            }
        })();

        try {
            return await refreshInFlight;
        } finally {
            refreshInFlight = null;
        }
    }

    /**
     * Make authenticated API request
     * Automatically refreshes token if needed
     */
    async function apiRequest(url, options = {}) {
        let token = getAccessToken();

        // An expired token is worth replacing before the request goes out,
        // rather than after it comes back as a 401.
        if (getRefreshToken() && (!token || isAccessTokenExpired())) {
            const refreshResult = await refreshAccessToken();
            if (refreshResult.success) {
                token = refreshResult.accessToken;
            }
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        // If 401, try to refresh token and retry once
        if (response.status === 401 && getRefreshToken()) {
            const refreshResult = await refreshAccessToken();
            if (refreshResult.success) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
                return await fetch(url, {
                    ...options,
                    headers
                });
            }
        }

        return response;
    }

    /**
     * Login with username/email and password
     */
    async function login(userName, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userName, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                storeAuth(data.accessToken, data.refreshToken, data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.message || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout - revoke tokens and clear local storage
     */
    async function logout() {
        const refreshToken = getRefreshToken();
        const token = getAccessToken();

        // Try to revoke refresh token on server
        if (refreshToken) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (e) {
                console.error('Logout error:', e);
            }
        }

        clearAuth();
        return { success: true };
    }

    /**
     * Logout from all sessions
     */
    async function logoutAll() {
        const refreshToken = getRefreshToken();
        const token = getAccessToken();

        try {
            await fetch('/api/auth/revoke-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ refreshToken })
            });
        } catch (e) {
            console.error('Logout all error:', e);
        }

        clearAuth();
        return { success: true };
    }

    /**
     * Get current user data
     */
    function getCurrentUser() {
        return getUser();
    }

    /**
     * Keep only same-site paths. A return value of "//example.com" or
     * "https://example.com" would send the visitor off to another site.
     */
    function safeReturnTo(value) {
        if (!value || typeof value !== 'string') return null;

        let path = value;
        try {
            path = decodeURIComponent(value);
        } catch (e) {
            // Not encoded, or badly encoded. Use it as it came.
        }

        if (!path.startsWith('/') || path.startsWith('//')) return null;
        return path;
    }

    /**
     * Where to send the visitor after they sign in.
     */
    function getReturnTo() {
        const params = new URLSearchParams(window.location.search);
        return safeReturnTo(params.get('returnTo') || params.get('redirect'));
    }

    function redirectToLogin(returnTo) {
        const target = safeReturnTo(returnTo) || getReturnTo() || '/dashboard';
        window.location.href = '/login?returnTo=' + encodeURIComponent(target);
    }

    /**
     * Ask the server who the signed-in user is, so that a copy of the user
     * left in localStorage cannot grant access that has since been removed.
     */
    async function fetchCurrentUser() {
        try {
            const response = await apiRequest('/api/auth/me');
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.success && data.user) {
                storeAuth(getAccessToken(), getRefreshToken(), data.user);
                return data.user;
            }
        } catch (e) {
            console.error('Could not confirm the signed-in user:', e);
        }
        return null;
    }

    /**
     * The shared entry point for pages that need a signed-in user.
     *
     * Every page that needs an account used to check for a token itself, and
     * each one did it slightly differently: some sent the visitor to the
     * login page, some showed a message, some just rendered an empty page.
     * This does the check in one place, so every page behaves the same.
     *
     * @param {Object} [options]
     * @param {string} [options.permission] - a permission the user must hold
     * @param {string} [options.returnTo] - where to send the visitor after signing in
     * @returns {Promise<{ok: boolean, user: Object|null, reason: string|null}>}
     */
    async function guard(options = {}) {
        const permission = options.permission;
        const returnTo = options.returnTo;

        // No access token, or one that has already expired: get a new one
        // from the refresh token before deciding nobody is signed in.
        if (!getAccessToken() || isAccessTokenExpired()) {
            const refreshed = await refreshAccessToken();
            if (!refreshed.success && refreshed.fatal) {
                redirectToLogin(returnTo);
                return { ok: false, user: null, reason: 'signed-out' };
            }
        }

        const user = (await fetchCurrentUser()) || getUser();

        if (!user) {
            redirectToLogin(returnTo);
            return { ok: false, user: null, reason: 'signed-out' };
        }

        if (permission && !hasPermission(permission)) {
            return { ok: false, user: user, reason: 'permission' };
        }

        return { ok: true, user: user, reason: null };
    }

    /**
     * Initialize auth state on page load
     */
    function init() {
        // Check if we have tokens and schedule refresh
        if (getAccessToken() && getTokenExpiry(getAccessToken())) {
            scheduleRefresh();
        } else if (getRefreshToken()) {
            // There is a refresh token but no usable access token, so get
            // one now rather than waiting for the first request to fail.
            refreshAccessToken();
        }

        // Listen for storage events (for multi-tab sync)
        window.addEventListener('storage', function(e) {
            if (e.key === ACCESS_TOKEN_KEY && !e.newValue) {
                // Token cleared in another tab
                if (refreshTimer) {
                    clearTimeout(refreshTimer);
                    refreshTimer = null;
                }
            }
        });
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API
    window.auth = {
        isLoggedIn,
        isAdmin,
        canEditSongs,
        hasPermission,
        login,
        logout,
        logoutAll,
        getCurrentUser,
        getAccessToken,
        getRefreshToken,
        getReturnTo,
        apiRequest,
        refreshAccessToken,
        guard
    };

})();
