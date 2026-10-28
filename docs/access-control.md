# Capability-based access control

The application authorizes capabilities, not role names. Protected features declare the permission they require:

```js
const auth = require('../middleWares/auth');
const { PERMISSIONS } = require('../modules/roleAccess');

router.post('/example', auth.requireAuth,
  auth.requirePermission(PERMISSIONS.FEEDBACK_MANAGE), handler);
```

`requireAuth` reloads the user from MongoDB and resolves permissions from the user's role. Permissions are not trusted from the JWT, so role changes take effect without issuing another token. Role definitions are cached for at most 60 seconds.

## Built-in roles

Built-in roles are safe fallbacks and cannot be edited or deleted:

| Role | Permissions |
| --- | --- |
| `user` | none beyond authenticated-member features |
| `editor` | `songEdits:read`, `songEdits:submit` |
| `admin` | `*` (all permissions) |

## Permission catalogue

The catalogue is exported as `PERMISSIONS` from `modules/roleAccess.js`:

- `admin:access`
- `users:manage`
- `roles:manage`
- `songEdits:read`
- `songEdits:submit`
- `songEdits:review`
- `donations:manage`
- `feedback:manage`
- `adverts:manage`

Adding a new role does not require middleware changes. Create a role that combines existing permissions, then assign its name to users.

## Role administration API

```text
GET    /api/admin/permissions
GET    /api/admin/roles
PUT    /api/admin/roles/:name
DELETE /api/admin/roles/:name
```

Example body for `PUT /api/admin/roles/hymn-reviewer`:

```json
{
  "label": "Hymn Reviewer",
  "description": "Reviews submitted hymn corrections without managing users.",
  "permissions": [
    "songEdits:read",
    "songEdits:submit",
    "songEdits:review"
  ]
}
```

The role then appears automatically in the user dashboard's role selector. A custom role cannot be deleted while a user is assigned to it. Unknown permissions are rejected.

## Adding a protected capability

Introducing a new feature permission is the only time code should change:

1. Add one constant to `PERMISSIONS`.
2. Protect the feature with `auth.requirePermission(...)`.
3. Add that permission to the appropriate database-backed roles.

Do not check `req.user.role === '...'` in feature code. For conditional behavior inside a handler, use:

```js
auth.hasPermission(req.user, PERMISSIONS.FEEDBACK_MANAGE)
```
