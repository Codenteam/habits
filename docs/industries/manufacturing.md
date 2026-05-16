---
title: "Manufacturing Automation"
description: "Supply chain, quality control, maintenance, and production, all connected."
aside: false
---

<script setup>
const industry = {
  "id": "manufacturing",
  "name": "Manufacturing",
  "icon": "cpu",
  "tagline": "Supply chain, quality control, maintenance, and production, all connected.",
  "description": "From purchase order approvals to OEE reports, habits integrate your ERP, MES, CMMS, and quality systems, replacing manual emails and spreadsheets.",
  "color": "yellow",
  "departments": [
    {
      "id": "hr-workforce",
      "name": "Manufacturing HR & Workforce",
      "icon": "zap",
      "description": "Automate shift scheduling, time and attendance processing, safety incident reporting, compliance training, payroll preparation, and headcount alerts.",
      "habits": [
        {
          "id": "shift-scheduling",
          "name": "Shift Scheduling",
          "description": "Generate weekly shift schedules based on headcount rules and notify workers of assignments.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        },
        {
          "id": "time-and-attendance",
          "name": "Time and Attendance",
          "description": "Process time sheet submissions automatically and flag anomalies for manager review.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        },
        {
          "id": "safety-incident-reporting",
          "name": "Safety Incident Reporting",
          "description": "Capture safety incident reports via webhook and route to HR and HSE for investigation.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        },
        {
          "id": "training-compliance",
          "name": "Training Compliance",
          "description": "Track mandatory safety training completion and send automated reminders ahead of deadlines.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        },
        {
          "id": "payroll-preparation",
          "name": "Payroll Preparation",
          "description": "Compile approved payroll data and submit it to the payroll system on the scheduled run date.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        },
        {
          "id": "headcount-planning-alert",
          "name": "Headcount Planning Alert",
          "description": "Alert HR automatically when any department headcount falls below the configured target level.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "slack",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-hr-workforce"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "manufacturing-hr-workforce"
    },
    {
      "id": "maintenance",
      "name": "Manufacturing Maintenance",
      "icon": "zap",
      "description": "Automate equipment alerts, preventive maintenance scheduling, work order creation, parts ordering, downtime reporting, and technician dispatch.",
      "habits": [
        {
          "id": "equipment-alert",
          "name": "Equipment Alert",
          "description": "Receive sensor alerts from connected equipment and automatically create maintenance work orders.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        },
        {
          "id": "preventive-maintenance-scheduling",
          "name": "Preventive Maintenance Scheduling",
          "description": "Schedule preventive maintenance tasks based on equipment runtime hours or fixed calendar intervals.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        },
        {
          "id": "work-order-creation",
          "name": "Work Order Creation",
          "description": "Generate structured work orders and assign them to available maintenance engineers automatically.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        },
        {
          "id": "part-ordering",
          "name": "Part Ordering",
          "description": "Auto-order replacement parts from approved suppliers when spare parts stock falls below minimum.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        },
        {
          "id": "downtime-reporting",
          "name": "Downtime Reporting",
          "description": "Log all unplanned downtime events automatically and notify the production planner in real time.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "slack",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        },
        {
          "id": "technician-dispatch",
          "name": "Technician Dispatch",
          "description": "Notify the on-call maintenance technician via SMS with full job details when a fault is confirmed.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "sms",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-maintenance"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "manufacturing-maintenance"
    },
    {
      "id": "production-planning",
      "name": "Manufacturing Production Planning",
      "icon": "zap",
      "description": "Automate capacity alerts, production order creation, material requirements planning, schedule change notifications, and output reporting.",
      "habits": [
        {
          "id": "capacity-alert",
          "name": "Capacity Alert",
          "description": "Flag capacity constraints automatically when confirmed order volume exceeds production threshold.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        },
        {
          "id": "production-order-creation",
          "name": "Production Order Creation",
          "description": "Auto-create structured production orders in the MES when sales orders are confirmed.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        },
        {
          "id": "material-requirements-planning",
          "name": "Material Requirements Planning",
          "description": "Calculate material requirements from the production plan and alert purchasing on shortfalls.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        },
        {
          "id": "schedule-change-notification",
          "name": "Schedule Change Notification",
          "description": "Notify all affected teams immediately when changes are made to the production schedule.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "slack",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        },
        {
          "id": "bottleneck-alert",
          "name": "Bottleneck Alert",
          "description": "Detect workstation bottlenecks in real time using throughput data and escalate to the planner.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        },
        {
          "id": "output-reporting",
          "name": "Output Reporting",
          "description": "Compile actual vs planned production output daily and distribute the report to management.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-production-planning"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "manufacturing-production-planning"
    },
    {
      "id": "quality-control",
      "name": "Manufacturing Quality Control",
      "icon": "zap",
      "description": "Automate defect report routing, inspection scheduling, non-conformance handling, corrective action tracking, and audit preparation.",
      "habits": [
        {
          "id": "defect-report-routing",
          "name": "Defect Report Routing",
          "description": "Capture defect reports from the production line and route them to the QC team instantly.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        },
        {
          "id": "inspection-scheduling",
          "name": "Inspection Scheduling",
          "description": "Schedule quality inspections automatically based on production milestone completions.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        },
        {
          "id": "non-conformance-routing",
          "name": "Non-Conformance Routing",
          "description": "Route NCRs to the responsible team with deadline assignment and severity classification.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        },
        {
          "id": "corrective-action-tracking",
          "name": "Corrective Action Tracking",
          "description": "Monitor CAPA completion progress and send escalating reminders as deadlines approach.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        },
        {
          "id": "certification-tracking",
          "name": "Certification Tracking",
          "description": "Alert the QC manager automatically when product or process certifications are due for renewal.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        },
        {
          "id": "audit-preparation",
          "name": "Audit Preparation",
          "description": "Compile evidence packs and assign preparation tasks to the team ahead of scheduled audits.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-quality-control"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "manufacturing-quality-control"
    },
    {
      "id": "supply-chain",
      "name": "Manufacturing Supply Chain",
      "icon": "zap",
      "description": "Automate purchase order creation, supplier communications, delivery tracking, vendor performance reports, and inventory replenishment.",
      "habits": [
        {
          "id": "purchase-order-automation",
          "name": "Purchase Order Automation",
          "description": "Auto-raise purchase orders when inventory drops below the configured safety stock level.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        },
        {
          "id": "supplier-communication",
          "name": "Supplier Communication",
          "description": "Send order updates, confirmations, and delivery date requests to suppliers automatically.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        },
        {
          "id": "delivery-tracking",
          "name": "Delivery Tracking",
          "description": "Monitor inbound shipments in real time and alert operations on any delays or exceptions.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        },
        {
          "id": "vendor-performance-report",
          "name": "Vendor Performance Report",
          "description": "Compile on-time delivery rates and quality scores monthly and share with procurement.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        },
        {
          "id": "quality-inspection-alert",
          "name": "Quality Inspection Alert",
          "description": "Notify the QC team automatically when an inbound shipment is ready for inspection.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "slack"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        },
        {
          "id": "inventory-replenishment",
          "name": "Inventory Replenishment",
          "description": "Trigger replenishment workflows automatically based on the live production schedule.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "email"
          ],
          "stackFolder": "showcase/manufacturing-supply-chain"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "manufacturing-supply-chain"
    }
  ]
}
</script>

<IndustryPage :industry="industry" />
