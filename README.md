# Winshine Leave & Late Management System (MERN Stack)
## Mobile-First Portal

A modern, responsive, mobile-first web application built with the **MERN Stack** (MongoDB, Express, React, Node.js) based on the [Product Requirements Document (PRD)](./prd.md).

---

### 🌟 Key Highlights & Implementation Details

#### 1. Mobile-First Ergonomic UX
- **Bottom Navigation Bar:** Fixed thumb-zone tabs for **Home**, **Apply**, **Requests**, **Balance**, and **Approvals/Admin**.
- **1-Tap Quick Actions:** Direct triggers for "Apply Leave" and "Report Late Arrival".
- **Large Touch Targets:** All clickable interactive elements are $\ge 44\text{px}$ for comfortable touch navigation.
- **Dual Display Modes:** Desktop users can toggle between a **Mobile Phone Frame (440px)** and an **Expanded Tablet View (768px)**.

#### 2. Clean Light Color Theme
- **Backgrounds:** Polished soft slate palette (`#F8FAFC`, `#F1F5F9`).
- **Cards & Surfaces:** Crisp white (`#FFFFFF`) with ultra-fine border lines (`#E2E8F0`) and layered soft shadows.
- **Brand Colors:** Vibrant Indigo gradient (`#4F46E5` $\rightarrow$ `#3B82F6`) paired with functional accent badges:
  - 🟢 **Emerald (`#10B981`):** Approved status, active balances
  - 🟡 **Amber (`#F59E0B`):** Pending approvals, late arrival tags
  - 🔴 **Rose (`#EF4444`):** Rejected status, balance limit alerts
  - 🔵 **Sky (`#0284C7`):** Info tags & progress fills

#### 3. Core Modules (Phase 1)
- **Staff Dashboard:**
  - Monthly Leave Hero Card (September 2026: Allotted vs Taken vs Remaining Days).
  - Monthly Late Allowance Meter (Grace hours and occurrences left).
  - Recent Submissions timeline with status indicators.
  - Upcoming Holidays list.
- **Interactive Forms:**
  - **Apply Leave:** Type selection, start/end dates, half-day slot selector, auto-calculated working days, real-time balance warning, optional file attachment.
  - **Report Late Arrival:** Date, expected arrival time, quick delay presets (+15m, +30m, +45m, +60m), and reason templates.
- **My Requests & Withdraw:**
  - Filterable by status and category.
  - Immediate withdrawal/cancellation for pending requests.
  - Modal sheet for request inspection & approver comments.
- **Approver & HR Admin Hub:**
  - Approver queue with 1-tap **Approve** and **Reject** buttons + optional feedback note.
  - Real-time automatic deduction of monthly balance upon approval.
  - HR Admin Monthly Consumption table across all employees with **CSV export**.
- **Persona Switcher:**
  - Switch anytime in the header between:
    - **Aarav Patel** (Staff)
    - **Neha Roy** (Staff)
    - **Vikram Mehta** (Approver / Manager)
    - **Priya Sharma** (HR Admin)

---

### 🚀 Running the Application Locally

1. **MongoDB Service**: Ensure MongoDB is running locally on port `27017` (database name: `leave_management`).
2. **Start Backend API (Node + Express)**:
   ```powershell
   cd server
   npm install
   npm run dev
   # Runs on http://localhost:5000
   ```
3. **Start Frontend (React + Vite)**:
   ```powershell
   cd client
   npm install
   npm run dev
   # Runs on http://localhost:5174
   ```

---

### 🗺️ Phased Roadmap
- [x] **Phase 1 (Completed):** MERN Architecture, Light Design System, Mobile Navigation Shell, Staff Home Experience, Apply Forms, Approver Decisions, and Seed Data.
- [ ] **Phase 2:** Advanced Multi-Level Approval Chains & Email Notification Triggers.
- [ ] **Phase 3:** Public Holiday Calendar Management & Blackout Dates Configurator.
- [ ] **Phase 4:** Biometric / Attendance CSV Import & Automated Late Flagging.
