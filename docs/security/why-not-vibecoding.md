# Why Not Vibecoding?

Vibecoding, the practice of rapidly generating code through AI-assisted prompts, has revolutionized development speed. However, it comes with a significant security trade-off: **vibecoded code is often vulnerable code**.

## The Problem with Vibecoding

When developers vibecode entire applications, they introduce security risks at multiple levels:

- **Unvalidated inputs** – AI-generated code often lacks proper input sanitization
- **Insecure defaults** – Generated code may use weak configurations or deprecated APIs
- **Missing security controls** – Authentication, authorization, and rate limiting are frequently overlooked
- **Dependency vulnerabilities** – AI suggestions may include outdated or vulnerable packages

## The Habits Approach: Layered Security

Habits takes a pragmatic approach that embraces vibecoding where it's safe while enforcing security where it matters.

### 1. Vibecode the Frontend

Frontend code runs in the user's browser. A sandboxed, untrusted environment by design. Vibecoding frontends is acceptable because:

- The browser enforces security boundaries
- Sensitive operations still require backend validation
- XSS risks can be mitigated through CSP and framework protections

**Habits allows and supports vibecoding for frontend development.**

### 2. Vibecode High-Code Bits with Security Gates

For backend logic, Habits introduces the concept of **Bits**: small, reusable units of functionality. When you vibecode a Bit:

1. **SAST (Static Application Security Testing)**: Source code is scanned for vulnerabilities before packaging
2. **SCA (Software Composition Analysis)**: Dependencies are checked against known vulnerability databases
3. **Partial DAST (Dynamic Application Security Testing)**: Where feasible, runtime behavior is analyzed for security issues

Only after passing these security gates can a Bit be packaged and used.

### 3. Hash-Based Supply Chain Protection

Once a Bit is packed (or an ActivePieces piece is used), **a cryptographic hash is stored**. This hash:

- Ensures the code cannot be tampered with post-validation
- Prevents supply chain attacks where malicious actors replace legitimate nodes
- Provides an immutable audit trail of what was deployed

Any modification to the underlying code would invalidate the hash, blocking execution.

### 4. No-Code/Low-Code Workflow Assembly

The final step is building workflows using a **no-code or low-code approach**. Instead of writing integration logic by hand:

- Pre-validated Bits are connected visually
- Configuration is done through type-safe interfaces
- The attack surface for custom code is minimized

## Attack Surface Analysis

| Attack Vector | Traditional Vibecoding | Habits Approach |
|---------------|----------------------|-----------------|
| Code injection vulnerabilities | High | Low (SAST/SCA gated) |
| Supply chain attacks | High | Mitigated (hash verification) |
| Dependency vulnerabilities | High | Scanned (SCA) |
| Configuration errors | Medium | Low (typed interfaces) |
| Design-level attacks | Medium | **Still a risk** |

## What Remains a Risk

This approach **significantly limits the attack surface for source-code-initiated vulnerabilities**. However, **design-related attacks remain a risk**:

- Business logic flaws in workflow design
- Improper data flow between nodes
- Over-permissioned integrations
- Misconfigured access controls at the orchestration level

These require human review and proper security architecture. No tool can fully automate away design-level security decisions yet.

## Summary

The Habits security model acknowledges that vibecoding is here to stay. Rather than fighting it, we channel it:

1. ✅ **Frontend** – Vibecode freely (sandboxed environment)
2. ✅ **Backend**:
    - ✅ **Bits** – Vibecode with guardrails (SAST, SCA, DAST)
    - ✅ **Packaging** – Hash-locked for supply chain protection
    - ✅ **Workflows** – No-code assembly minimizes attack surface
    - ⚠️ **Design** – Still requires human security review

This layered approach lets you move fast without breaking security.
