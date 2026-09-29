# RBAC API Documentation

**Base URL:** `https://analytics.kiwichito.com/rbac`
**Authentication:** Firebase ID Token (Bearer token)

---

## Authentication

All RBAC endpoints require Firebase authentication. Include the ID token in the Authorization header:

```http
Authorization: Bearer <firebase-id-token>
```

---

## Endpoints

### 1. Get Current User Info

```http
GET /rbac/me
```

**Description:** Get the authenticated user's access information.

**Required Permission:** `settings:read:self` (all roles)

**Response:**
```json
{
  "user": {
    "uid": "...",
    "email": "user@example.com",
    "role": "viewer",
    "type": "human",
    "status": "granted",
    "permissions": ["demos:read:assigned", "settings:read:self"],
    "allowedDemos": ["demo1", "demo2"],
    "expiresAt": null,
    "grantedAt": "2026-09-28T...",
    "grantedBy": "kiwichito@gmail.com"
  }
}
```

---

### 2. List All Users

```http
GET /rbac/users
```

**Description:** List all users with their roles and permissions.

**Required Permission:** `users:read` (owner, admin)

**Response:**
```json
{
  "users": [
    {
      "uid": "...",
      "email": "user@example.com",
      "role": "viewer",
      "type": "human",
      "status": "granted",
      "permissions": ["..."],
      "allowedDemos": ["..."],
      "expiresAt": null,
      "requestedAt": "2026-09-28T...",
      "grantedAt": "2026-09-28T...",
      "grantedBy": "kiwichito@gmail.com",
      "updatedAt": "2026-09-28T..."
    }
  ]
}
```

---

### 3. Get User Details

```http
GET /rbac/users/:uid
```

**Description:** Get detailed information for a specific user.

**Required Permission:** `users:read` (owner, admin)

**Parameters:**
- `uid` (path) - User ID

**Response:**
```json
{
  "user": {
    "uid": "...",
    "email": "user@example.com",
    "role": "viewer",
    ...
  }
}
```

---

### 4. Grant User Access

```http
POST /rbac/users/:uid/grant
```

**Description:** Grant access to a new or existing user.

**Required Permission:** `users:grant` (owner only)

**Parameters:**
- `uid` (path) - User ID
- `email` (body) - User email **(required)**
- `role` (body) - Role: `viewer`, `admin`, or `service` (default: `viewer`)
- `allowedDemos` (body) - Array of demo IDs, or `["*"]` for all (default: `[]`)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "viewer",
  "allowedDemos": ["demo1", "demo2"]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "email": "newuser@example.com",
    "role": "viewer",
    "permissions": ["demos:read:assigned", "settings:read:self"],
    "allowedDemos": ["demo1", "demo2"],
    ...
  }
}
```

---

### 5. Revoke User Access

```http
POST /rbac/users/:uid/revoke
```

**Description:** Revoke access from a user (cannot revoke owner).

**Required Permission:** `users:revoke` (owner only)

**Parameters:**
- `uid` (path) - User ID
- `reason` (body, optional) - Reason for revocation

**Request Body:**
```json
{
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `403` - Cannot revoke owner access
- `404` - User not found

---

### 6. Change User Role

```http
PATCH /rbac/users/:uid/role
```

**Description:** Change a user's role (cannot change owner, cannot promote to owner).

**Required Permission:** `users:changeRole` (owner only)

**Parameters:**
- `uid` (path) - User ID
- `role` (body) - New role: `viewer`, `admin`, or `service`

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `403` - Cannot change owner role or promote to owner
- `404` - User not found

---

### 7. Assign Demos to User

```http
PATCH /rbac/users/:uid/demos
```

**Description:** Update which demos a user can access.

**Required Permission:** `demos:write` (owner, admin)

**Parameters:**
- `uid` (path) - User ID
- `allowedDemos` (body) - Array of demo IDs, or `["*"]` for all

**Request Body:**
```json
{
  "allowedDemos": ["demo1", "demo3", "demo5"]
}
```

Or grant access to all demos:
```json
{
  "allowedDemos": ["*"]
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 8. View Audit Log

```http
GET /rbac/audit-log?limit=100&skip=0&action=user.grant&actorEmail=owner@example.com
```

**Description:** View audit log of all admin actions.

**Required Permission:** `users:read` (owner, admin)

**Query Parameters:**
- `limit` (optional) - Number of records to return (default: 100)
- `skip` (optional) - Number of records to skip for pagination (default: 0)
- `action` (optional) - Filter by action type (e.g., `user.grant`, `user.revoke`, `user.roleChange`)
- `actorEmail` (optional) - Filter by who performed the action

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-09-28T...",
      "action": "user.grant",
      "actor": {
        "uid": "...",
        "email": "owner@example.com",
        "role": "owner"
      },
      "target": {
        "type": "user",
        "uid": "...",
        "email": "newuser@example.com"
      },
      "changes": {
        "role": "viewer",
        "allowedDemos": ["demo1"]
      },
      "result": "success",
      "expiresAt": "2027-09-28T..."
    }
  ],
  "total": 42,
  "limit": 100,
  "skip": 0
}
```

---

### 9. List All Demos

```http
GET /rbac/demos
```

**Description:** List all available demos.

**Required Permission:** `demos:read` (owner, admin, viewer with assigned demos)

**Response:**
```json
{
  "demos": [
    {
      "_id": "...",
      "slug": "tiktok-live",
      "title": "TikTok Live Chat",
      "description": "..."
    }
  ]
}
```

---

## Role Permissions

### Owner (`owner`)
- God mode: `["*:*"]`
- Full access to everything
- Cannot be revoked or changed
- Only 1 owner allowed

### Admin (`admin`)
```json
[
  "users:read",
  "demos:read",
  "demos:write",
  "demos:create",
  "demos:delete",
  "analytics:read",
  "analytics:export"
]
```

### Viewer (`viewer`)
```json
[
  "demos:read:assigned",
  "settings:read:self"
]
```

### Service (`service`)
```json
[
  "api:read",
  "api:write"
]
```

---

## Permission Format

Permissions follow the pattern: `resource:action[:scope]`

Examples:
- `users:read` - Can list users
- `users:grant` - Can grant access
- `demos:read` - Can read all demos
- `demos:read:assigned` - Can only read assigned demos
- `demos:*` - All demo permissions
- `*:*` - God mode (owner only)

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Missing or invalid token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied: Missing permission 'users:grant'"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to grant access"
}
```

---

## Audit Actions

All admin actions are logged with these action types:

- `user.grant` - User access granted
- `user.revoke` - User access revoked
- `user.roleChange` - User role changed
- `user.demosAssigned` - User demos updated
- `system.migration` - Database migration

---

## Usage Examples

### Get current user info
```typescript
const response = await fetch('https://analytics.kiwichito.com/rbac/me', {
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`
  }
});
const { user } = await response.json();
```

### List all users (owner/admin only)
```typescript
const response = await fetch('https://analytics.kiwichito.com/rbac/users', {
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`
  }
});
const { users } = await response.json();
```

### Grant access to a new user (owner only)
```typescript
const response = await fetch(`https://analytics.kiwichito.com/rbac/users/${uid}/grant`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    role: 'viewer',
    allowedDemos: ['demo1', 'demo2']
  })
});
```

### Assign demos to a user (owner/admin)
```typescript
const response = await fetch(`https://analytics.kiwichito.com/rbac/users/${uid}/demos`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    allowedDemos: ['*']  // Grant all demos
  })
});
```

---

## Testing

You can test the API locally:

1. Start the server: `npm start`
2. Get a Firebase ID token from your Angular app
3. Use curl or Postman to test endpoints:

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  https://analytics.kiwichito.com/rbac/me
```

---

**Last Updated:** 2026-09-28
**Version:** 1.0
