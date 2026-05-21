# Public Mode: Security Hardening Guide

This document describes how to safely expose a base instance to the public internet.
The base server has no authentication by default. All dangerous endpoints must be disabled
before public exposure using the environment variables listed below.

## Environment Variables

| Variable | Default | Effect when set to `false` or `0` |
|---|---|---|
| `HABITS_ALLOW_MODULES_INSTALL` | `true` | Disables `POST /api/modules/install` and `POST /api/modules/add`. Prevents anyone from cloning GitHub repos or installing npm packages onto the server. |
| `HABITS_ALLOW_SERVE` | `true` | Disables all `POST /api/serve/start`, `/stop`, `/kill-port`, `/kill-process`, `/openapi` routes. Prevents subprocess spawning and arbitrary process killing. |
| `HABITS_AI_GEN` | `false` | Already guards creator endpoints, but must remain `false` (or unset) in public mode. When `true`, callers can trigger a Claude agent with unrestricted `Bash` tool access. |
| `HABITS_ALLOW_EXPORT` | `true` | Disables `POST /api/export/binary`, `/export/pack/desktop`, `/mobile`, `/docker`, `/habit`, and `GET /api/export/binary/support`. Prevents build tooling (`cargo`, `gradle`, `xcodebuild`, etc.) from being invoked by callers and stops SDK path/version disclosure. |
| `HABITS_ALLOW_EXECUTE` | `true` | Disables `POST /api/execute`. Only disable if you do not need workflow execution on this instance. If execution is the public feature, leave this enabled but add sandboxing. |
| `HABITS_ALLOW_FORMS_AUTH` | `true` | Disables `POST /api/forms/verify-auth` and `/api/forms/populate-options`. Prevents credential-stuffing attacks against connected third-party services. |
| `HABITS_ALLOW_SECURITY_API` | `true` | Disables `GET /api/security/capabilities` and `POST /api/security/generate-policy`. Prevents disclosure of internal package presence. |
| `HABITS_BODY_LIMIT_MB` | `1000` | Sets the JSON body size limit in MB. Set to `1` or `10` in public mode to prevent memory-exhaustion DoS. |
| `HABITS_CORS_ORIGINS` | `*` | Comma-separated list of allowed origins for CORS. Set to your public domain (e.g., `https://example.com`) to prevent cross-origin request forgery from attacker-controlled pages. |

## Recommended Public Mode Configuration

```env
HABITS_ALLOW_MODULES_INSTALL=false
HABITS_ALLOW_SERVE=false
HABITS_AI_GEN=false
HABITS_ALLOW_EXPORT=false
HABITS_ALLOW_EXECUTE=true        # keep true only if execution is the intended feature
HABITS_ALLOW_FORMS_AUTH=false
HABITS_ALLOW_SECURITY_API=false
HABITS_BODY_LIMIT_MB=10
HABITS_CORS_ORIGINS=https://your-public-domain.com
```

## Additional Hardening (not env-var controlled, requires code/infra changes)

- **Security headers**: Add `helmet` middleware (CSP, X-Frame-Options, HSTS, etc.).
- **Rate limiting**: Add per-IP rate limiting on all remaining public endpoints.
- **Reverse proxy**: Place the server behind Caddy or nginx. Do not expose it directly on `0.0.0.0`.
- **TLS termination**: Terminate HTTPS at the reverse proxy layer.
- **Templates directory**: Ensure no `.env` files or secrets exist in the templates directory. The template file server explicitly serves `.env` files by MIME type.
- **Serve status endpoint**: `GET /api/serve/status` leaks PID and filesystem paths. Disable with `HABITS_ALLOW_SERVE=false`.
- **Serve check endpoint**: `GET /api/serve/check` lets callers probe any host port. Disable with `HABITS_ALLOW_SERVE=false`.
