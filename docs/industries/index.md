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
      {
        "id": "billing-insurance",
        "name": "Healthcare Billing & Insurance",
        "description": "Automate claims submission, prior auth requests, denial management, and payment posting across your billing and insurance workflows.",
        "showcaseSlug": "healthcare-billing-insurance"
      },
      {
        "id": "clinical-operations",
        "name": "Healthcare Clinical Operations",
        "description": "Automate lab result routing, patient scheduling, medication refills, care coordination, and EHR data sync across clinical operations.",
        "showcaseSlug": "healthcare-clinical-operations"
      },
      {
        "id": "compliance-reporting",
        "name": "Healthcare Compliance & Reporting",
        "description": "Automate HIPAA audit log compilation, incident reporting, policy distribution, accreditation tracking, and regulatory update alerts.",
        "showcaseSlug": "healthcare-compliance-reporting"
      },
      {
        "id": "hr-staffing",
        "name": "Healthcare HR & Staffing",
        "description": "Automate nurse shift scheduling, credential tracking, staff onboarding, shift coverage requests, and compliance training reminders.",
        "showcaseSlug": "healthcare-hr-staffing"
      },
      {
        "id": "patient-management",
        "name": "Healthcare Patient Management",
        "description": "Automate appointment reminders, discharge summaries, readmission alerts, referral coordination, and patient satisfaction surveys.",
        "showcaseSlug": "healthcare-patient-management"
      }
    ]
  },
  {
    "id": "finance-banking",
    "name": "Finance & Banking",
    "icon": "shield",
    "tagline": "Onboard customers, detect fraud, and pass audits, without the manual grind.",
    "totalHabits": 30,
    "departmentList": [
      {
        "id": "compliance-audit",
        "name": "Finance & Banking Compliance & Audit",
        "description": "Automate AML screening, SAR filing, audit trail compilation, policy compliance checks, and regulatory report generation.",
        "showcaseSlug": "finance-banking-compliance-audit"
      },
      {
        "id": "customer-onboarding",
        "name": "Finance & Banking Customer Onboarding",
        "description": "Automate KYC document collection, risk scoring, account creation, credit checks, and the new customer welcome sequence.",
        "showcaseSlug": "finance-banking-customer-onboarding"
      },
      {
        "id": "customer-support",
        "name": "Finance & Banking Customer Support",
        "description": "Automate support ticket routing, account enquiry handling, dispute resolution, callback scheduling, and escalation management.",
        "showcaseSlug": "finance-banking-customer-support"
      },
      {
        "id": "fraud-detection",
        "name": "Finance & Banking Fraud Detection",
        "description": "Automate real-time transaction monitoring, fraud alert generation, customer notification, account freezing, and regulatory report filing.",
        "showcaseSlug": "finance-banking-fraud-detection"
      },
      {
        "id": "loan-processing",
        "name": "Finance & Banking Loan Processing",
        "description": "Automate loan application intake, document verification, credit evaluation, approval routing, and disbursement confirmation.",
        "showcaseSlug": "finance-banking-loan-processing"
      }
    ]
  },
  {
    "id": "ecommerce-retail",
    "name": "E-commerce & Retail",
    "icon": "package",
    "tagline": "Orders, inventory, marketing, and customer support on autopilot.",
    "totalHabits": 30,
    "departmentList": [
      {
        "id": "customer-support",
        "name": "Ecommerce & Retail Customer Support",
        "description": "Automate ticket classification, return approvals, escalation routing, FAQ auto-responses, sentiment monitoring, and agent handoff summaries.",
        "showcaseSlug": "ecommerce-retail-customer-support"
      },
      {
        "id": "finance-reporting",
        "name": "Ecommerce & Retail Finance Reporting",
        "description": "Automate revenue reconciliation, tax reporting preparation, invoice generation, expense categorisation, financial alerts, and period-close checklists.",
        "showcaseSlug": "ecommerce-retail-finance-reporting"
      },
      {
        "id": "inventory-management",
        "name": "Ecommerce & Retail Inventory Management",
        "description": "Automate low stock alerts, reorder purchase orders, supplier notifications, inventory reconciliation, and demand forecasting.",
        "showcaseSlug": "ecommerce-retail-inventory-management"
      },
      {
        "id": "marketing-crm",
        "name": "Ecommerce & Retail Marketing & CRM",
        "description": "Automate abandoned cart recovery, loyalty notifications, customer segmentation, win-back campaigns, review requests, and performance reporting.",
        "showcaseSlug": "ecommerce-retail-marketing-crm"
      },
      {
        "id": "order-management",
        "name": "Ecommerce & Retail Order Management",
        "description": "Automate order confirmations, fulfilment routing, shipping updates, delivery confirmations, return processing, and exception alerts.",
        "showcaseSlug": "ecommerce-retail-order-management"
      }
    ]
  },
  {
    "id": "manufacturing",
    "name": "Manufacturing",
    "icon": "cpu",
    "tagline": "Supply chain, quality control, maintenance, and production, all connected.",
    "totalHabits": 30,
    "departmentList": [
      {
        "id": "hr-workforce",
        "name": "Manufacturing HR & Workforce",
        "description": "Automate shift scheduling, time and attendance processing, safety incident reporting, compliance training, payroll preparation, and headcount alerts.",
        "showcaseSlug": "manufacturing-hr-workforce"
      },
      {
        "id": "maintenance",
        "name": "Manufacturing Maintenance",
        "description": "Automate equipment alerts, preventive maintenance scheduling, work order creation, parts ordering, downtime reporting, and technician dispatch.",
        "showcaseSlug": "manufacturing-maintenance"
      },
      {
        "id": "production-planning",
        "name": "Manufacturing Production Planning",
        "description": "Automate capacity alerts, production order creation, material requirements planning, schedule change notifications, and output reporting.",
        "showcaseSlug": "manufacturing-production-planning"
      },
      {
        "id": "quality-control",
        "name": "Manufacturing Quality Control",
        "description": "Automate defect report routing, inspection scheduling, non-conformance handling, corrective action tracking, and audit preparation.",
        "showcaseSlug": "manufacturing-quality-control"
      },
      {
        "id": "supply-chain",
        "name": "Manufacturing Supply Chain",
        "description": "Automate purchase order creation, supplier communications, delivery tracking, vendor performance reports, and inventory replenishment.",
        "showcaseSlug": "manufacturing-supply-chain"
      }
    ]
  },
  {
    "id": "real-estate",
    "name": "Real Estate",
    "icon": "home",
    "tagline": "Leads, listings, transactions, and property management, streamlined.",
    "totalHabits": 30,
    "departmentList": [
      {
        "id": "lead-management",
        "name": "Real Estate Lead Management",
        "description": "Automate lead capture, AI scoring, agent assignment, follow-up sequences, CRM sync, and cold lead re-engagement.",
        "showcaseSlug": "real-estate-lead-management"
      },
      {
        "id": "marketing",
        "name": "Real Estate Marketing",
        "description": "Automate campaign launches, social media posting, open house promotion, newsletter distribution, listing performance alerts, and competitor analysis.",
        "showcaseSlug": "real-estate-marketing"
      },
      {
        "id": "property-listings",
        "name": "Real Estate Property Listings",
        "description": "Automate listing creation alerts, MLS syndication, price change notifications, expiry reminders, performance reports, and photo review requests.",
        "showcaseSlug": "real-estate-property-listings"
      },
      {
        "id": "property-management",
        "name": "Real Estate Property Management",
        "description": "Automate tenant onboarding, maintenance request routing, rent collection alerts, lease renewals, property inspections, and vendor management.",
        "showcaseSlug": "real-estate-property-management"
      },
      {
        "id": "transaction-management",
        "name": "Real Estate Transaction Management",
        "description": "Automate offer tracking, document collection, inspection scheduling, closing coordination, commission calculation, and compliance review.",
        "showcaseSlug": "real-estate-transaction-management"
      }
    ]
  }
]
</script>

<IndustryBrowser :industries="industries" />
