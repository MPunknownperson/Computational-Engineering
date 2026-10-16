# Archive replacement deployment

Source: https://github.com/MPunknownperson/Computational-Engineering/archive/refs/heads/main.zip

Archive commit: `99a72bc61f764894cc0245552bc2003d29c5ee25`

The archive was downloaded to `/tmp/computational-engineering-main.zip`, checked for path traversal and symlinks, and extracted under `/tmp/computational-engineering-import/`. Application source, public assets, documentation, tests and configuration replace the previous Unpack application. The environment secrets and local PostgreSQL connection were preserved. Dependencies were installed with npm rather than copying the archive's package manifest over the host project's manifest.

## Runtime updates

The imported application was upgraded from Next.js 16.2.6 to 16.4.2 with matching `eslint-config-next` to address the framework's reported security advisories. `source-map-js` was updated to 1.2.2. The source archive's site layout and public routes are retained. The added `tests/cookie-consent.spec.ts` covers the eight managed notices, global settings, feature enablement/withdrawal, GPC, and removal of the previous public workspace APIs.

## Public and private surfaces

The public site is Radix Loom, including its calculators, converters, guides, contact form and privacy controls. The administrative `/api/workbench/*` routes remain disabled unless a server-side `WORKBENCH_API_KEY` of at least 32 bytes is configured, and callers authenticate with it. There is no public shell or software installer.

## Consent changes in this deployment

- The footer Cookie settings button is available globally.
- Visitors outside the managed regions retain the original informational notice, text and dismissal behavior. Their settings panel is opened only on request; the floating vendor icon is not added to their notice.
- The managed notices cover GDPR/UK, California CCPA/CPRA, Brazil, Canada, Australia, Singapore, Japan and India. Optional purposes are off until an explicit accept, reject or save action.
- A notice remains available until a choice is made, including after closing preferences without saving. Browsing does not count as consent. Ordinary browsing and basic calculations stay available under essential-only defaults.
- The v2 consent namespace requires a fresh choice rather than reusing older defaults as affirmative consent.
- Functional preferences govern optional persistent appearance, blackboard notes, saved-formula references, voice session/memory and on-device model learning/cache. Existing saved data is not silently erased on withdrawal; privacy deletion/export controls remain usable.
- GPC restricts advertising/sale-sharing even after an Accept action. No analytics or advertising service is actually installed.
- Only configured trusted edge headers provide authoritative regional signals; the existing browser-timezone fallback is a presentation hint, not proof of residence or an access-control boundary. Unknown locations use conservative optional-storage defaults. See `privacy-operations.md` for edge configuration.

This implementation describes site behavior, not a guarantee of legal compliance. Deployment-specific privacy disclosures and jurisdictional obligations still need operator review.
