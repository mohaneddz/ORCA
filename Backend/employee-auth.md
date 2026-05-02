# Employee Authentication — API Reference

Employee auth endpoints live under `/api/auth/employee/`.

Employees are **created by the organization** (via `POST /api/employees/`).  
They cannot self-register.

---

## Token scheme

After a successful login the server returns a **`token`**.  
Include it on every subsequent employee request as:

```
Authorization: EmployeeToken <token>
```

> This is different from the organization token scheme (`Authorization: Token …`).  
> Do **not** mix them up.

---

## Endpoints

### `POST /api/auth/employee/login`

Authenticates an employee with their email and password.

**Body**
```json
{
  "email": "alice@company.com",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "token": "d4e5f6a7b8c9...",
  "employee": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Alice Smith",
    "email": "alice@company.com",
    "department": "Engineering",
    "role": "Backend Developer",
    "seniority": "mid",
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp"
    }
  }
}
```

| Status | Reason |
|--------|--------|
| `400` | Missing `email` or `password` field |
| `401` | Wrong credentials or account deactivated |

---

### `POST /api/auth/employee/logout`

Revokes the current employee token.

**Headers**
```
Authorization: EmployeeToken d4e5f6a7b8c9...
```

**Body:** none

**Response `200`:** `{}`

| Status | Reason |
|--------|--------|
| `401` | Header missing, malformed, or token already revoked |

---

### `GET /api/auth/employee/me`

Returns the profile of the currently authenticated employee.

**Headers**
```
Authorization: EmployeeToken d4e5f6a7b8c9...
```

**Response `200`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Alice Smith",
  "email": "alice@company.com",
  "department": "Engineering",
  "role": "Backend Developer",
  "seniority": "mid",
  "is_active": true,
  "registered_at": "2026-05-02T10:00:00Z",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp"
  }
}
```

| Status | Reason |
|--------|--------|
| `401` | Token missing, malformed, or invalid |

---

## Seniority values

| Value | Label |
|-------|-------|
| `junior` | Junior |
| `mid` | Mid |
| `senior` | Senior |
| `lead` | Lead |
| `manager` | Manager |
| `executive` | Executive |

---

## Typical flow

```
1. Organization POSTs to /api/employees/ to create an employee (name, email, password, …)
2. Employee POSTs to /api/auth/employee/login  →  receives token
3. Extension / desktop app stores the token
4. Every subsequent request includes:  Authorization: EmployeeToken <token>
5. On sign-out, POST to /api/auth/employee/logout to revoke the token
```

---

## Extension-protected routes

The following extension-facing routes also require the same employee token header:

- `GET /api/extension/blacklist`
- `GET /api/extension/ai-targets`
- `GET /api/extension/poll`
- `POST /api/logs/dlp`
- `POST /api/logs/blacklist`
- `POST /api/gamification/submit-quiz`

For these routes, employee identity is derived from the token. Any `employee_id` field sent by a client is ignored.

---

## Notes

- Passwords must be **at least 8 characters**.
- Only **active** employees (`is_active: true`) can log in.  
  Deactivated employees receive `401`.
- Each login call creates a **new token**; previous tokens remain valid until explicitly revoked via `/logout`.
- The `organization` object embedded in responses lets the client display the org name without an extra round-trip.
