---
title: "Real Estate Automation"
description: "Leads, listings, transactions, and property management, streamlined."
aside: false
---

<script setup>
const industry = {
  "id": "real-estate",
  "name": "Real Estate",
  "icon": "home",
  "tagline": "Leads, listings, transactions, and property management, streamlined.",
  "description": "From the moment a lead fills in a form to the day a tenant renews their lease, habits automate every communication, document, and follow-up.",
  "color": "purple",
  "departments": [
    {
      "id": "lead-management",
      "name": "Real Estate Lead Management",
      "icon": "target",
      "description": "Automate lead capture, AI scoring, agent assignment, follow-up sequences, CRM sync, and cold lead re-engagement.",
      "habits": [
        {
          "id": "lead-capture",
          "name": "Lead Capture",
          "description": "Receive inbound leads from web forms and portal integrations and route to the correct agent.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        },
        {
          "id": "lead-scoring",
          "name": "Lead Scoring",
          "description": "Score each lead automatically using AI based on behaviour, budget signals, and intent data.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "ai",
            "http"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        },
        {
          "id": "agent-assignment",
          "name": "Agent Assignment",
          "description": "Assign leads to the best-matched agent based on territory, specialisation, and current workload.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        },
        {
          "id": "follow-up-sequence",
          "name": "Follow-Up Sequence",
          "description": "Send a personalised 14-day follow-up email sequence to new leads automatically.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "ai"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        },
        {
          "id": "crm-sync",
          "name": "CRM Sync",
          "description": "Push lead status updates and interaction events to the CRM on every touchpoint.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        },
        {
          "id": "cold-lead-re-engagement",
          "name": "Cold Lead Re-engagement",
          "description": "Re-engage leads that have been inactive for 30+ days with fresh market content and AI personalisation.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "ai"
          ],
          "stackFolder": "showcase/real-estate-lead-management"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "real-estate-lead-management"
    },
    {
      "id": "marketing",
      "name": "Real Estate Marketing",
      "icon": "sparkles",
      "description": "Automate campaign launches, social media posting, open house promotion, newsletter distribution, listing performance alerts, and competitor analysis.",
      "habits": [
        {
          "id": "campaign-automation",
          "name": "Campaign Automation",
          "description": "Launch targeted email campaigns automatically when new listings are published or events are created.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "ai"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        },
        {
          "id": "social-media-posting",
          "name": "Social Media Posting",
          "description": "Schedule and post AI-crafted listing highlights across connected social media channels.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "http",
            "ai"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        },
        {
          "id": "open-house-promotion",
          "name": "Open House Promotion",
          "description": "Send automated reminders to registered attendees and track RSVPs for open house events.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        },
        {
          "id": "newsletter-distribution",
          "name": "Newsletter Distribution",
          "description": "Compile local market updates with AI and distribute the newsletter to your subscriber list.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "ai"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        },
        {
          "id": "listing-performance-alert",
          "name": "Listing Performance Alert",
          "description": "Alert the marketing team when a listing is underperforming on views or enquiry metrics.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "slack"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        },
        {
          "id": "competitor-analysis",
          "name": "Competitor Analysis",
          "description": "Monitor competitor listings weekly and produce an AI-generated market intelligence summary.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/real-estate-marketing"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "real-estate-marketing"
    },
    {
      "id": "property-listings",
      "name": "Real Estate Property Listings",
      "icon": "home",
      "description": "Automate listing creation alerts, MLS syndication, price change notifications, expiry reminders, performance reports, and photo review requests.",
      "habits": [
        {
          "id": "listing-creation-alert",
          "name": "Listing Creation Alert",
          "description": "Notify the listings team when a new property is ready to go live and assign preparation tasks.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "slack"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        },
        {
          "id": "mls-syndication",
          "name": "MLS Syndication",
          "description": "Push listing data to MLS and all connected portal platforms automatically on publication.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        },
        {
          "id": "price-change-notification",
          "name": "Price Change Notification",
          "description": "Alert interested buyers automatically when a listing price is reduced.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        },
        {
          "id": "listing-expiry-reminder",
          "name": "Listing Expiry Reminder",
          "description": "Remind the responsible agent 7 days before a listing agreement is due to expire.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        },
        {
          "id": "performance-report",
          "name": "Performance Report",
          "description": "Compile weekly listing performance metrics: views, enquiries, and showings, and distribute to agents.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "ai",
            "email"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        },
        {
          "id": "photo-review-request",
          "name": "Photo Review Request",
          "description": "Automatically request professional photography when a new listing is created in the system.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-listings"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "real-estate-property-listings"
    },
    {
      "id": "property-management",
      "name": "Real Estate Property Management",
      "icon": "wrench",
      "description": "Automate tenant onboarding, maintenance request routing, rent collection alerts, lease renewals, property inspections, and vendor management.",
      "habits": [
        {
          "id": "tenant-onboarding",
          "name": "Tenant Onboarding",
          "description": "Send a structured welcome pack to new tenants, collect documents, and set up building access.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        },
        {
          "id": "maintenance-request-routing",
          "name": "Maintenance Request Routing",
          "description": "Receive tenant maintenance requests and assign them to the appropriate vendor automatically.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        },
        {
          "id": "rent-collection-alert",
          "name": "Rent Collection Alert",
          "description": "Notify tenants 3 days before rent is due and flag overdue payments to the property manager.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        },
        {
          "id": "lease-renewal",
          "name": "Lease Renewal",
          "description": "Send lease renewal offers to tenants 90 days before expiry and track response status.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        },
        {
          "id": "inspection-scheduling",
          "name": "Inspection Scheduling",
          "description": "Book periodic property inspections automatically and send advance notice to tenants.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        },
        {
          "id": "vendor-management",
          "name": "Vendor Management",
          "description": "Track vendor work orders from assignment to completion and release payment on sign-off.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/real-estate-property-management"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "real-estate-property-management"
    },
    {
      "id": "transaction-management",
      "name": "Real Estate Transaction Management",
      "icon": "clipboard",
      "description": "Automate offer tracking, document collection, inspection scheduling, closing coordination, commission calculation, and compliance review.",
      "habits": [
        {
          "id": "offer-tracking",
          "name": "Offer Tracking",
          "description": "Notify all transaction parties instantly when a new offer is received or an existing offer is updated.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "sms"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        },
        {
          "id": "document-collection",
          "name": "Document Collection",
          "description": "Request outstanding transaction documents from all parties and track receipt status.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        },
        {
          "id": "inspection-scheduling",
          "name": "Inspection Scheduling",
          "description": "Coordinate property inspection booking between buyer, seller, and inspector automatically.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "scheduler"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        },
        {
          "id": "closing-coordination",
          "name": "Closing Coordination",
          "description": "Send closing checklists and deadline reminders to all parties as closing day approaches.",
          "trigger": "scheduler",
          "bits": [
            "scheduler",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        },
        {
          "id": "commission-calculation",
          "name": "Commission Calculation",
          "description": "Calculate and route commission splits automatically when a deal reaches closing.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "http",
            "email"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        },
        {
          "id": "compliance-review",
          "name": "Compliance Review",
          "description": "Trigger a structured compliance checklist automatically when a transaction enters the contract stage.",
          "trigger": "webhook",
          "bits": [
            "webhook",
            "email",
            "http"
          ],
          "stackFolder": "showcase/real-estate-transaction-management"
        }
      ],
      "notice": {
        "title": "Tailored to your systems & workflows",
        "text": "Every organization runs differently. Reach out to see how Habits can be up and running in your environment, tailored to your tools, your data, and your team's specific workflows."
      },
      "showcaseSlug": "real-estate-transaction-management"
    }
  ]
}
</script>

<IndustryPage :industry="industry" />
