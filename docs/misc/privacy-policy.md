# Privacy Policy

**Last Updated: March 1, 2026**

This Privacy Policy describes how Habits ("we," "us," or "our") handles information when you use our open-source software and services.

## Overview

Habits is an open-source project licensed under Apache 2.0. We are committed to protecting your privacy and being transparent about our data practices.

## Information We Do Not Collect

Habits is designed with privacy in mind:

- **No Telemetry**: Habits does not send telemetry, usage data, or analytics to any external servers by default
- **No Account Required**: You can use Habits without creating an account
- **Local Processing**: All workflow execution happens locally on your device.
- **No Tracking**: We do not track your usage patterns or behavior

## Information You May Share

### When Using Habits Locally

When running Habits locally (via `npx habits` or desktop app):
- All data stays on your local machine
- Workflows and configurations are stored in your local file system
- No data is transmitted to external servers unless your workflow explicitly connects to external APIs

### When Using External Services

Your workflows may connect to external services (APIs, databases, AI providers). In these cases:
- Data is sent directly from your machine to those services
- We do not proxy or intercept this data
- Review the privacy policies of any external services you integrate

## Open Source Transparency

As an Apache 2.0 licensed project:
- Our source code is publicly available for inspection
- You can verify our privacy claims by reviewing the codebase
- Community contributions are welcome and reviewed for security

## Data Security

When using Habits:
- **Local Data**: Secured by your operating system's file permissions
- **API Keys**: Stored locally in your configuration files; we recommend using environment variables
- **Workflow Data**: Processed in memory during execution; persisted only where you specify

## Third-Party Integrations

Habits supports various integrations (bits). When using these:
- Each bit may connect to external services
- Review individual bit documentation for specific data handling
- Configure credentials securely using environment variables

## Children's Privacy

Habits is developer tooling not directed at children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this Privacy Policy. Changes will be documented in:
- This page with updated date
- Release notes for significant changes
- GitHub repository commits

## Contact

For privacy-related questions:
- Open an issue on [GitHub](https://github.com/codenteam/habits)
- Email: privacy@codenteam.com

## Your Rights

Depending on your jurisdiction, you may have rights regarding your personal data. Since Habits processes data locally by default, you maintain full control over your data.

---

**Summary**: Habits respects your privacy by processing data locally and not collecting telemetry. Your data stays under your control.
