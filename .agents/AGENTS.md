# Developer Rules & AI Compliance Workflows

To maintain IP hygiene, prevent licensing contamination, and secure proprietary assets, all developers (and AI agents) working on this codebase must adhere to the following workflow adjustments:

1. **Automated Snippet and Dependency Scanning**:
   - All Pull Requests must run automated license checkers (such as Snyk or custom duplication scanners) to verify that AI-generated code snippets do not contain copyleft licenses (like GPL/AGPL) before merging.

2. **Isolate Generative AI Modules**:
   - Encapsulate AI-driven components (e.g., Gemini/OpenAI API integrations, vector retrieval services) inside decoupled modules (e.g., `backend/src/services/gemini.client.ts`).
   - Do not tightly couple AI-generated logic with core business logic or proprietary matching rules.

3. **Telemetry & Training Prohibitions**:
   - Ensure all enterprise API calls and coding assistant configurations (Copilot, Gemini) have telemetry, data collection, and model training **disabled** to prevent proprietary source code or client plans from leaking into public training sets.
