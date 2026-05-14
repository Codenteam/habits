---
title: Industry Automation
description: Explore how Habits automates operations across Healthcare, Finance, E-commerce, Manufacturing, and Real Estate.
aside: false
---

<script setup>
const industries = [
  {
    "id": "healthcare",
    "name": "Healthcare",
    "icon": "heart",
    "tagline": "Automate patient journeys, clinical operations, and compliance, end to end.",
    "totalHabits": 30,
    "departmentList": [
      { "id": "patient-management", "name": "Patient Management", "description": "Automate appointment reminders, discharge summaries, readmission alerts, referral tracking, and patient intake across your care pathways.", "showcaseSlug": "healthcare-patient-management" },
      { "id": "billing-insurance", "name": "Billing & Insurance", "description": "Automate claims submission, prior auth requests, denial management, and payment posting across your billing and insurance workflows.", "showcaseSlug": "healthcare-billing-insurance" },
      { "id": "clinical-operations", "name": "Clinical Operations", "description": "Automate lab result routing, patient scheduling, medication refills, care coordination, and referral handoffs.", "showcaseSlug": "healthcare-clinical-operations" },
      { "id": "hr-staffing", "name": "HR & Staffing", "description": "Automate nurse shift scheduling, credential tracking, staff onboarding, shift cover requests, and payroll prep.", "showcaseSlug": "healthcare-hr-staffing" },
      { "id": "compliance-reporting", "name": "Compliance & Reporting", "description": "Automate HIPAA audit log compilation, incident reporting, policy distribution, and regulatory submissions.", "showcaseSlug": "healthcare-compliance-reporting" }
    ]
  },
  {
    "id": "finance-banking",
    "name": "Finance & Banking",
    "icon": "shield",
    "tagline": "Onboard customers, detect fraud, and pass audits, without the manual grind.",
    "totalHabits": 30,
    "departmentList": [
      { "id": "customer-onboarding", "name": "Customer Onboarding", "description": "Automate KYC document collection, risk scoring, account creation, credit checks, and the new customer welcome sequence.", "showcaseSlug": "finance-banking-customer-onboarding" },
      { "id": "loan-processing", "name": "Loan Processing", "description": "Automate loan application intake, document verification, credit evaluation, approval routing, and disbursement notifications.", "showcaseSlug": "finance-banking-loan-processing" },
      { "id": "fraud-detection", "name": "Fraud Detection", "description": "Automate real-time transaction monitoring, fraud alert generation, customer notifications, and case creation for investigation.", "showcaseSlug": "finance-banking-fraud-detection" },
      { "id": "compliance-audit", "name": "Compliance & Audit", "description": "Automate AML screening, SAR filing, audit trail compilation, policy compliance checks, and regulatory report generation.", "showcaseSlug": "finance-banking-compliance-audit" },
      { "id": "customer-support", "name": "Customer Support", "description": "Automate support ticket routing, account enquiry handling, dispute resolution, callback scheduling, and satisfaction surveys.", "showcaseSlug": "finance-banking-customer-support" }
    ]
  },
  {
    "id": "ecommerce-retail",
    "name": "E-commerce & Retail",
    "icon": "package",
    "tagline": "Orders, inventory, marketing, and customer support on autopilot.",
    "totalHabits": 30,
    "departmentList": [
      { "id": "order-management", "name": "Order Management", "description": "Automate order confirmations, fulfilment routing, shipping updates, delivery confirmations, and return processing.", "showcaseSlug": "ecommerce-retail-order-management" },
      { "id": "inventory-management", "name": "Inventory Management", "description": "Automate low stock alerts, reorder purchase orders, supplier notifications, inventory reconciliation, and overstock reporting.", "showcaseSlug": "ecommerce-retail-inventory-management" },
      { "id": "marketing-crm", "name": "Marketing & CRM", "description": "Automate abandoned cart recovery, loyalty notifications, customer segmentation, campaign launches, and win-back sequences.", "showcaseSlug": "ecommerce-retail-marketing-crm" },
      { "id": "customer-support", "name": "Customer Support", "description": "Automate ticket classification, return approvals, escalation routing, FAQ auto-responses, and post-resolution surveys.", "showcaseSlug": "ecommerce-retail-customer-support" },
      { "id": "finance-reporting", "name": "Finance & Reporting", "description": "Automate revenue reconciliation, tax reporting preparation, invoice generation, payment failure handling, and daily P&L summaries.", "showcaseSlug": "ecommerce-retail-finance-reporting" }
    ]
  },
  {
    "id": "manufacturing",
    "name": "Manufacturing",
    "icon": "cpu",
    "tagline": "Supply chain, quality control, maintenance, and production, all connected.",
    "totalHabits": 30,
    "departmentList": [
      { "id": "supply-chain", "name": "Supply Chain", "description": "Automate purchase order creation, supplier communications, delivery tracking, vendor performance alerts, and inventory reorder triggers.", "showcaseSlug": "manufacturing-supply-chain" },
      { "id": "quality-control", "name": "Quality Control", "description": "Automate defect report routing, inspection scheduling, non-conformance handling, supplier quality alerts, and corrective action tracking.", "showcaseSlug": "manufacturing-quality-control" },
      { "id": "maintenance", "name": "Maintenance", "description": "Automate equipment alerts, preventive maintenance scheduling, work order creation, spare parts reordering, and maintenance report generation.", "showcaseSlug": "manufacturing-maintenance" },
      { "id": "production-planning", "name": "Production Planning", "description": "Automate capacity alerts, production order creation, material requirements planning, schedule change notifications, and output reporting.", "showcaseSlug": "manufacturing-production-planning" },
      { "id": "hr-workforce", "name": "HR & Workforce", "description": "Automate shift scheduling, time and attendance processing, safety incident reporting, training reminders, and contractor onboarding.", "showcaseSlug": "manufacturing-hr-workforce" }
    ]
  },
  {
    "id": "real-estate",
    "name": "Real Estate",
    "icon": "home",
    "tagline": "Leads, listings, transactions, and property management, streamlined.",
    "totalHabits": 30,
    "departmentList": [
      { "id": "lead-management", "name": "Lead Management", "description": "Automate lead capture, AI scoring, agent assignment, follow-up sequences, CRM sync, and lead source attribution.", "showcaseSlug": "real-estate-lead-management" },
      { "id": "property-listings", "name": "Property Listings", "description": "Automate listing creation alerts, MLS syndication, price change notifications, expired listing follow-ups, and photo request workflows.", "showcaseSlug": "real-estate-property-listings" },
      { "id": "transaction-management", "name": "Transaction Management", "description": "Automate offer tracking, document collection, inspection scheduling, closing coordination, and post-close follow-ups.", "showcaseSlug": "real-estate-transaction-management" },
      { "id": "marketing", "name": "Marketing", "description": "Automate campaign launches, social media posting, open house promotion, newsletter delivery, and market report distribution.", "showcaseSlug": "real-estate-marketing" },
      { "id": "property-management", "name": "Property Management", "description": "Automate tenant onboarding, maintenance request routing, rent collection alerts, lease renewal reminders, and inspection scheduling.", "showcaseSlug": "real-estate-property-management" }
    ]
  }
]
</script>

<IndustryBrowser :industries="industries" />
