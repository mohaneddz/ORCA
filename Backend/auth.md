---

## 🔐 Auth API

All auth endpoints are under `/api/auth/`. On login or register, store the returned `token` and send it on every subsequent request as:
```
Authorization: Token <token>
```

---

### `POST /api/auth/register`

Creates a new organization account.

**Input (JSON body):**
```json
{
  "email": "admin@company.com",
  "name": "Acme Corp",
  "password": "secret123"
}
```

**Success `201`:**
```json
{
  "token": "a3f9c2d1e4b5...",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "email": "admin@company.com"
  }
}
```

| Status | Reason |
|--------|--------|
| `400` | Missing field or password shorter than 8 characters |
| `409` | Email already registered |

---

### `POST /api/auth/login`

Authenticates and returns a fresh token.

**Input (JSON body):**
```json
{
  "email": "admin@company.com",
  "password": "secret123"
}
```

**Success `200`:**
```json
{
  "token": "a3f9c2d1e4b5...",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "email": "admin@company.com"
  }
}
```

| Status | Reason |
|--------|--------|
| `400` | Missing email or password |
| `401` | Wrong credentials |

---

### `POST /api/auth/logout`

Revokes the current token.

**Input:** No body. Token in header:
```
Authorization: Token a3f9c2d1e4b5...
```

**Success `200`:** `{}`

| Status | Reason |
|--------|--------|
| `401` | Header missing, malformed, or token already revoked |