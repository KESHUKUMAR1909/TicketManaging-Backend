# CampusDesk - Student Support & Ticket Management System

An institutional MERN stack platform designed for universities and colleges to streamline student requests (Fees, Attendance, ID Cards, Documents, Certificates, Administrative, etc.) with real-time SLA tracking, dynamic ticket ageing, ownership lifecycle, pending-action workflows, automated escalations, and executive visibility.

Built with a **Glassmorphism Design System** on the frontend (Vite + React) and a **scalable Express + MongoDB** architecture capable of handling 5,000 to 10,000 concurrent users.

### 🌐 Live Deployment & Repositories
- **Live Backend API (Render)**: [https://ticketmanaging-backend.onrender.com](https://ticketmanaging-backend.onrender.com)
- **API Health Check**: [https://ticketmanaging-backend.onrender.com/api/health](https://ticketmanaging-backend.onrender.com/api/health)
- **Frontend Repository**: [https://github.com/KESHUKUMAR1909/TicketManaging-Frontend](https://github.com/KESHUKUMAR1909/TicketManaging-Frontend)
- **Backend Repository**: [https://github.com/KESHUKUMAR1909/TicketManaging-Backend](https://github.com/KESHUKUMAR1909/TicketManaging-Backend)

---

## 📑 Table of Contents
1. [Key Features & Capabilities](#key-features--capabilities)
2. [Approach, Architecture & Scalability](#approach-architecture--scalability)
3. [Assumptions & Design Trade-offs](#assumptions--design-trade-offs)
4. [Validation & Important Edge Cases](#validation--important-edge-cases)
5. [Workflow Engines: SLAs, Pending-Action & Escalations](#workflow-engines-slas-pending-action--escalations)
6. [Institutional Records (Excel File & Seeding)](#institutional-records-excel-file--seeding)
7. [Testing Suite & Quality Assurance](#testing-suite--quality-assurance)
8. [Accepting Image Links (Zero File Upload Dependency)](#accepting-image-links-zero-file-upload-dependency)
9. [Quick Start & Setup Guide](#quick-start--setup-guide)
10. [Default Demo Credentials](#default-demo-credentials)
11. [Mandatory AI Usage Report](#mandatory-ai-usage-report)

---

## 🌟 Key Features & Capabilities

### 🎓 1. Student Portal
- **Ticket Submission**: Raise requests under **Fees**, **Attendance**, **ID Cards**, **Documents**, **Certificates**, **Administrative**, or **Other**.
- **Priority Selection**: Low, Medium, High, or Urgent with automatic SLA deadline computation.
- **Image Link Attachment**: Attach image URLs for fee receipts, medical certificates, or lost ID proofs with instant live preview.
- **Dynamic Ageing & Countdown**: Real-time counter showing remaining time or breach status.
- **Pending-Action Feedback**: Immediate notification when staff requests more info; responding automatically unblocks the ticket and shifts it back to `IN_PROGRESS`.
- **Satisfaction Rating (CSAT)**: 1-to-5 star rating and feedback submission upon ticket resolution.

### 📋 2. Staff Support Queue
- **Unified Department Queue**: Filter by Category, Department, Priority, Status, and SLA Breaches.
- **Ownership & Assignment**: One-click "Claim Ticket (Self-Assign)" or reassign to team members.
- **Internal vs. Public Notes**: Staff can post internal notes (marked with a lock and hidden from students) or public comments.
- **Pending Action Trigger**: Set status to `PENDING_STUDENT` with clear instructions on required documents.
- **Resolution Tracking**: Record comprehensive resolution remarks and timestamp resolution duration.

### ⚙️ 3. Admin User & Access Management Tool
- **User Directory**: Search and filter students and staff members by name, roll number, department, or role.
- **Grant & Revoke Access**: Instant toggle to revoke or grant access. Revoked users are prevented from logging in and rejected by JWT middleware.
- **User Provisioning**: Add new students, staff, or administrators.
- **Excel Records Export**: Direct download button for institutional spreadsheets (`users_records.xlsx`).

### 🏛️ 4. Executive Management Visibility Dashboard
- **SLA Compliance Rate**: Overall compliance percentage and breach counters.
- **Average Turnaround Time**: Resolution duration in hours.
- **Ageing Distribution Buckets**: Unresolved ticket distribution across `<24h`, `24–48h`, `48–72h`, and `>72h`.
- **Department & Category Workload**: Visual breakdown of volume across institutional divisions.
- **Escalations Hub**: Immediate visibility into urgent or SLA-breached tickets.

---

## 🏗️ Approach, Architecture & Scalability

### High-Throughput Scalability (5,000 to 10,000 Users)
To comfortably scale to 5,000–10,000 institutional users:
1. **Compound MongoDB Indexing**:
   - `{ status: 1, priority: 1 }`
   - `{ student: 1, createdAt: -1 }`
   - `{ assignedTo: 1, status: 1 }`
   - `{ category: 1, status: 1 }`
   - `{ 'sla.resolutionDue': 1, status: 1 }`
   - `{ role: 1, status: 1 }` on `User`
2. **Connection Pooling**: Configured `maxPoolSize: 50` in Mongoose to sustain high concurrent HTTP requests.
3. **Optimized Pagination & Projections**: All list queries enforce paginated batching (`page`, `limit`), `.lean()` queries to bypass Mongoose hydration overhead for read operations, and selective projections (e.g., `-password`).
4. **Stateless JWT Authentication**: Scales horizontally across server instances without session state bottlenecks.

### Tech Stack
- **Frontend**: Vite 8, React 19, Lucide Icons, Custom Vanilla CSS Glassmorphism Design System.
- **Backend**: Node.js v24, Express v5, MongoDB Atlas (via Mongoose v9).
- **Testing**: Jest + Supertest (Backend), Vitest + React Testing Library (Frontend).
- **Data Interchange**: `xlsx` for Excel generation and parsing.

---

## ⚖️ Assumptions & Design Trade-offs

1. **Image Links vs. Direct File Uploads**:
   - *Requirement*: "I will not upload any image or something. Accept the image link from the user wherever you need."
   - *Approach*: Implemented image link URL inputs (with live thumbnail previews, lightbox links, and sample image link presets). This eliminates local disk/S3 storage costs and file size limits.
2. **SLA Timers & Dynamic Evaluation**:
   - *Approach*: SLAs are calculated at ticket creation and stored as absolute UTC deadlines (`sla.resolutionDue`). Rather than running a constant background polling loop that burns DB reads, ticket statuses and SLA flags are evaluated dynamically during API reads and queries, with auto-escalation triggered if the deadline has passed.
3. **Pending-Action Flow**:
   - *Assumption*: When a student replies to a ticket in `PENDING_STUDENT` state, it is assumed the requested clarification is provided, so the system automatically advances the ticket back to `IN_PROGRESS` and notifies the staff.

---

## 🛡️ Validation & Important Edge Cases

- **Revoked User Access**: Revoked students/staff are immediately blocked at both login (`403 Forbidden`) and middleware level if a token exists.
- **Admin Self-Revocation Protection**: Prevents administrators from revoking their own account access to avoid institutional lockouts.
- **Role Scoping & Privacy**: Students can only query and retrieve their own tickets. Activity logs marked as `isInternal: true` are filtered out from student responses.
- **Priority Re-calculation**: When staff changes a ticket priority (e.g., from `MEDIUM` to `URGENT`), the SLA resolution due date is recalculated from the original ticket creation timestamp.
- **Duplicate Ticket Identification**: Pre-validate hooks generate institutional ticket numbers (`TICK-YY-XXXX`).
- **Rating Restrictions**: Feedback ratings (1–5 stars) can only be submitted by the student owner once a ticket has been marked `RESOLVED`.

---

## ⏱️ Workflow Engines: SLAs, Pending-Action & Escalations

### Priority SLA Matrix
| Priority | Response SLA | Resolution SLA | Auto-Escalation Trigger |
| :--- | :--- | :--- | :--- |
| **URGENT** | 2 Hours | 8 Hours | > 8 Hours |
| **HIGH** | 6 Hours | 24 Hours | > 24 Hours |
| **MEDIUM** | 12 Hours | 48 Hours | > 48 Hours |
| **LOW** | 24 Hours | 72 Hours | > 72 Hours |

### Category Routing
- **Fees** ➔ `Finance & Accounts`
- **Attendance** ➔ `Academic Registrar`
- **ID Cards** ➔ `IT & Identity Services`
- **Documents** ➔ `Examination & Records`
- **Certificates** ➔ `Examination & Records`
- **Administrative** ➔ `Campus Administration`
- **Other** ➔ `General Student Helpdesk`

---

## 📊 Institutional Records (Excel File & Seeding)

As requested, the project generates an official Excel spreadsheet file located at:
`records/users_records.xlsx`

The workbook contains two dedicated sheets:
1. **`20_Students_Directory`**: 20 complete student profiles with Roll Numbers, Names, Emails, Programs, Departments, Phone Numbers, and Statuses.
2. **`5_Admin_Staff_Directory`**: 5 administrative accounts (Admin, Registrar Staff, Finance Staff, IT Staff, and Executive Dean).

Administrators can also download this file directly from the UI via the **"Download Excel Records"** button or via API (`GET /api/users/export-excel`).

---

## 🧪 Testing Suite & Quality Assurance

### 1. Backend Integration Tests (Jest + Supertest)
Run tests: `cd server && npm test`
- ✅ **Health Check**: `/api/health` status check.
- ✅ **Access Control**: Rejection of revoked users (`403`).
- ✅ **Ticket Lifecycle**: Creation, SLA calculation, and retrieval.
- ✅ **Audit Trail**: Verification of `ActivityLog` sequence.
- ✅ **Assignment Workflow**: Staff self-claiming tickets.
- ✅ **Pending-Action Workflow**: Triggering `PENDING_STUDENT` hold.
- ✅ **Pending-Action Resume**: Automatic unblock on student reply.
- ✅ **Resolution Workflow**: Setting `RESOLVED` status and timestamping.
- ✅ **CSAT Ratings**: Student 5-star rating and closing.
- ✅ **Management Visibility**: Aggregation of SLA compliance and ageing buckets.
- ✅ **User Management**: Admin granting and revoking student access.

### 2. Frontend Component Tests (Vitest + React Testing Library)
Run tests: `cd client && npm test`
- ✅ `TicketCard` rendering with metadata, badges, and SLA indicator.
- ✅ `SLAIndicator` countdown and resolution display.
- ✅ `LoginView` rendering with one-click test logins.
- ✅ `CreateTicketModal` category validation and image link inputs.

---

## 🖼️ Accepting Image Links (Zero File Upload Dependency)

In accordance with requirement:
- Direct file uploads are omitted; instead, the system accepts public image URLs (`https://...`).
- Implemented in:
  - **Ticket Creation**: Paste image URL with live thumbnail preview and quick sample buttons.
  - **Ticket Comments & Activity**: Attach image links to replies and internal notes.
  - **Ticket Detail Modal**: Thumbnail preview with an external lightbox link.

---

## 🚀 Quick Start & Setup Guide

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (Connection string already provided in `.env`)

### 1. Start Backend Server
```bash
cd server
npm install
npm run seed     # Generates Excel file and seeds 25 users + sample tickets
npm start        # Starts Express server on http://localhost:5000
```

### 2. Start Frontend App
```bash
cd client
npm install
npm run dev      # Starts Vite on http://localhost:5173 (or 5174)
```

Visit the application in your browser at `http://localhost:5174/`.

---

## 🔑 Default Demo Credentials

You can use the **One-Click Test Logins** on the login page or enter credentials manually:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Student** | Aarav Sharma | `aarav.sharma@campus.edu` | `Password@123` |
| **Staff** | Elena Gilbert | `registrar.gilbert@campus.edu` | `Password@123` |
| **Admin** | Dr. Rajesh Chawla | `admin.chawla@campus.edu` | `Password@123` |
| **Management** | Dean Arthur | `management.dean@campus.edu` | `Password@123` |
| **Revoked (Test)** | Zoya Khan | `zoya.khan@campus.edu` | `Password@123` |

---

## 📝 Mandatory AI Usage Report

```markdown
Mandatory AI Usage Report
AI TOOL USED: Gemini (Antigravity Assistant)
WHAT I ASKED AI TO DO:
1. Architect a scalable MERN stack student ticket platform with SLAs, ageing buckets, and activity histories.
2. Build a modern Glassmorphism UI in Vite + React with role-based dashboards (Student, Staff, Admin, Management).
3. Create an Excel workbook generator for 20 students and 5 admin records, write comprehensive automated test suites, and implement grant/revoke access controls.

PROMPT THAT WAS MOST USEFUL:
"Design a ticket/support system with statuses, priorities, assignment, SLAs, ageing, ownership, resolution tracking, activity history, and management visibility. Decide escalation and pending-action workflows. Backend should be scalable to 5000 to 10000 users. Prepare an excel file for the 20 students records and the 5 admin records. Accept the image link from the user wherever you need."

CODE GENERATED BY AI: What part?
1. Database schemas (User, Ticket, ActivityLog) with compound indexes and SLA virtuals.
2. SLA & Escalation engine (slaEngine.js) and Excel generator (excelHelper.js).
3. RESTful controllers and Express routes (auth, tickets, users, analytics).
4. Glassmorphism CSS design system, responsive React components, and Vitest/Jest test suites.

CODE I MODIFIED: What part?
1. Fixed Mongoose 9 pre('save') and pre('validate') middleware hooks where async functions do not take the `next` argument.
2. Enhanced the Vite client proxy configuration and added sample image link presets to streamline demonstration.

AI OUTPUT THAT WAS WRONG:
Mongoose 9 middleware syntax: An async pre-hook defined as `userSchema.pre('save', async function(next) { ... next(); })` caused a `TypeError: next is not a function`.

HOW I IDENTIFIED THE PROBLEM:
Running `node src/seed.js` failed during User model creation with:
`TypeError: next is not a function at model.<anonymous> (server/src/models/User.js:77:3)`.

HOW I FIXED IT:
Updated the pre-save hook in `server/src/models/User.js` to omit the `next` callback parameter and use standard async/await promise return as required by Mongoose v9.
```
