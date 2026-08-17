/**
 * Auth Utility - JWT Token Management with Refresh Support
 * Handles login, logout, token refresh, and authenticated API requests
 */

(function() {
    const ACCESS_TOKEN_KEY = 'accessToken';
    const REFRESH_TOKEN_KEY = 'refreshToken';
    const USER_KEY = 'authUser';
    const TOKEN_EXPIRY_KEY = 'tokenExpiry';

    // Token refresh threshold (refresh when less than 5 minutes remaining)
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

    let refreshTimer = null;

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
        return userStr ? JSON.parse(userStr) : null;
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
        const user = getUser();
        return user && user.role === 'admin' && user.status === 'approved';
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
     * Store auth tokens and user data
     */
    function storeAuth(accessToken, refreshToken, user) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

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
        }

        const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!expiryStr) return;

        const expiry = parseInt(expiryStr, 10);
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
     */
    async function refreshAccessToken() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            clearAuth();
            return { success: false, error: 'No refresh token' };
        }

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                storeAuth(data.accessToken, data.refreshToken, getUser());
                return { success: true, accessToken: data.accessToken };
            } else {
                // Refresh failed, clear auth
                clearAuth();
                return { success: false, error: data.message || 'Refresh failed' };
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Make authenticated API request
     * Automatically refreshes token if needed
     */
    async function apiRequest(url, options = {}) {
        let token = getAccessToken();

        if (!token && isLoggedIn()) {
            // Try to refresh if no token but user is logged in
            const refreshResult = await refreshAccessToken();
            if (!refreshResult.success) {
                throw new Error('Authentication required');
            }
            token = refreshResult.accessToken;
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
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
        } catch (error) {
            throw error;
        }
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
     * Initialize auth state on page load
     */
    function init() {
        // Check if we have tokens and schedule refresh
        if (getAccessToken() && getTokenExpiry(getAccessToken())) {
            scheduleRefresh();
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
        login,
        logout,
        logoutAll,
        getCurrentUser,
        getAccessToken,
        getRefreshToken,
        apiRequest,
        refreshAccessToken
    };

})();
