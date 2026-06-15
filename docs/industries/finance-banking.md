---
title: "Finance & Banking Automation"
description: "Onboard customers, detect fraud, and pass audits, without the manual grind."
aside: false
---

<script setup>
const industry = {
  "id": "finance-banking",
  "name": "Finance & Banking",
  "icon": "shield",
  "tagline": "Onboard customers, detect fraud, and pass audits, without the manual grind.",
  "description": "From KYC collection to SOX evidence packs, habits connect your core banking systems, compliance tools, and customer channels with zero custom glue code.",
  "color": "green",
  "departments": [
    {
      "id": "compliance-audit",
      "name": "Finance & Banking Compliance & Audit",
      "icon": "zap",
      "description": "Automate AML screening, SAR filing, audit trail compilation, policy compliance checks, and regulatory report generation.",
      "habits": [
        {
          "id": "aml-screening",
          "name": "AML Screening",
          "description": "Screen transactions against watchlists and sanction databases and flag any matches.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "ai"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        },
        {
          "id": "sar-filing",
          "name": "SAR Filing",
          "description": "Draft Suspicious Activity Reports with AI assistance and route for compliance sign-off.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        },
        {
          "id": "audit-trail-compilation",
          "name": "Audit Trail Compilation",
          "description": "Aggregate system audit logs and assemble evidence packs for upcoming audits.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        },
        {
          "id": "policy-compliance-check",
          "name": "Policy Compliance Check",
          "description": "Verify that internal processes remain aligned with current regulatory requirements.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        },
        {
          "id": "regulatory-reporting",
          "name": "Regulatory Reporting",
          "description": "Generate mandatory periodic reports and submit them to regulatory authorities on schedule.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        },
        {
          "id": "risk-register-update",
          "name": "Risk Register Update",
          "description": "Update the enterprise risk register automatically based on audit findings and alerts.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-compliance-audit"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "finance-banking-compliance-audit"
    },
    {
      "id": "customer-onboarding",
      "name": "Finance & Banking Customer Onboarding",
      "icon": "zap",
      "description": "Automate a full customer application path from intake through ID verification, sanctions screening, and core banking account creation.",
      "habits": [
        {
          "id": "customer-application-onboarding",
          "name": "Customer Application Onboarding",
          "description": "Accept a customer application, create a Sumsub applicant, run ComplyAdvantage sanctions screening, and create the approved client/account in Mambu.",
          "trigger": "manual",
          "bits": [
            "bit-sumsub",
            "bit-complyadvantage",
            "bit-mambu"
          ],
          "featured": true,
          "overview": "A single orchestration habit that turns a submitted banking application into an auditable provider flow. It creates the Sumsub verification session, screens the applicant through ComplyAdvantage, and provisions the approved customer/account in Mambu.\n",
          "flow": [
            "Customer application is submitted from the web or mobile app.",
            "Sumsub creates the applicant and verification access token.",
            "Sumsub verification status is read back into the workflow.",
            "ComplyAdvantage screens the applicant against sanctions, PEP, and warning lists.",
            "Mambu creates the client and deposit account for approved applications."
          ],
          "components": [
            "Customer application intake",
            "Sumsub applicant and access token creation",
            "Sumsub verification status lookup",
            "ComplyAdvantage sanctions screening",
            "ComplyAdvantage normalized decision result",
            "Mambu client creation",
            "Mambu deposit account creation"
          ],
          "integrations": [
            "Customer Application",
            "Habits Workflow",
            "Sumsub ID Verification",
            "ComplyAdvantage Sanctions Screening",
            "Mambu Core Banking"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "kyc-document-collection",
          "name": "KYC Document Collection",
          "description": "Request and validate identity documents from new customers upon application submission.",
          "trigger": "webhook",
          "bits": [
            "bit-sumsub"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "risk-scoring",
          "name": "Risk Scoring",
          "description": "Run automated risk scoring on new applications and flag high-risk cases for review.",
          "trigger": "webhook",
          "bits": [
            "bit-complyadvantage"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "account-creation",
          "name": "Account Creation",
          "description": "Provision customer accounts after approval and trigger the welcome email sequence.",
          "trigger": "webhook",
          "bits": [
            "bit-mambu"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "credit-check",
          "name": "Credit Check",
          "description": "Initiate credit bureau enquiries automatically and parse results into the application record.",
          "trigger": "webhook",
          "bits": [
            "bit-complyadvantage",
            "bit-mambu"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "welcome-sequence",
          "name": "Welcome Sequence",
          "description": "Send personalised onboarding emails to new customers over the first 30 days.",
          "trigger": "scheduler",
          "bits": [
            "bit-mambu"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        },
        {
          "id": "onboarding-status-tracker",
          "name": "Onboarding Status Tracker",
          "description": "Update the CRM automatically at each milestone of the onboarding journey.",
          "trigger": "webhook",
          "bits": [
            "bit-sumsub",
            "bit-complyadvantage",
            "bit-mambu"
          ],
          "stackFolder": "showcase/finance-banking-customer-onboarding"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "finance-banking-customer-onboarding"
    },
    {
      "id": "customer-support",
      "name": "Finance & Banking Customer Support",
      "icon": "zap",
      "description": "Automate support ticket routing, account enquiry handling, dispute resolution, callback scheduling, and escalation management.",
      "habits": [
        {
          "id": "ticket-routing",
          "name": "Ticket Routing",
          "description": "Classify inbound support tickets using AI and route each to the correct team automatically.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        },
        {
          "id": "account-enquiry-handler",
          "name": "Account Enquiry Handler",
          "description": "Resolve common account balance and statement queries instantly without agent involvement.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        },
        {
          "id": "dispute-resolution",
          "name": "Dispute Resolution",
          "description": "Open transaction disputes, notify the customer of next steps, and track resolution progress.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        },
        {
          "id": "callback-scheduling",
          "name": "Callback Scheduling",
          "description": "Book call-back time slots for customers with complex enquiries that need agent handling.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "scheduler"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        },
        {
          "id": "sentiment-analysis",
          "name": "Sentiment Analysis",
          "description": "Score all customer interactions for sentiment and flag persistently negative experiences.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        },
        {
          "id": "escalation-handler",
          "name": "Escalation Handler",
          "description": "Automatically escalate tickets that breach SLA thresholds to senior support staff.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "slack",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-customer-support"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "finance-banking-customer-support"
    },
    {
      "id": "fraud-detection",
      "name": "Finance & Banking Fraud Detection",
      "icon": "zap",
      "description": "Automate real-time transaction monitoring, fraud alert generation, customer notification, account freezing, and regulatory report filing.",
      "habits": [
        {
          "id": "transaction-monitoring",
          "name": "Transaction Monitoring",
          "description": "Analyse incoming transactions in real time using AI and flag statistical anomalies.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        },
        {
          "id": "alert-generation",
          "name": "Alert Generation",
          "description": "Create structured fraud alerts and route them to the investigation team immediately.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "slack",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        },
        {
          "id": "customer-notification",
          "name": "Customer Notification",
          "description": "Notify the customer of suspicious activity via SMS and request confirmation or denial.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "sms",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        },
        {
          "id": "account-freeze",
          "name": "Account Freeze",
          "description": "Automatically freeze the affected account when a confirmed fraud signal is received.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "slack"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        },
        {
          "id": "case-management",
          "name": "Case Management",
          "description": "Open a structured investigation case and assign it to an available analyst.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        },
        {
          "id": "fraud-report-filing",
          "name": "Fraud Report Filing",
          "description": "Compile mandatory fraud reports and submit to the relevant regulatory authority.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-fraud-detection"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "finance-banking-fraud-detection"
    },
    {
      "id": "loan-processing",
      "name": "Finance & Banking Loan Processing",
      "icon": "zap",
      "description": "Automate loan application intake, document verification, credit evaluation, approval routing, and disbursement confirmation.",
      "habits": [
        {
          "id": "application-intake",
          "name": "Application Intake",
          "description": "Receive incoming loan applications via webhook and route to the underwriting queue.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        },
        {
          "id": "document-verification",
          "name": "Document Verification",
          "description": "Validate submitted documents with AI and automatically request any missing items.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        },
        {
          "id": "credit-evaluation",
          "name": "Credit Evaluation",
          "description": "Pull credit bureau data, score the applicant, and produce a structured evaluation summary.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        },
        {
          "id": "approval-routing",
          "name": "Approval Routing",
          "description": "Route approval or decline decisions to the applicant and relevant internal teams.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "slack"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        },
        {
          "id": "disbursement-confirmation",
          "name": "Disbursement Confirmation",
          "description": "Confirm fund disbursement with the bank and notify the customer via SMS and email.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        },
        {
          "id": "status-update-notification",
          "name": "Status Update Notification",
          "description": "Keep applicants informed at every stage of the processing pipeline automatically.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/finance-banking-loan-processing"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "finance-banking-loan-processing"
    }
  ]
}
</script>

<IndustryPage :industry="industry" />
