const db = require('./mongoDBApi');

const DB_NAME = 'newHymnal';
const COLLECTION = 'roles';
const CACHE_TTL_MS = 60 * 1000;

const PERMISSIONS = Object.freeze({
    ADMIN_ACCESS: 'admin:access',
    USERS_MANAGE: 'users:manage',
    ROLES_MANAGE: 'roles:manage',
    SONG_EDITS_READ: 'songEdits:read',
    SONG_EDITS_SUBMIT: 'songEdits:submit',
    SONG_EDITS_REVIEW: 'songEdits:review',
    DONATIONS_MANAGE: 'donations:manage',
    FEEDBACK_MANAGE: 'feedback:manage',
    ADVERTS_MANAGE: 'adverts:manage'
});

const BUILTIN_ROLES = Object.freeze({
    user: Object.freeze({
        name: 'user',
        label: 'Member',
        permissions: Object.freeze([]),
        builtin: true
    }),
    editor: Object.freeze({
        name: 'editor',
        label: 'Hymn Editor',
        permissions: Object.freeze([
            PERMISSIONS.SONG_EDITS_READ,
            PERMISSIONS.SONG_EDITS_SUBMIT
        ]),
        builtin: true
    }),
    admin: Object.freeze({
        name: 'admin',
        label: 'Administrator',
        permissions: Object.freeze(['*']),
        builtin: true
    })
});

const roleCache = new Map();

function normalizeRoleName(value) {
    const name = String(value || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{1,31}$/.test(name)) {
        throw new Error('Role names must be 2-32 lowercase letters, numbers, hyphens or underscores.');
    }
    return name;
}

function normalizePermissions(values) {
    if (!Array.isArray(values)) {
        throw new Error('Role permissions must be an array.');
    }
    const known = new Set(Object.values(PERMISSIONS));
    const unique = [];
    values.forEach((value) => {
        const permission = String(value || '').trim();
        if (!known.has(permission)) {
            throw new Error(`Unknown permission: ${permission || '(empty)'}`);
        }
        if (!unique.includes(permission)) unique.push(permission);
    });
    return unique;
}

function serializeRole(role) {
    return {
        name: role.name,
        label: role.label || role.name,
        description: role.description || '',
        permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
        builtin: role.builtin === true,
        updatedAt: role.updatedAt || null,
        updatedBy: role.updatedBy || null
    };
}

function cacheRole(role) {
    roleCache.set(role.name, { role, expiresAt: Date.now() + CACHE_TTL_MS });
    return role;
}

function clearRoleCache(name) {
    if (name) roleCache.delete(String(name).toLowerCase());
    else roleCache.clear();
}

async function getRole(value) {
    const name = normalizeRoleName(value || 'user');
    const cached = roleCache.get(name);
    if (cached && cached.expiresAt > Date.now()) return cached.role;
    if (BUILTIN_ROLES[name]) return cacheRole(serializeRole(BUILTIN_ROLES[name]));

    const result = await db.readRow({ _id: name }, DB_NAME, COLLECTION);
    if (result && !result.err && result.found && result.listing) {
        const stored = result.listing;
        return cacheRole({
            name,
            label: String(stored.label || name).slice(0, 60),
            description: String(stored.description || '').slice(0, 240),
            permissions: normalizePermissions(stored.permissions || []),
            builtin: false,
            updatedAt: stored.updatedAt || null,
            updatedBy: stored.updatedBy || null
        });
    }

    return null;
}

async function listRoles() {
    const result = await db.readRows({}, DB_NAME, COLLECTION);
    const roles = new Map(Object.values(BUILTIN_ROLES).map((role) => [role.name, serializeRole(role)]));
    if (result && !result.err && Array.isArray(result.listings)) {
        result.listings.forEach((stored) => {
            try {
                const name = normalizeRoleName(stored._id || stored.name);
                if (BUILTIN_ROLES[name]) return;
                roles.set(name, {
                    name,
                    label: String(stored.label || name).slice(0, 60),
                    description: String(stored.description || '').slice(0, 240),
                    permissions: normalizePermissions(stored.permissions || []),
                    builtin: false,
                    updatedAt: stored.updatedAt || null,
                    updatedBy: stored.updatedBy || null
                });
            } catch (_error) {
                // Ignore malformed role documents rather than exposing them to authorization.
            }
        });
    }
    return Array.from(roles.values()).sort((left, right) => left.label.localeCompare(right.label));
}

async function saveRole(nameValue, input, actor) {
    const name = normalizeRoleName(nameValue);
    if (BUILTIN_ROLES[name]) {
        throw new Error('Built-in roles cannot be changed. Create a custom role instead.');
    }
    const role = {
        _id: name,
        name,
        label: String(input.label || name).trim().slice(0, 60),
        description: String(input.description || '').trim().slice(0, 240),
        permissions: normalizePermissions(input.permissions || []),
        updatedAt: new Date(),
        updatedBy: actor && (actor.userName || actor.email) ? (actor.userName || actor.email) : 'admin'
    };
    const result = await db.updateRow2({ _id: name }, role, DB_NAME, COLLECTION);
    if (!result || result.err) throw new Error('Could not save the role.');
    clearRoleCache(name);
    const saved = await getRole(name);
    if (!saved || saved.label !== role.label || saved.permissions.join('|') !== role.permissions.join('|')) {
        throw new Error('The role could not be verified after saving.');
    }
    return saved;
}

async function deleteRole(nameValue) {
    const name = normalizeRoleName(nameValue);
    if (BUILTIN_ROLES[name]) throw new Error('Built-in roles cannot be deleted.');
    const assigned = await db.readRow({ role: name }, DB_NAME, 'users');
    if (assigned && !assigned.err && assigned.found) {
        throw new Error('Move users to another role before deleting this role.');
    }
    await db.deleteRow({ _id: name }, DB_NAME, COLLECTION);
    clearRoleCache(name);
    if (await getRole(name)) throw new Error('The role could not be verified as deleted.');
}

async function resolvePermissions(roleName) {
    const role = await getRole(roleName || 'user');
    return role ? role.permissions : [];
}

function hasPermission(user, permission) {
    if (!user || user.status !== 'approved' || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
}

module.exports = {
    PERMISSIONS,
    BUILTIN_ROLES,
    normalizeRoleName,
    normalizePermissions,
    getRole,
    listRoles,
    saveRole,
    deleteRole,
    resolvePermissions,
    hasPermission,
    clearRoleCache
};
