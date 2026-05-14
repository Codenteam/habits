# Industries Automation Plan

> 5 industries × 5 departments × 5–10 habits = **128 habits** powered by bits.
> Each section names the exact bits involved so every habit maps directly to a runnable stack.

---

## Table of Contents

1. [Industries Overview](#1-industries-overview)
2. [Industry 1, Healthcare](#2-industry-1--healthcare)
3. [Industry 2, Finance & Banking](#3-industry-2--finance--banking)
4. [Industry 3, E-commerce & Retail](#4-industry-3--e-commerce--retail)
5. [Industry 4, Manufacturing](#5-industry-4--manufacturing)
6. [Industry 5, Real Estate](#6-industry-5--real-estate)
7. [Vue Component Architecture](#7-vue-component-architecture)
8. [YAML Data Schema](#8-yaml-data-schema)
9. [Showcase Folder Plan, 25 Department Stacks](#9-showcase-folder-plan--25-department-stacks)

---

## 1. Industries Overview

| # | Industry | Stack size | Key bits |
|---|---|---|---|
| 1 | Healthcare | 25 habits | bit-email, bit-sms, bit-scheduler, bit-ai, bit-pdf, bit-http, bit-database-sql |
| 2 | Finance & Banking | 25 habits | bit-email, bit-http, bit-pdf, bit-scheduler, bit-stripe, bit-ai, bit-database-mongodb |
| 3 | E-commerce & Retail | 26 habits | bit-email, bit-http, bit-scheduler, bit-stripe, bit-invoice, bit-ai, bit-slack |
| 4 | Manufacturing | 26 habits | bit-email, bit-sms, bit-scheduler, bit-http, bit-database-sql, bit-ai, bit-slack |
| 5 | Real Estate | 26 habits | bit-email, bit-sms, bit-ai, bit-pdf, bit-scheduler, bit-crm, bit-google-calendar |

---

## 2. Industry 1: Healthcare

### Department 1: Patient Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 1.1.1 | **Patient Intake Form** | HTTP POST (webhook) | `bit-http` (receive form data) → `bit-database-sql` (store record) → `bit-email` (confirmation to patient) |
| 1.1.2 | **Appointment Reminder** | `bit-scheduler` (cron 24 h before) | `bit-database-sql` (fetch tomorrow's appointments) → `bit-loop` → `bit-sms` + `bit-email` (per patient) |
| 1.1.3 | **Post-Visit Follow-up Survey** | `bit-scheduler` (24 h after visit) | `bit-database-sql` (fetch completed visits) → `bit-loop` → `bit-email` (survey link) → `bit-http` (collect response) → `bit-database-sql` (store score) |
| 1.1.4 | **Patient Record Sync** | `bit-scheduler` (daily) | `bit-http` (pull from EHR API) → `bit-if` (new/updated check) → `bit-database-sql` (upsert) → `bit-logger` |
| 1.1.5 | **Prescription Refill Request** | HTTP POST (patient portal webhook) | `bit-http` (receive request) → `bit-database-sql` (log request) → `bit-email` (notify prescribing physician) → `bit-sms` (notify patient of status) |
| 1.1.6 | **No-show Re-engagement** | `bit-scheduler` (daily morning) | `bit-database-sql` (query yesterday's no-shows) → `bit-loop` → `bit-email` (reschedule link) → `bit-database-sql` (tag as re-engaged) |

---

### Department 2: Billing & Insurance

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 1.2.1 | **Insurance Eligibility Check** | HTTP POST (pre-visit webhook) | `bit-http` (call payer eligibility API) → `bit-if` (eligible / not eligible) → `bit-email` (notify billing team) → `bit-database-sql` (log result) |
| 1.2.2 | **Claim Submission** | `bit-scheduler` (nightly batch) | `bit-database-sql` (fetch unbilled encounters) → `bit-loop` → `bit-http` (POST claim to clearinghouse) → `bit-database-sql` (update status) → `bit-email` (daily summary) |
| 1.2.3 | **Overdue Payment Reminder** | `bit-scheduler` (weekly) | `bit-database-sql` (fetch balances > 30 days) → `bit-loop` → `bit-email` + `bit-sms` (reminder with pay link) |
| 1.2.4 | **Claim Denial Alert** | HTTP POST (clearinghouse webhook) | `bit-http` (receive denial event) → `bit-ai` (parse denial reason, suggest fix) → `bit-email` (alert billing coder with AI suggestion) → `bit-database-sql` (log) |
| 1.2.5 | **Explanation of Benefits (EOB) Processing** | `bit-email` trigger (inbox watch) | `bit-email` (receive EOB email with attachment) → `bit-ocr` (extract data) → `bit-database-sql` (match to claim) → `bit-pdf` (generate reconciliation report) → `bit-email` (send report to finance) |
| 1.2.6 | **Patient Statement Generator** | `bit-scheduler` (end of month) | `bit-database-sql` (fetch balances by patient) → `bit-loop` → `bit-pdf` (generate statement) → `bit-email` (deliver statement) |

---

### Department 3: Clinical Operations

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 1.3.1 | **Lab Result Notification** | HTTP POST (LIS webhook) | `bit-http` (receive lab result) → `bit-if` (within/outside reference range) → `bit-email` + `bit-sms` (notify patient and physician) |
| 1.3.2 | **Critical Value Alert** | HTTP POST (LIS webhook) | `bit-http` (receive critical flag) → `bit-sms` (immediate SMS to on-call provider) → `bit-slack` (post to clinical ops channel) → `bit-database-sql` (log acknowledgement) |
| 1.3.3 | **AI Care Plan Generator** | HTTP POST (discharge webhook) | `bit-http` (receive patient discharge data) → `bit-ai` (generate personalised care plan) → `bit-pdf` (format as care plan PDF) → `bit-email` (send to patient + PCP) |
| 1.3.4 | **Referral Coordination** | HTTP POST (referral order webhook) | `bit-http` (receive referral order) → `bit-google-calendar` (find open slots at specialist) → `bit-email` (send appointment details to patient) → `bit-database-sql` (track referral status) |
| 1.3.5 | **Medication Interaction Check** | HTTP POST (e-prescribing webhook) | `bit-http` (receive new prescription) → `bit-http` (query drug-interaction API) → `bit-if` (interaction found?) → `bit-email` + `bit-slack` (alert prescriber with details) |

---

### Department 4: HR & Staffing

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 1.4.1 | **Staff Credential Expiry Alert** | `bit-scheduler` (daily) | `bit-database-sql` (fetch credentials expiring within 60 days) → `bit-loop` → `bit-email` (remind staff and manager) |
| 1.4.2 | **New Hire Onboarding Checklist** | HTTP POST (HRIS webhook) | `bit-http` (receive new hire event) → `bit-email` (send welcome + checklist) → `bit-google-drive` (share policy folder) → `bit-tasks` (create onboarding tasks) → `bit-scheduler` (30-day check-in reminder) |
| 1.4.3 | **Time-off Request Approval** | HTTP POST (HR portal form) | `bit-http` (receive request) → `bit-email` (notify manager with approve/deny link) → `bit-if` (approved?) → `bit-database-sql` (update schedule) → `bit-email` (confirm to employee) |
| 1.4.4 | **Shift Change Notification** | HTTP POST (scheduling system webhook) | `bit-http` (receive shift-swap event) → `bit-email` + `bit-sms` (notify affected staff) → `bit-slack` (post to unit channel) |
| 1.4.5 | **Clinical Incident Report** | HTTP POST (incident form) | `bit-http` (receive incident details) → `bit-ai` (classify severity, suggest immediate actions) → `bit-email` (notify risk manager + department head) → `bit-database-sql` (log for OSHA reporting) |

---

### Department 5: Compliance & Reporting

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 1.5.1 | **HIPAA Audit Log Report** | `bit-scheduler` (monthly) | `bit-database-sql` (fetch access logs) → `bit-ai` (detect anomalies) → `bit-pdf` (generate audit report) → `bit-email` (deliver to compliance officer) |
| 1.5.2 | **Policy Acknowledgment Collection** | `bit-scheduler` (annual, per new policy) | `bit-database-sql` (fetch all staff) → `bit-loop` → `bit-email` (send policy + sign-off link) → `bit-http` (collect signature webhook) → `bit-database-sql` (record completion) |
| 1.5.3 | **Regulatory Filing Deadline Reminder** | `bit-scheduler` (30/14/7 days before) | `bit-database-sql` (fetch upcoming regulatory deadlines) → `bit-loop` → `bit-email` (reminder to compliance team) → `bit-slack` (post to compliance channel) |
| 1.5.4 | **Incident Escalation Workflow** | HTTP POST (incident webhook, severity≥2) | `bit-http` (receive escalation trigger) → `bit-email` (notify C-suite + legal) → `bit-tasks` (create response tasks) → `bit-scheduler` (4-hour follow-up check) |
| 1.5.5 | **Quality Metrics Dashboard Feed** | `bit-scheduler` (daily) | `bit-database-sql` (aggregate readmission rate, HCAHPS, infection rate) → `bit-http` (push to dashboard API) → `bit-email` (weekly summary PDF) via `bit-pdf` |

---

## 3. Industry 2: Finance & Banking

### Department 1: Customer Onboarding

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 2.1.1 | **KYC Document Collection** | HTTP POST (application start) | `bit-http` (receive application) → `bit-ocr` (extract ID data) → `bit-ai` (validate match) → `bit-database-sql` (store KYC record) → `bit-email` (request missing docs if needed) |
| 2.1.2 | **Account Opening Workflow** | HTTP POST (KYC-approved webhook) | `bit-http` (receive approval) → `bit-http` (call core-banking API to create account) → `bit-pdf` (generate welcome kit PDF) → `bit-email` (send welcome + account details) |
| 2.1.3 | **Identity Verification** | HTTP POST (selfie/ID upload webhook) | `bit-http` (receive upload) → `bit-http` (call identity-verification API) → `bit-if` (pass/fail) → `bit-email` (result to applicant and compliance) → `bit-database-sql` (log outcome) |
| 2.1.4 | **Onboarding Drop-off Re-engagement** | `bit-scheduler` (24/48/72 h after start) | `bit-database-sql` (find incomplete applications) → `bit-loop` → `bit-email` (resume link + next step hint) |
| 2.1.5 | **First Transaction Alert & Education** | HTTP POST (first-transaction webhook) | `bit-http` (receive event) → `bit-ai` (personalise financial tip based on transaction category) → `bit-email` (send tip + product upsell) |

---

### Department 2: Loan Processing

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 2.2.1 | **Loan Application Intake** | HTTP POST (loan form) | `bit-http` (receive application) → `bit-database-sql` (store) → `bit-email` (acknowledge to applicant) → `bit-slack` (notify loan officer) |
| 2.2.2 | **Document Completeness Check** | `bit-scheduler` (daily) | `bit-database-sql` (fetch pending applications) → `bit-loop` → `bit-if` (all docs received?) → `bit-email` (chase missing documents) |
| 2.2.3 | **Credit Bureau Pull** | HTTP POST (application-complete webhook) | `bit-http` (call credit bureau API) → `bit-database-sql` (store score + report) → `bit-if` (auto-approve threshold?) → `bit-email` (notify underwriter or auto-approve) |
| 2.2.4 | **Underwriting Status Update** | HTTP POST (underwriting system webhook) | `bit-http` (receive status change) → `bit-email` + `bit-sms` (notify applicant of status) → `bit-database-sql` (update record) |
| 2.2.5 | **Loan Offer Letter Generator** | HTTP POST (approval webhook) | `bit-http` (receive approval + terms) → `bit-ai` (draft personalised offer letter) → `bit-pdf` (format letter) → `bit-email` (deliver to applicant with e-sign link) |
| 2.2.6 | **Disbursement Confirmation** | HTTP POST (disbursement webhook) | `bit-http` (receive disbursal event) → `bit-pdf` (generate disbursement advice) → `bit-email` (send to borrower) → `bit-database-sql` (mark loan as active) |

---

### Department 3: Fraud Detection

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 2.3.1 | **Real-time Transaction Alert** | HTTP POST (fraud-score webhook) | `bit-http` (receive high-risk transaction flag) → `bit-sms` + `bit-email` (OTP/alert to cardholder) → `bit-database-sql` (log case) |
| 2.3.2 | **Suspicious Activity Report (SAR) Draft** | HTTP POST (AML engine webhook) | `bit-http` (receive AML flag) → `bit-ai` (draft SAR narrative from transaction data) → `bit-pdf` (format SAR) → `bit-email` (send to compliance officer for review) |
| 2.3.3 | **Account Freeze & Notification** | HTTP POST (fraud-confirmed webhook) | `bit-http` (receive freeze event) → `bit-http` (call core-banking freeze API) → `bit-sms` + `bit-email` (notify account holder) → `bit-tasks` (create investigation task) |
| 2.3.4 | **Dispute Intake Form** | HTTP POST (dispute form) | `bit-http` (receive dispute) → `bit-database-sql` (create case) → `bit-email` (acknowledge + case reference) → `bit-slack` (notify disputes team) |
| 2.3.5 | **Fraud Case Weekly Summary** | `bit-scheduler` (weekly Monday) | `bit-database-sql` (aggregate cases by type/amount/status) → `bit-ai` (write narrative summary) → `bit-pdf` (generate report) → `bit-email` (send to fraud & risk team) |

---

### Department 4: Compliance & Audit

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 2.4.1 | **SOX Controls Evidence Collection** | `bit-scheduler` (quarterly) | `bit-database-sql` (fetch control test results) → `bit-loop` → `bit-filesystem` (gather evidence files) → `bit-pdf` (compile evidence pack) → `bit-email` (deliver to external auditor) |
| 2.4.2 | **AML Sanctions Screening** | `bit-scheduler` (daily) | `bit-database-sql` (fetch new customers/transactions) → `bit-loop` → `bit-http` (call sanctions list API) → `bit-if` (match found?) → `bit-email` + `bit-slack` (alert compliance) |
| 2.4.3 | **Regulatory Filing Reminder** | `bit-scheduler` (14/7/1 days before deadline) | `bit-database-sql` (fetch regulatory calendar) → `bit-loop` → `bit-email` (tiered reminders to compliance team) |
| 2.4.4 | **Audit Trail Export** | `bit-scheduler` (monthly) | `bit-database-sql` (export access and change logs) → `bit-filesystem` (write to encrypted file) → `bit-email` (send encrypted file to audit) |
| 2.4.5 | **Policy Sign-off Tracker** | HTTP POST (new policy published) | `bit-http` (receive policy event) → `bit-database-sql` (fetch all relevant staff) → `bit-loop` → `bit-email` (sign-off request) → `bit-http` (collect acknowledgement webhook) → `bit-database-sql` (update compliance %) |

---

### Department 5: Customer Support

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 2.5.1 | **Support Ticket Auto-Routing** | `bit-email` (incoming support email) | `bit-email` (watch inbox) → `bit-ai` (classify intent: billing/fraud/loan/general) → `bit-if` (route by category) → `bit-email` (forward to correct team queue) |
| 2.5.2 | **Account Statement Request** | HTTP POST (self-service portal) | `bit-http` (receive request with date range) → `bit-database-sql` (fetch transactions) → `bit-pdf` (generate formatted statement) → `bit-email` (deliver to verified email) |
| 2.5.3 | **Complaint Resolution SLA Alert** | `bit-scheduler` (every 4 hours) | `bit-database-sql` (find open complaints near SLA breach) → `bit-loop` → `bit-slack` (alert team lead) → `bit-email` (escalation to manager if breached) |
| 2.5.4 | **Callback Scheduler** | HTTP POST (callback request form) | `bit-http` (receive preferred time) → `bit-google-calendar` (find agent availability + book slot) → `bit-sms` + `bit-email` (confirm callback time to customer) |
| 2.5.5 | **NPS Survey & Analysis** | `bit-scheduler` (7 days post-resolution) | `bit-database-sql` (fetch recently closed tickets) → `bit-loop` → `bit-email` (send NPS survey link) → `bit-http` (collect response webhook) → `bit-ai` (analyse comments, flag detractors) → `bit-database-sql` (store score) |

---

## 4. Industry 3: E-commerce & Retail

### Department 1: Order Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 3.1.1 | **Order Confirmation Email** | HTTP POST (order-placed webhook) | `bit-http` (receive order event) → `bit-database-sql` (store order) → `bit-email` (branded confirmation with order summary) |
| 3.1.2 | **Shipping Status Update** | HTTP POST (carrier webhook) | `bit-http` (receive tracking event) → `bit-if` (status: shipped/out-for-delivery/delivered/exception) → `bit-email` + `bit-sms` (status notification to customer) |
| 3.1.3 | **Return Request Handler** | HTTP POST (return form) | `bit-http` (receive return request) → `bit-if` (within return window?) → `bit-database-sql` (create RMA) → `bit-email` (pre-paid label + instructions) → `bit-slack` (notify fulfilment team) |
| 3.1.4 | **Order Fraud Scoring** | HTTP POST (order-placed webhook) | `bit-http` (receive order) → `bit-http` (call fraud-scoring API) → `bit-if` (high risk?) → `bit-slack` (alert fraud team) → `bit-database-sql` (flag order for manual review) |
| 3.1.5 | **Delayed Order Alert** | `bit-scheduler` (daily) | `bit-database-sql` (find orders overdue vs SLA) → `bit-loop` → `bit-email` (proactive delay notice to customer) → `bit-slack` (alert fulfilment ops lead) |

---

### Department 2: Inventory Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 3.2.1 | **Low Stock Alert** | `bit-scheduler` (every 6 hours) | `bit-http` (fetch inventory API) → `bit-if` (qty < reorder point?) → `bit-email` + `bit-slack` (alert procurement team per SKU) |
| 3.2.2 | **Automatic Supplier Reorder** | `bit-scheduler` (daily, low-stock SKUs) | `bit-database-sql` (fetch SKUs below par) → `bit-loop` → `bit-http` (POST purchase order to supplier API) → `bit-email` (PO confirmation to buyer) → `bit-database-sql` (log PO) |
| 3.2.3 | **Inventory Reconciliation Report** | `bit-scheduler` (weekly Sunday) | `bit-http` (fetch WMS counts) → `bit-database-sql` (compare to system-of-record) → `bit-ai` (flag discrepancies, suggest causes) → `bit-pdf` (generate reconciliation report) → `bit-email` (send to warehouse manager) |
| 3.2.4 | **Dead Stock Alert** | `bit-scheduler` (monthly) | `bit-database-sql` (find SKUs with 0 sales in 90 days) → `bit-ai` (suggest markdown, bundle, or return-to-supplier) → `bit-email` (report to merchandising team) |
| 3.2.5 | **New Product Catalogue Sync** | HTTP POST (PIM system webhook) | `bit-http` (receive new product event) → `bit-http` (push to e-commerce platform API) → `bit-http` (push to marketplace APIs) → `bit-database-sql` (log sync status) → `bit-email` (confirm to catalogue team) |

---

### Department 3: Marketing & CRM

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 3.3.1 | **Abandoned Cart Recovery** | HTTP POST (cart-abandon webhook, 1 h after) | `bit-http` (receive abandon event) → `bit-database-sql` (fetch cart items) → `bit-ai` (generate personalised recovery copy) → `bit-email` (recovery email with cart contents) |
| 3.3.2 | **Post-Purchase Review Request** | `bit-scheduler` (5 days after delivery) | `bit-database-sql` (fetch delivered orders) → `bit-loop` → `bit-email` (review request with product image + link) |
| 3.3.3 | **Birthday Discount Mailer** | `bit-scheduler` (daily morning) | `bit-database-sql` (find customers with birthday today) → `bit-loop` → `bit-ai` (personalise message) → `bit-email` (birthday email with unique discount code) |
| 3.3.4 | **Loyalty Points Update Notification** | HTTP POST (loyalty-engine webhook) | `bit-http` (receive points-earned event) → `bit-email` (balance update + tier progress) → `bit-if` (threshold reached?) → `bit-email` (tier upgrade congratulation) |
| 3.3.5 | **New Subscriber Welcome Series** | HTTP POST (sign-up webhook) | `bit-http` (receive sign-up) → `bit-database-sql` (store subscriber) → `bit-email` (welcome email day 0) → `bit-scheduler` (day 3: best sellers) → `bit-scheduler` (day 7: category preferences quiz) |
| 3.3.6 | **Campaign Performance Report** | `bit-scheduler` (weekly Monday) | `bit-http` (fetch campaign stats from email/ad APIs) → `bit-ai` (write narrative insights) → `bit-pdf` (format report) → `bit-email` (send to marketing director) |

---

### Department 4: Customer Support

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 3.4.1 | **Ticket Auto-Classification & Assignment** | `bit-email` (incoming support email) | `bit-email` (watch support inbox) → `bit-ai` (classify: order/return/billing/other + sentiment) → `bit-if` (route by class) → `bit-http` (create ticket in helpdesk via API, assign to correct queue) |
| 3.4.2 | **Refund Status Notification** | HTTP POST (refund-processed webhook) | `bit-http` (receive refund event) → `bit-email` + `bit-sms` (notify customer with amount + timeline) → `bit-database-sql` (update order record) |
| 3.4.3 | **CSAT Survey Post-Resolution** | `bit-scheduler` (1 h after ticket closed) | `bit-database-sql` (fetch recently closed tickets) → `bit-loop` → `bit-email` (1-question CSAT survey) → `bit-http` (collect response) → `bit-database-sql` (store score) → `bit-if` (score ≤ 2?) → `bit-slack` (alert agent to follow up) |
| 3.4.4 | **SLA Breach Alert** | `bit-scheduler` (every 30 minutes) | `bit-http` (fetch open tickets from helpdesk API) → `bit-if` (breached SLA?) → `bit-slack` (immediate alert to supervisor) → `bit-email` (escalation notice to team lead) |
| 3.4.5 | **Proactive Order Exception Outreach** | HTTP POST (exception webhook) | `bit-http` (receive exception: lost, damaged, customs-held) → `bit-ai` (draft empathetic outreach message) → `bit-email` + `bit-sms` (proactive contact before customer complains) |

---

### Department 5: Finance & Reporting

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 3.5.1 | **Daily Sales Report** | `bit-scheduler` (7 AM daily) | `bit-http` (fetch orders + revenue from platform API) → `bit-ai` (highlight anomalies vs forecast) → `bit-pdf` (generate daily sales PDF) → `bit-email` (send to finance + ops team) |
| 3.5.2 | **Invoice Generation** | HTTP POST (order-paid webhook) | `bit-http` (receive payment event) → `bit-invoice` (generate tax-compliant invoice) → `bit-email` (deliver invoice to customer) → `bit-database-sql` (store invoice record) |
| 3.5.3 | **Chargeback Alert & Response** | HTTP POST (payment-gateway webhook) | `bit-http` (receive chargeback event) → `bit-database-sql` (fetch order evidence) → `bit-ai` (draft dispute rebuttal with evidence) → `bit-pdf` (compile evidence pack) → `bit-email` (notify finance team + attach pack) |
| 3.5.4 | **Revenue Reconciliation** | `bit-scheduler` (end of day) | `bit-http` (fetch settlement data from payment gateway) → `bit-database-sql` (match to orders) → `bit-if` (discrepancy?) → `bit-slack` (alert finance) → `bit-pdf` (generate reconciliation report) → `bit-email` |
| 3.5.5 | **Monthly Tax Summary Report** | `bit-scheduler` (1st of month) | `bit-database-sql` (aggregate taxable sales by jurisdiction) → `bit-ai` (flag anomalies, suggest accruals) → `bit-pdf` (generate tax summary) → `bit-email` (send to tax accountant) |

---

## 5. Industry 4: Manufacturing

### Department 1: Supply Chain

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 4.1.1 | **Supplier Lead Time Alert** | `bit-scheduler` (daily) | `bit-http` (fetch supplier delivery performance API) → `bit-if` (lead time degraded > 10%?) → `bit-email` + `bit-slack` (alert procurement manager) |
| 4.1.2 | **Purchase Order Approval Workflow** | HTTP POST (ERP PO-created webhook) | `bit-http` (receive PO) → `bit-if` (value > threshold?) → `bit-email` (send to approver with approve/reject link) → `bit-http` (collect approval webhook) → `bit-email` (notify requester + update ERP via API) |
| 4.1.3 | **Goods Receipt Notification** | HTTP POST (WMS receipt webhook) | `bit-http` (receive GRN event) → `bit-database-sql` (match to PO, log) → `bit-email` (notify quality team to inspect) → `bit-slack` (post to warehouse channel) |
| 4.1.4 | **Critical Parts Shortage Alert** | `bit-scheduler` (every 4 hours) | `bit-database-sql` (check inventory vs minimum safety stock for BOM-critical parts) → `bit-if` (below safety stock?) → `bit-sms` + `bit-email` (alert supply chain director) → `bit-slack` (post to operations channel) |
| 4.1.5 | **Supplier Performance Report** | `bit-scheduler` (monthly) | `bit-database-sql` (aggregate on-time delivery, quality defects, lead time by supplier) → `bit-ai` (rank suppliers, flag at-risk ones) → `bit-pdf` (generate scorecard) → `bit-email` (send to procurement + copy supplier) |

---

### Department 2: Quality Control

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 4.2.1 | **Non-Conformance Report (NCR)** | HTTP POST (inspection form) | `bit-http` (receive NCR data) → `bit-database-sql` (create NCR record) → `bit-email` (notify QC manager + production lead) → `bit-tasks` (create CAPA task) → `bit-slack` (post to quality channel) |
| 4.2.2 | **Incoming Inspection Checklist** | HTTP POST (GRN-triggered) | `bit-http` (receive GRN event) → `bit-database-sql` (fetch inspection criteria for part/supplier) → `bit-email` (send checklist to QC inspector) → `bit-http` (collect inspection result webhook) → `bit-database-sql` (store pass/fail) |
| 4.2.3 | **Defect Rate Threshold Alert** | `bit-scheduler` (daily shift-end) | `bit-database-sql` (compute defect % for day by line/product) → `bit-if` (> target?) → `bit-slack` (alert QC lead) → `bit-email` (shift summary to plant manager) |
| 4.2.4 | **CAPA Escalation Tracker** | `bit-scheduler` (weekly) | `bit-database-sql` (fetch open CAPAs past due date) → `bit-loop` → `bit-email` (escalation reminder to owner + QC director) → `bit-slack` (post overdue list to quality channel) |
| 4.2.5 | **Quality KPI Monthly Report** | `bit-scheduler` (1st of month) | `bit-database-sql` (aggregate first-pass yield, defect rates, NCRs, CAPAs) → `bit-ai` (write narrative with root-cause trends) → `bit-pdf` (generate QC report) → `bit-email` (distribute to management team) |

---

### Department 3: Maintenance

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 4.3.1 | **Preventive Maintenance Reminder** | `bit-scheduler` (cron per asset schedule) | `bit-database-sql` (fetch assets due for PM in next 7 days) → `bit-loop` → `bit-email` (notify maintenance tech + supervisor) → `bit-tasks` (create work order) |
| 4.3.2 | **Equipment Downtime Alert** | HTTP POST (SCADA/IoT webhook) | `bit-http` (receive machine-down event) → `bit-sms` + `bit-slack` (immediate alert to maintenance lead + production manager) → `bit-database-sql` (log downtime event, start timer) |
| 4.3.3 | **Spare Parts Reorder** | `bit-scheduler` (daily) | `bit-database-sql` (check spare parts inventory vs min level) → `bit-if` (below min?) → `bit-http` (raise PO in ERP via API) → `bit-email` (notify maintenance manager) |
| 4.3.4 | **Work Order Completion Log** | HTTP POST (CMMS webhook) | `bit-http` (receive WO-closed event) → `bit-database-sql` (log completion: duration, parts used, tech) → `bit-ai` (update asset failure-history notes) → `bit-email` (summary to maintenance supervisor) |
| 4.3.5 | **OEE (Overall Equipment Effectiveness) Report** | `bit-scheduler` (weekly Monday) | `bit-database-sql` (fetch availability, performance, quality metrics per asset) → `bit-ai` (identify lowest-OEE assets + suggest focus areas) → `bit-pdf` (generate OEE report) → `bit-email` (send to plant manager + maintenance director) |

---

### Department 4: HR & Workforce

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 4.4.1 | **Shift Schedule Notification** | `bit-scheduler` (Friday 3 PM for next week) | `bit-database-sql` (fetch next-week schedule by employee) → `bit-loop` → `bit-sms` + `bit-email` (personal shift notification) |
| 4.4.2 | **Safety Training Compliance Reminder** | `bit-scheduler` (daily) | `bit-database-sql` (fetch employees with overdue safety training) → `bit-loop` → `bit-email` (reminder with LMS link) → `bit-if` (7+ days overdue?) → `bit-email` (escalate to HR manager) |
| 4.4.3 | **Workplace Incident Report** | HTTP POST (incident form) | `bit-http` (receive incident data) → `bit-ai` (classify severity, generate immediate actions list) → `bit-email` (notify HR + safety officer + plant manager) → `bit-database-sql` (log for OSHA recordkeeping) |
| 4.4.4 | **Attendance Anomaly Alert** | `bit-scheduler` (daily 9 AM) | `bit-database-sql` (compare scheduled vs clocked attendance) → `bit-if` (absence rate on line > 15%?) → `bit-slack` (alert production supervisor) → `bit-email` (daily attendance summary to HR) |
| 4.4.5 | **Performance Review Scheduler** | `bit-scheduler` (60 days before anniversary) | `bit-database-sql` (fetch upcoming review dates) → `bit-loop` → `bit-google-calendar` (create review meeting) → `bit-email` (notify employee + manager with self-assessment form link) |

---

### Department 5: Production Planning

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 4.5.1 | **Daily Production Schedule Broadcast** | `bit-scheduler` (5:30 AM daily) | `bit-database-sql` (fetch day's production orders) → `bit-email` + `bit-slack` (send schedule to line supervisors) |
| 4.5.2 | **Customer Order Delay Alert** | `bit-scheduler` (every 2 hours) | `bit-database-sql` (compare current WIP progress vs due dates) → `bit-if` (at-risk orders?) → `bit-email` (alert planning team + customer service) → `bit-sms` (notify planning manager) |
| 4.5.3 | **Yield Loss Alert** | HTTP POST (MES yield webhook) | `bit-http` (receive below-target yield event) → `bit-ai` (correlate with recent BOM/process changes) → `bit-slack` + `bit-email` (alert production engineer with context) |
| 4.5.4 | **BOM Change Notification** | HTTP POST (PLM webhook) | `bit-http` (receive BOM-change event) → `bit-database-sql` (find active production orders using this BOM) → `bit-loop` → `bit-email` (notify production + procurement + QC) |
| 4.5.5 | **Machine Utilisation Report** | `bit-scheduler` (weekly Monday) | `bit-database-sql` (fetch runtime/idle/downtime by machine) → `bit-ai` (identify bottlenecks, suggest scheduling changes) → `bit-pdf` (generate utilisation report) → `bit-email` (send to plant manager) |
| 4.5.6 | **Capacity Planning Report** | `bit-scheduler` (monthly) | `bit-database-sql` (aggregate order backlog + resource availability) → `bit-ai` (model scenarios: overtime, subcontract, new shift) → `bit-pdf` (generate capacity plan) → `bit-email` (send to operations director) |

---

## 6. Industry 5: Real Estate

### Department 1: Lead Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 5.1.1 | **New Lead Capture & CRM Sync** | HTTP POST (website/portal form) | `bit-http` (receive lead form) → `bit-crm` (create contact in CRM) → `bit-email` (instant follow-up from assigned agent) → `bit-database-sql` (log with source attribution) |
| 5.1.2 | **Lead Qualification Scorer** | HTTP POST (new lead webhook from CRM) | `bit-http` (receive lead event) → `bit-ai` (score lead 1–10 based on budget/timeline/location criteria) → `bit-crm` (update lead score field) → `bit-if` (score ≥ 7?) → `bit-slack` (alert senior agent immediately) |
| 5.1.3 | **Multi-Touch Follow-up Sequence** | `bit-scheduler` (day 1/3/7/14 after lead capture) | `bit-database-sql` (fetch leads in nurture stage) → `bit-loop` → `bit-ai` (generate personalised property suggestion email) → `bit-email` (send to lead) |
| 5.1.4 | **Stale Lead Alert** | `bit-scheduler` (daily) | `bit-database-sql` (find leads not contacted in > 5 days) → `bit-loop` → `bit-email` (alert assigned agent) → `bit-slack` (post stale-lead list to team channel) |
| 5.1.5 | **Lead Source Attribution Report** | `bit-scheduler` (weekly Monday) | `bit-database-sql` (aggregate leads by source: portal/referral/social/walk-in) → `bit-ai` (calculate conversion rates + cost per lead) → `bit-pdf` (generate attribution report) → `bit-email` (send to sales director) |

---

### Department 2: Property Listings

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 5.2.1 | **AI Listing Description Generator** | HTTP POST (listing-created webhook) | `bit-http` (receive property details + photos) → `bit-ai` (vision: analyse photos) → `bit-ai` (generate compelling listing copy: headline, description, key features) → `bit-database-sql` (store generated content) → `bit-email` (send to listing agent for approval) |
| 5.2.2 | **Multi-Portal Listing Sync** | HTTP POST (listing-approved webhook) | `bit-http` (receive approval) → `bit-loop` over portals → `bit-http` (push listing to each portal API: Zillow, Realtor.com, MLS, etc.) → `bit-database-sql` (log sync status per portal) → `bit-email` (confirm to agent) |
| 5.2.3 | **Price Reduction Alert** | HTTP POST (price-change webhook) | `bit-http` (receive price change event) → `bit-database-sql` (fetch saved-search subscribers for this area/type/budget) → `bit-loop` → `bit-email` + `bit-sms` (price drop alert to interested leads) |
| 5.2.4 | **Listing Expiry Reminder** | `bit-scheduler` (14/7/1 days before expiry) | `bit-database-sql` (fetch active listings near expiry) → `bit-loop` → `bit-email` (remind listing agent: renew or adjust strategy) |
| 5.2.5 | **Open House Invitation Campaign** | HTTP POST (open-house-scheduled webhook) | `bit-http` (receive open house details) → `bit-database-sql` (find leads matching property profile) → `bit-loop` → `bit-email` + `bit-sms` (invitation with map link + calendar invite) → `bit-google-calendar` (add open house event) |

---

### Department 3: Transaction Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 5.3.1 | **Offer Submission Package** | HTTP POST (offer-submitted webhook) | `bit-http` (receive offer terms) → `bit-pdf` (generate offer letter) → `bit-email` (deliver to listing agent + seller) → `bit-database-sql` (log offer with status) → `bit-slack` (alert deal manager) |
| 5.3.2 | **Contract Milestone Tracker** | `bit-scheduler` (daily) | `bit-database-sql` (fetch upcoming contract milestones: inspection, appraisal, finance, closing) → `bit-loop` → `bit-email` + `bit-sms` (reminder to responsible party) → `bit-google-calendar` (create/update calendar events) |
| 5.3.3 | **Inspection Report Distribution** | HTTP POST (inspection-complete webhook) | `bit-http` (receive inspection report) → `bit-ai` (summarise key findings + flag urgent issues) → `bit-pdf` (attach original report) → `bit-email` (send summary + full report to buyer agent + buyer) |
| 5.3.4 | **Earnest Money Deposit Reminder** | `bit-scheduler` (48/24 h before deadline) | `bit-database-sql` (fetch contracts with upcoming EMD deadlines) → `bit-loop` → `bit-sms` + `bit-email` (urgent reminder to buyer) → `bit-slack` (alert transaction coordinator) |
| 5.3.5 | **Closing Checklist & Day-of Brief** | `bit-scheduler` (48 h before closing date) | `bit-database-sql` (fetch closing details: parties, property, amounts) → `bit-ai` (compile closing checklist: documents to bring, wire instructions, etc.) → `bit-pdf` (format closing brief) → `bit-email` (send to buyer + seller + both agents) |
| 5.3.6 | **Post-Closing Survey & Review Request** | `bit-scheduler` (3 days after close date) | `bit-database-sql` (fetch recently closed transactions) → `bit-loop` → `bit-email` (client experience survey + Google/Zillow review request with links) |

---

### Department 4: Marketing

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 5.4.1 | **Monthly Market Report Mailer** | `bit-scheduler` (1st of month) | `bit-http` (fetch MLS market stats for served areas) → `bit-ai` (write market narrative: median price, days on market, inventory) → `bit-pdf` (generate branded market report) → `bit-database-sql` (fetch newsletter subscribers) → `bit-email` (batch send) |
| 5.4.2 | **Social Media Listing Post** | HTTP POST (listing-approved webhook) | `bit-http` (receive listing data + hero photo) → `bit-ai` (generate engaging social caption with hashtags) → `bit-http` (post to Instagram/Facebook via API) → `bit-database-sql` (log post with engagement tracking URL) |
| 5.4.3 | **Client Anniversary & Birthday Mailer** | `bit-scheduler` (daily morning) | `bit-database-sql` (find clients with closing anniversary or birthday today) → `bit-loop` → `bit-ai` (personalise message referencing their property) → `bit-email` (warm personal email from their agent) |
| 5.4.4 | **New Development Alert** | HTTP POST (developer partner webhook) | `bit-http` (receive new development announcement) → `bit-database-sql` (find matching leads by area/budget/property-type) → `bit-loop` → `bit-email` (early-access alert to matched leads) |
| 5.4.5 | **Neighbourhood Digest Newsletter** | `bit-scheduler` (weekly Friday) | `bit-http` (scrape/fetch local news, new listings, recent sales) → `bit-ai` (curate and write neighbourhood digest) → `bit-email` (send to subscribers segmented by neighbourhood) |

---

### Department 5: Property Management

| # | Habit | Trigger | Bits |
|---|---|---|---|
| 5.5.1 | **Rent Payment Reminder** | `bit-scheduler` (day 25 of month for 1st-of-month rent) | `bit-database-sql` (fetch active leases + tenant contacts) → `bit-loop` → `bit-email` + `bit-sms` (payment reminder with online pay link) |
| 5.5.2 | **Maintenance Request Workflow** | HTTP POST (tenant portal form) | `bit-http` (receive request) → `bit-database-sql` (create work order) → `bit-email` (acknowledge to tenant with expected timeline) → `bit-email` (dispatch to maintenance team / vendor) → `bit-tasks` (create task with deadline) |
| 5.5.3 | **Lease Renewal Notice** | `bit-scheduler` (90/60/30 days before expiry) | `bit-database-sql` (fetch leases expiring within window) → `bit-loop` → `bit-ai` (generate personalised renewal offer with market-rate context) → `bit-email` (send tiered renewal notices to tenants) |
| 5.5.4 | **Tenant Satisfaction Survey** | `bit-scheduler` (semi-annual) | `bit-database-sql` (fetch all active tenants) → `bit-loop` → `bit-email` (NPS + comment survey) → `bit-http` (collect responses) → `bit-ai` (analyse themes, flag complaints requiring action) → `bit-database-sql` (store results) |
| 5.5.5 | **Utility Billing Reconciliation** | `bit-scheduler` (monthly) | `bit-database-sql` (fetch utility invoices and tenant allocation rules) → `bit-loop` → `bit-pdf` (generate per-tenant utility statement) → `bit-email` (deliver statement to tenant) → `bit-database-sql` (post charge to ledger) |
| 5.5.6 | **Vacancy Loss Report** | `bit-scheduler` (monthly) | `bit-database-sql` (calculate vacant days × market rate per unit) → `bit-ai` (identify highest-impact vacancies and pricing optimisation suggestions) → `bit-pdf` (generate vacancy loss report) → `bit-email` (send to portfolio manager) |

---

## 7. Vue Component Architecture

Each industry gets its own data-driven Vue page built from a YAML file.  
The component tree works at **three levels of specificity**:

```
IndustryBrowser              ← root: shows all 5 industry cards
  └── IndustryPage           ← reads /data/{industry}.yaml
        └── DepartmentSection  ← for each department in the YAML
              └── HabitCard    ← for each habit in the department
```

---

### 7.1 `IndustryBrowser.vue`

Displays all five industry cards as a responsive grid.  
Reads the list of industry YAML files from a static manifest.

```vue
<!-- components/industries/IndustryBrowser.vue -->
<template>
  <div class="min-h-screen bg-gray-950 text-white p-6">
    <h1 class="text-3xl font-bold mb-8 text-white">Industry Automation</h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <IndustryCard
        v-for="industry in industries"
        :key="industry.id"
        :industry="industry"
        @click="$router.push(`/industries/${industry.id}`)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import IndustryCard from './IndustryCard.vue'

interface IndustrySummary {
  id: string
  name: string
  icon: string
  tagline: string
  totalHabits: number
  departments: number
}

const industries = ref<IndustrySummary[]>([])

onMounted(async () => {
  const manifest = await fetch('/data/industries-manifest.yaml').then(r => r.text())
  // parse YAML manifest into industries[]
  // (use js-yaml or yaml package)
  industries.value = parseYaml(manifest).industries
})
</script>
```

---

### 7.2 `IndustryPage.vue`

Full-page view for one industry. Reads `/data/{industryId}.yaml`.  
Shows the industry header, key stats, and all departments with their habits.

```vue
<!-- components/industries/IndustryPage.vue -->
<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <!-- Industry Hero -->
    <div class="bg-gray-900 border-b border-gray-800 p-8">
      <div class="max-w-5xl mx-auto flex items-center gap-6">
        <span class="text-6xl">{{ data.icon }}</span>
        <div>
          <h1 class="text-3xl font-bold">{{ data.name }}</h1>
          <p class="text-gray-400 mt-1">{{ data.description }}</p>
          <div class="flex gap-6 mt-4 text-sm">
            <span class="text-blue-400 font-semibold">
              {{ totalHabits }} habits
            </span>
            <span class="text-gray-400">
              {{ data.departments.length }} departments
            </span>
            <span class="text-gray-400">
              {{ uniqueBits.length }} bits used
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Department Filter Tabs -->
    <div class="max-w-5xl mx-auto px-8 pt-6">
      <div class="flex gap-2 flex-wrap mb-6">
        <button
          class="px-3 py-1.5 rounded-full text-sm border"
          :class="active === null
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-700 text-gray-400 hover:border-gray-500'"
          @click="active = null"
        >
          All
        </button>
        <button
          v-for="dept in data.departments"
          :key="dept.id"
          class="px-3 py-1.5 rounded-full text-sm border"
          :class="active === dept.id
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-gray-700 text-gray-400 hover:border-gray-500'"
          @click="active = dept.id"
        >
          {{ dept.name }}
        </button>
      </div>

      <!-- Department Sections -->
      <DepartmentSection
        v-for="dept in visibleDepartments"
        :key="dept.id"
        :department="dept"
        :industry-id="data.id"
        class="mb-10"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { parse as parseYaml } from 'yaml'
import DepartmentSection from './DepartmentSection.vue'
import type { IndustryData } from './types'

const route = useRoute()
const data = ref<IndustryData | null>(null)
const active = ref<string | null>(null)

onMounted(async () => {
  const raw = await fetch(`/data/${route.params.id}.yaml`).then(r => r.text())
  data.value = parseYaml(raw) as IndustryData
})

const visibleDepartments = computed(() =>
  active.value === null
    ? data.value?.departments ?? []
    : data.value?.departments.filter(d => d.id === active.value) ?? []
)

const totalHabits = computed(() =>
  data.value?.departments.reduce((acc, d) => acc + d.habits.length, 0) ?? 0
)

const uniqueBits = computed(() => {
  const bits = new Set<string>()
  data.value?.departments.forEach(d =>
    d.habits.forEach(h => h.bits.forEach(b => bits.add(b)))
  )
  return [...bits]
})
</script>
```

---

### 7.3 `DepartmentSection.vue`

Renders one department with its habit grid.  
Can also be used standalone as an embed on any page.

```vue
<!-- components/industries/DepartmentSection.vue -->
<template>
  <section>
    <div class="flex items-center gap-3 mb-4">
      <span class="text-2xl">{{ department.icon }}</span>
      <div>
        <h2 class="text-xl font-semibold text-white">{{ department.name }}</h2>
        <p class="text-sm text-gray-400">{{ department.description }}</p>
      </div>
      <span
        class="ml-auto text-xs font-medium bg-gray-800 text-gray-300
               px-2 py-1 rounded-full border border-gray-700"
      >
        {{ department.habits.length }} habits
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <HabitCard
        v-for="habit in department.habits"
        :key="habit.id"
        :habit="habit"
        :industry-id="industryId"
        :department-id="department.id"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import HabitCard from './HabitCard.vue'
import type { DepartmentData } from './types'

defineProps<{
  department: DepartmentData
  industryId: string
}>()
</script>
```

---

### 7.4 `HabitCard.vue`

Shows one habit: name, trigger, description, and the bit badges.

```vue
<!-- components/industries/HabitCard.vue -->
<template>
  <div
    class="bg-gray-900 border border-gray-800 rounded-xl p-4
           hover:border-gray-600 transition-colors cursor-pointer"
    @click="emit('open', habit)"
  >
    <!-- Header -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="text-sm font-semibold text-white leading-tight">
        {{ habit.name }}
      </h3>
      <TriggerBadge :type="habit.trigger" />
    </div>

    <!-- Description -->
    <p class="text-xs text-gray-400 mb-3 leading-relaxed">
      {{ habit.description }}
    </p>

    <!-- Bits used -->
    <div class="flex flex-wrap gap-1">
      <span
        v-for="bit in habit.bits"
        :key="bit"
        class="text-xs px-2 py-0.5 rounded-full bg-gray-800
               border border-gray-700 text-blue-300 font-mono"
      >
        {{ bit }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import TriggerBadge from './TriggerBadge.vue'
import type { HabitData } from './types'

const props = defineProps<{ habit: HabitData; industryId: string; departmentId: string }>()
const emit = defineEmits<{ (e: 'open', habit: HabitData): void }>()
</script>
```

---

### 7.5 `TriggerBadge.vue`

Small pill showing trigger type.

```vue
<!-- components/industries/TriggerBadge.vue -->
<template>
  <span
    class="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
    :class="styles[type] ?? styles.webhook"
  >
    {{ labels[type] ?? type }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ type: string }>()

const labels: Record<string, string> = {
  scheduler: '⏰ Scheduled',
  webhook:   '🔗 Webhook',
  email:     '📧 Email',
  manual:    '▶ Manual',
}

const styles: Record<string, string> = {
  scheduler: 'bg-purple-900 text-purple-300 border border-purple-800',
  webhook:   'bg-blue-900   text-blue-300   border border-blue-800',
  email:     'bg-yellow-900 text-yellow-300 border border-yellow-800',
  manual:    'bg-gray-800   text-gray-300   border border-gray-700',
}
</script>
```

---

### 7.6 Shared TypeScript Types

```ts
// components/industries/types.ts

export interface HabitData {
  id: string
  name: string
  description: string
  trigger: 'scheduler' | 'webhook' | 'email' | 'manual'
  bits: string[]
  stackFile?: string   // optional: relative path to a real stack.yaml
}

export interface DepartmentData {
  id: string
  name: string
  icon: string
  description: string
  habits: HabitData[]
}

export interface IndustryData {
  id: string
  name: string
  icon: string
  description: string
  tagline: string
  color: string        // tailwind color token e.g. "blue"
  departments: DepartmentData[]
}
```

---

## 8. YAML Data Schema

Each industry gets one YAML file at `public/data/{id}.yaml`.  
The same files can be consumed by the Vue components, documentation, and habit generators.

### 8.1 Full Schema Example: `public/data/healthcare.yaml`

```yaml
id: healthcare
name: Healthcare
icon: 🏥
tagline: Automate patient journeys, clinical operations, and compliance, end to end.
description: >
  From patient intake to regulatory filings, habits replace manual follow-ups,
  paper-based checklists, and error-prone data entry across every hospital department.
color: blue

departments:

  - id: patient-management
    name: Patient Management
    icon: 🧑‍⚕️
    description: Automate intake, reminders, follow-ups, and record sync.
    habits:

      - id: patient-intake-form
        name: Patient Intake Form
        description: Capture patient demographics and medical history via webhook, store to database, and send a confirmation email.
        trigger: webhook
        bits: [bit-http, bit-database-sql, bit-email]
        stackFile: showcase/healthcare/habits/patient-intake.yaml

      - id: appointment-reminder
        name: Appointment Reminder
        description: Scheduler queries upcoming appointments and sends SMS + email reminders 24 hours in advance.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-sms, bit-email]

      - id: post-visit-survey
        name: Post-Visit Follow-up Survey
        description: 24 hours after a completed visit, email a patient satisfaction survey and store the score.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-email, bit-http]

      - id: patient-record-sync
        name: Patient Record Sync
        description: Daily pull from the EHR API to keep the local database current.
        trigger: scheduler
        bits: [bit-scheduler, bit-http, bit-if, bit-database-sql, bit-logger]

      - id: prescription-refill-request
        name: Prescription Refill Request
        description: Receive refill request via webhook, notify the prescribing physician by email, and SMS the patient with status.
        trigger: webhook
        bits: [bit-http, bit-database-sql, bit-email, bit-sms]

      - id: no-show-re-engagement
        name: No-Show Re-engagement
        description: Daily morning job finds yesterday's no-shows and emails a rescheduling link.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-email]

  - id: billing-insurance
    name: Billing & Insurance
    icon: 💳
    description: Automate claim submission, eligibility checks, and patient billing.
    habits:

      - id: insurance-eligibility-check
        name: Insurance Eligibility Check
        description: On pre-visit webhook, call the payer eligibility API and email the billing team with the result.
        trigger: webhook
        bits: [bit-http, bit-if, bit-email, bit-database-sql]

      - id: claim-submission
        name: Claim Submission
        description: Nightly batch fetches unbilled encounters and submits claims to the clearinghouse via HTTP.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-http, bit-email]

      - id: payment-reminder
        name: Overdue Payment Reminder
        description: Weekly job finds balances over 30 days and sends email + SMS reminders with a payment link.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-email, bit-sms]

      - id: claim-denial-alert
        name: Claim Denial Alert
        description: Clearinghouse webhook triggers AI-powered denial analysis and emails the billing coder a suggested fix.
        trigger: webhook
        bits: [bit-http, bit-ai, bit-email, bit-database-sql]

      - id: eob-processing
        name: EOB Processing
        description: Watches the billing inbox for EOB attachments, OCRs the data, matches to claims, and generates a PDF reconciliation report.
        trigger: email
        bits: [bit-email, bit-ocr, bit-database-sql, bit-pdf]

      - id: patient-statement-generator
        name: Patient Statement Generator
        description: End-of-month scheduled job generates and emails PDF statements to patients with outstanding balances.
        trigger: scheduler
        bits: [bit-scheduler, bit-database-sql, bit-loop, bit-pdf, bit-email]

  # ... remaining departments follow the same structure
```

---

### 8.2 Industries Manifest: `public/data/industries-manifest.yaml`

```yaml
industries:
  - id: healthcare
    name: Healthcare
    icon: 🏥
    tagline: Patient journeys, clinical ops, and compliance, automated.
    totalHabits: 25
    departments: 5

  - id: finance-banking
    name: Finance & Banking
    icon: 🏦
    tagline: Onboarding, loan processing, fraud detection, and compliance.
    totalHabits: 25
    departments: 5

  - id: ecommerce-retail
    name: E-commerce & Retail
    icon: 🛒
    tagline: Orders, inventory, marketing, and customer support on autopilot.
    totalHabits: 26
    departments: 5

  - id: manufacturing
    name: Manufacturing
    icon: 🏭
    tagline: Supply chain, quality control, and production, connected.
    totalHabits: 26
    departments: 5

  - id: real-estate
    name: Real Estate
    icon: 🏘️
    tagline: Leads, listings, transactions, and property management, streamlined.
    totalHabits: 26
    departments: 5
```

---

### 8.3 Router Configuration

```ts
// router/index.ts (append to existing routes)
{
  path: '/industries',
  component: IndustryBrowser,
},
{
  path: '/industries/:id',
  component: IndustryPage,
},
{
  path: '/industries/:id/:departmentId',
  component: DepartmentPage,  // DepartmentSection wrapped as a full page
},
```

---

### 8.4 Implementation Checklist

- [ ] Create `public/data/` directory and write all 5 industry YAML files (healthcare, finance-banking, ecommerce-retail, manufacturing, real-estate)
- [ ] Create `public/data/industries-manifest.yaml`
- [ ] Add `yaml` npm dependency (`pnpm add yaml`)
- [ ] Build `components/industries/types.ts`
- [ ] Build `TriggerBadge.vue`
- [ ] Build `HabitCard.vue`
- [ ] Build `DepartmentSection.vue`
- [ ] Build `IndustryPage.vue`
- [ ] Build `IndustryBrowser.vue`
- [ ] Wire routes in router
- [ ] For each habit that has a `stackFile`, link to the real showcase stack so clicking "Open in Habits" launches the actual habit

---

## 9. Showcase Folder Plan: 25 Department Stacks

### 9.1 Design Principles

Each **department** across the 5 industries becomes a single self-contained showcase folder under `showcase/industries/`. The folder is the unit of truth, the `stack.yaml` inside it declares which industry and department it belongs to, and the static YAML data files that feed the docs site are derived from that metadata, not the other way around.

Key rules:
- One folder = one department = one runnable stack containing all habits for that department.
- `stack.yaml` is the source of truth for identity (`industries`, `departments` arrays).
- `index.html` is a standalone UI for that department stack (no framework build needed).
- `demo/` holds static PNG mockup screenshots (one per main use-case in the stack).
- The static docs YAML files (`docs/public/data/*.yaml`) will eventually be **generated** from the showcase folders by looping `stack.yaml` metadata.

---

### 9.2 Schema Changes: `stack.yaml`

Two new optional top-level fields are added to the stack schema:

```yaml
# showcase/industries/hc-patient-management/stack.yaml
version: "1.0"
name: "Patient Management"

# NEW: links this stack to the Industries docs feature
industries:
  - healthcare          # one or more industry IDs (matches docs/public/data/*.yaml id)
departments:
  - patient-management  # one or more department IDs (matches department.id inside the industry YAML)

workflows:
  - id: patient-intake-form
    path: ./habits/patient-intake-form.yaml
    enabled: true
  - id: appointment-reminder
    path: ./habits/appointment-reminder.yaml
    enabled: true
  # … one entry per habit in the department

server:
  port: 13000
  host: "0.0.0.0"
  frontend: ./index.html

logging:
  level: info
  outputs: [console]
```

**Schema definition additions** (`schemas/habits.schema.yaml`, stack root properties):

```yaml
industries:
  type: array
  items:
    type: string
  description: |
    Industry IDs this stack belongs to (matches id in docs/public/data/{id}.yaml).
    Used to link showcase stacks back to the Industry docs pages.
    Example: [healthcare, finance-banking]

departments:
  type: array
  items:
    type: string
  description: |
    Department IDs within the declared industries (matches department.id in the industry YAML).
    Used to group stacks inside an industry page in the docs.
    Example: [patient-management]
```

---

### 9.3 Folder Structure

```
showcase/
  industries/
    hc-patient-management/
    hc-billing-insurance/
    hc-clinical-operations/
    hc-hr-staffing/
    hc-compliance-reporting/
    fb-customer-onboarding/
    fb-loan-processing/
    fb-fraud-detection/
    fb-compliance-audit/
    fb-customer-support/
    ec-order-management/
    ec-inventory-management/
    ec-marketing-crm/
    ec-customer-support/
    ec-finance-reporting/
    mf-supply-chain/
    mf-quality-control/
    mf-maintenance/
    mf-hr-workforce/
    mf-production-planning/
    re-lead-management/
    re-property-listings/
    re-transaction-management/
    re-marketing/
    re-property-management/
```

Each folder contains:

```
<dept-folder>/
  stack.yaml          ← stack with industries + departments fields
  index.html          ← standalone department UI (dark, mobile-like)
  habits/
    <habit-id>.yaml   ← one per habit in the department
  demo/
    overview.png      ← mockup of the main dashboard / landing view
    <usecase>.png     ← one per additional use-case (2–4 total per dept)
```

---

### 9.4 All 25 Folders: Complete Listing

#### Healthcare (`hc-*`)

| Folder | Department | Habits | Key bits |
|--------|-----------|--------|----------|
| `hc-patient-management` | Patient Management | patient-intake-form, appointment-reminder, post-visit-survey, record-sync, prescription-refill-request, no-show-re-engagement | bit-scheduler, bit-email, bit-sms, bit-http, bit-database-sql, bit-ai |
| `hc-billing-insurance` | Billing & Insurance | eligibility-check, claim-submission, payment-reminder, claim-denial-alert, eob-processing, patient-statement-generator | bit-http, bit-scheduler, bit-email, bit-pdf, bit-database-sql, bit-ai |
| `hc-clinical-operations` | Clinical Operations | lab-result-notification, critical-value-alert, ai-care-plan-generator, referral-coordination, medication-interaction-check | bit-http, bit-email, bit-sms, bit-ai, bit-slack, bit-database-sql |
| `hc-hr-staffing` | HR & Staffing | credential-expiry-alert, new-hire-onboarding, time-off-approval, shift-change-notification, clinical-incident-report | bit-scheduler, bit-email, bit-database-sql, bit-http, bit-slack, bit-ai |
| `hc-compliance-reporting` | Compliance & Reporting | hipaa-audit-log, policy-acknowledgment, regulatory-filing-reminder, incident-escalation, quality-metrics-dashboard | bit-scheduler, bit-email, bit-ai, bit-pdf, bit-http, bit-database-sql |

#### Finance & Banking (`fb-*`)

| Folder | Department | Habits | Key bits |
|--------|-----------|--------|----------|
| `fb-customer-onboarding` | Customer Onboarding | kyc-data-collection, account-opening-confirmation, identity-verification, drop-off-re-engagement, first-transaction-tip | bit-http, bit-email, bit-ai, bit-database-sql, bit-scheduler |
| `fb-loan-processing` | Loan Processing | loan-application-intake, document-completeness-check, credit-bureau-pull, underwriting-status-update, loan-offer-letter, disbursement-confirmation | bit-http, bit-email, bit-pdf, bit-ai, bit-database-sql, bit-scheduler |
| `fb-fraud-detection` | Fraud Detection | transaction-fraud-alert, sar-draft-generator, account-freeze-notification, dispute-intake, fraud-weekly-summary | bit-http, bit-email, bit-slack, bit-ai, bit-scheduler, bit-database-sql |
| `fb-compliance-audit` | Compliance & Audit | sox-evidence-collection, aml-screening, regulatory-filing-reminder, audit-trail-export, policy-sign-off | bit-scheduler, bit-http, bit-email, bit-pdf, bit-database-sql, bit-ai |
| `fb-customer-support` | Customer Support | ticket-auto-routing, account-statement-request, complaint-sla-alert, callback-scheduler, nps-survey | bit-email, bit-http, bit-ai, bit-scheduler, bit-database-sql, bit-sms |

#### E-commerce & Retail (`ec-*`)

| Folder | Department | Habits | Key bits |
|--------|-----------|--------|----------|
| `ec-order-management` | Order Management | order-confirmation-email, shipping-status-update, return-request-handler, order-fraud-scoring, delayed-order-alert | bit-http, bit-email, bit-sms, bit-if, bit-slack, bit-database-sql |
| `ec-inventory-management` | Inventory Management | low-stock-alert, automatic-supplier-reorder, inventory-reconciliation, dead-stock-alert, catalogue-sync | bit-scheduler, bit-http, bit-email, bit-slack, bit-database-sql, bit-ai, bit-pdf |
| `ec-marketing-crm` | Marketing & CRM | abandoned-cart-recovery, post-purchase-review, birthday-discount-mailer, loyalty-points-notification, welcome-series, campaign-performance-report | bit-http, bit-email, bit-ai, bit-scheduler, bit-database-sql, bit-pdf |
| `ec-customer-support` | Customer Support | ticket-auto-classification, refund-status-notification, csat-survey, sla-breach-alert, proactive-exception-outreach | bit-email, bit-http, bit-ai, bit-slack, bit-sms, bit-scheduler |
| `ec-finance-reporting` | Finance & Reporting | daily-sales-report, invoice-generation, chargeback-alert, revenue-reconciliation, monthly-tax-summary | bit-scheduler, bit-http, bit-ai, bit-pdf, bit-email, bit-database-sql |

#### Manufacturing (`mf-*`)

| Folder | Department | Habits | Key bits |
|--------|-----------|--------|----------|
| `mf-supply-chain` | Supply Chain | supplier-lead-time-alert, po-approval-workflow, goods-receipt-notification, critical-parts-shortage, supplier-performance-report | bit-scheduler, bit-http, bit-email, bit-slack, bit-database-sql, bit-ai, bit-pdf |
| `mf-quality-control` | Quality Control | non-conformance-report, incoming-inspection-checklist, defect-rate-alert, capa-escalation, qc-monthly-report | bit-http, bit-database-sql, bit-email, bit-tasks, bit-slack, bit-ai, bit-pdf |
| `mf-maintenance` | Maintenance | preventive-maintenance-reminder, equipment-downtime-alert, spare-parts-reorder, work-order-completion, oee-report | bit-scheduler, bit-database-sql, bit-email, bit-tasks, bit-http, bit-sms, bit-ai, bit-pdf |
| `mf-hr-workforce` | HR & Workforce | shift-schedule-notification, safety-training-reminder, workplace-incident-report, attendance-anomaly-alert, performance-review-scheduler | bit-scheduler, bit-database-sql, bit-email, bit-sms, bit-ai, bit-google-calendar |
| `mf-production-planning` | Production Planning | daily-production-schedule, customer-order-delay-alert, yield-loss-alert, bom-change-notification, machine-utilisation-report, capacity-planning-report | bit-scheduler, bit-database-sql, bit-email, bit-slack, bit-ai, bit-pdf |

#### Real Estate (`re-*`)

| Folder | Department | Habits | Key bits |
|--------|-----------|--------|----------|
| `re-lead-management` | Lead Management | lead-capture-crm-sync, lead-qualification-scorer, multi-touch-follow-up, stale-lead-alert, lead-source-attribution-report | bit-http, bit-crm, bit-email, bit-ai, bit-database-sql, bit-slack, bit-scheduler |
| `re-property-listings` | Property Listings | ai-listing-description, multi-portal-listing-sync, price-reduction-alert, listing-expiry-reminder, open-house-invitation | bit-http, bit-ai, bit-email, bit-database-sql, bit-sms, bit-google-calendar |
| `re-transaction-management` | Transaction Management | offer-submission-package, contract-milestone-tracker, inspection-report-distribution, earnest-money-reminder, closing-brief, post-closing-survey | bit-http, bit-pdf, bit-email, bit-database-sql, bit-slack, bit-sms, bit-ai |
| `re-marketing` | Marketing | monthly-market-report, social-media-listing-post, client-anniversary-mailer, new-development-alert, neighbourhood-digest | bit-scheduler, bit-http, bit-ai, bit-pdf, bit-email, bit-database-sql |
| `re-property-management` | Property Management | rent-payment-reminder, maintenance-request-workflow, lease-renewal-notice, tenant-satisfaction-survey, utility-billing-reconciliation, vacancy-loss-report | bit-scheduler, bit-database-sql, bit-email, bit-sms, bit-ai, bit-pdf, bit-tasks |

---

### 9.5 `stack.yaml` Template

```yaml
version: "1.0"
name: "<Department Name>"
description: "<One-line department description>"

# Industry tagging: links this stack to the docs industries feature
industries:
  - <industry-id>        # e.g. healthcare
departments:
  - <department-id>      # e.g. patient-management

workflows:
  - id: <habit-id>
    path: ./habits/<habit-id>.yaml
    enabled: true
  # … repeat for each habit

server:
  port: 13000
  host: "0.0.0.0"
  frontend: ./index.html
  openapi: true

logging:
  level: info
  outputs: [console]
  format: text
  colorize: true
```

---

### 9.6 `index.html` Template

Each department gets a dark, card-based single-page HTML file that:
- Lists every habit in the stack with its trigger type badge, description, and bit tags.
- Has a "Run habit" button per habit that calls `POST /api/<habit-id>` via `fetch`.
- Shows a live response panel below each card after execution.
- No build step, pure HTML + inline CSS + inline `<script>`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{Department Name}</title>
  <style>
    /* dark, mobile-first, card layout, no gradients, solid colors */
  </style>
</head>
<body>
  <header>
    <h1>{Department Name}</h1>
    <p>{description}</p>
  </header>
  <main id="habits"></main>
  <script>
    const habits = [ /* inline manifest pulled from /misc/workflows */ ];
    // render cards; wire Run buttons to POST /api/{id}
  </script>
</body>
</html>
```

---

### 9.7 `demo/` Images Convention

| Filename | Content |
|----------|---------|
| `overview.png` | Full-page screenshot of the department UI showing all habit cards |
| `run-<habit-id>.png` | Screenshot after triggering a specific habit, showing the response panel |
| `mobile.png` | Mobile viewport (375 px) of the same page |

Minimum 2 images per folder, target 3–4.

---

### 9.8 Docs Integration: Derived Data Flow

Once the 25 stacks exist, the static `docs/public/data/*.yaml` files **are no longer maintained by hand**. Instead:

1. A build script (`scripts/generate-industry-data.ts`) walks all `showcase/industries/*/stack.yaml` files.
2. For each stack it reads `industries[]` and `departments[]`, then merges the habit metadata into the relevant industry YAML.
3. The script writes `docs/public/data/<industry-id>.yaml` and `docs/public/data/industries-manifest.yaml`.
4. This runs as part of `pnpm build` (docs) so the data is always in sync with the stacks.

Data flow:

```
showcase/industries/hc-patient-management/stack.yaml
  → scripts/generate-industry-data.ts
  → docs/public/data/healthcare.yaml  (department: patient-management section)
  → VitePress build
  → docs site /industries/healthcare
```

---

### 9.9 Implementation Order

1. **Schema**: add `industries` and `departments` fields to `schemas/habits.schema.yaml`.
2. **25 `stack.yaml` files**: create all folders and stacks (no habits wired yet, just metadata + empty workflow list).
3. **25 `index.html` files**: generate department UIs from the template, one per folder.
4. **25 × 3 `demo/` images**: create placeholder/mockup PNGs.
5. **Habit YAML files**: implement `habits/*.yaml` for each workflow in each stack.
6. **Generate script**: write `scripts/generate-industry-data.ts` to derive docs YAML from stacks.
7. **Replace static YAML**: delete hand-written `docs/public/data/*.yaml`, run generate script instead.
8. **Docs component update**: add a "View Stack" button on each habit card linking to the showcase folder.

