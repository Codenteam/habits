# Cloud File Upload - TODO

## Required Environment Variables

Before running this showcase, set the following environment variables:

```bash
# Google Drive OAuth2 credentials
export GOOGLE_DRIVE_CLIENT_ID="your-google-client-id"
export GOOGLE_DRIVE_CLIENT_SECRET="your-google-client-secret"
```

Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

## Current Implementation
- [x] Google Drive upload

## Planned Features
- [ ] Add Dropbox upload (using @ha-bits/bit-dropbox)
- [ ] Add OneDrive upload (using @ha-bits/bit-onedrive)
- [ ] Make uploads parallel (all three services at once)
- [ ] Add error handling for partial failures
- [ ] Return consolidated results from all services

## Workflow Design (Target State)
```
                    ┌─────────────────┐
                    │  HTTP Trigger   │
                    │  (file input)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Google    │  │  Dropbox   │  │  OneDrive  │
     │  Drive     │  │  Upload    │  │  Upload    │
     └────────────┘  └────────────┘  └────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Merge Results   │
                    │ (script node)   │
                    └─────────────────┘
```

## Notes
- Each cloud service requires its own OAuth authentication
- Use `application.scheme` in stack.yaml for Tauri OAuth deep links
- All three bits are L2 bits that replace the common @ha-bits/bit-file-hosting base
