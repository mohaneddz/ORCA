# ORCA Demo Credentials

Created on: 2026-05-02
Backend: http://127.0.0.1:8000
Database: Supabase Postgres (via Backend `DATABASE_URL`)

## Organization Account (Auth API login)
- Name: ORCA Demo Organization
- Email: admin@orca-demo.local
- Password: OrcaOrg#2026!
- Organization ID: 73e46a04-64d9-4170-9941-fc3b5e3951e1

## Organization Token
- Token (Authorization header `Token <key>`):
`813ca27ff7fb76d7bae82b510c68037f135fcd093e26dbe756ceed709d3321d5`

## Staff Users (Employee records under this organization)
1. Amina Staff
- Email: amina.staff@orca-demo.local
- Password: OrcaStaff#2026!A
- Department: Security
- Role: Staff Analyst
- Seniority: mid

2. Yacine Staff
- Email: yacine.staff@orca-demo.local
- Password: OrcaStaff#2026!Y
- Department: IT
- Role: Staff Engineer
- Seniority: mid

3. Lina Staff
- Email: lina.staff@orca-demo.local
- Password: OrcaStaff#2026!L
- Department: Compliance
- Role: Staff Reviewer
- Seniority: junior

## Notes
- Organization account authenticates via `/api/auth/login`.
- Staff users were created in the `organizations_employee` table and are tied to the organization.
