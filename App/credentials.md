# ORCA Credentials (Active)

Created on: 2026-05-03
Backend: http://127.0.0.1:8000
Database: Supabase Postgres (via Backend `DATABASE_URL`)

## Organization Account (Auth API login)
- Name: Innov Organization
- Email: admin@innov.local
- Password: InnovOrg#2026!

## Staff Users (Employee records under this organization)
1. Amina Boudiaf
- Email: amina@innov.local
- Password: InnovStaff#2026!1
- Department: Security
- Role: Analyst
- Seniority: mid

2. Yacine Khelifi
- Email: yacine@innov.local
- Password: InnovStaff#2026!2
- Department: IT
- Role: Engineer
- Seniority: mid

3. Lina Rahmoun
- Email: lina@innov.local
- Password: InnovStaff#2026!3
- Department: Compliance
- Role: Reviewer
- Seniority: junior

4. Karim Belaid
- Email: karim@innov.local
- Password: InnovStaff#2026!4
- Department: Operations
- Role: Operator
- Seniority: senior

5. Sofia Merabet
- Email: sofia@innov.local
- Password: InnovStaff#2026!5
- Department: Finance
- Role: Controller
- Seniority: mid

6. Nour Hamdi
- Email: nour@innov.local
- Password: InnovStaff#2026!6
- Department: HR
- Role: Specialist
- Seniority: mid

7. Riad Ziani
- Email: riad@innov.local
- Password: InnovStaff#2026!7
- Department: Network
- Role: Administrator
- Seniority: senior

## Notes
- Organization login endpoint: `/api/auth/login`
- Staff login endpoint: `/api/auth/employee/login`
- Device snapshots are auto-ingested on login/signup via `/api/auth/session-device`.
