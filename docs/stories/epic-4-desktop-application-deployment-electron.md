# Epic 4: Desktop Application Deployment with Electron

**Epic Goal**
Transform the web application into a secure, self-contained, and easily distributable macOS desktop application using Electron. This epic involves creating the Electron application shell, moving all external API communications (Claude, Woodpecker) to the secure backend (main process) to protect API keys, and packaging the final product into a simple `.dmg` installer for the Head of Sales.

**Epic Description**
*   **Project Context:**
    *   **Project Type:** Architecture transformation from a web app prototype to a distributable desktop application.
    *   **Technology Stack:** Electron, Electron Builder.
    *   **Integration Points:** The Electron `main` process will act as the application's backend, handling the database, window management, and secure proxying of API calls.

*   **Epic Details:**
    *   **What's being created:** A native macOS desktop application package (`.dmg`).
    *   **How it integrates:** The React application will run inside an Electron "renderer" process, communicating with the secure "main" process for data and external API calls.
    *   **Success criteria:** The application is successfully packaged and runs on an M1 Mac from a single `.dmg` file, with all API keys secured on the backend.

---

**Stories**

*   **Story 4.1: Electron Shell & Development Workflow Setup**
    *   Integrate Electron into the project structure.
    *   Create the main entry point (`electron/main.ts`) to manage the application lifecycle and browser window.
    *   Configure the development environment to run the Vite server and Electron app concurrently for a smooth developer experience.

*   **Story 4.2: Secure Claude API Proxy**
    *   Migrate the `claudeService.ts` logic from the frontend to the Electron `main` process.
    *   Store the `VITE_CLAUDE_API_KEY` securely as an environment variable accessible only by the `main` process.
    *   Create an IPC channel for the frontend to request content generation from the backend.

*   **Story 4.3: Secure Woodpecker API Proxy**
    *   Migrate the `woodpeckerService.ts` logic from the frontend to the `main` process.
    *   Secure the `VITE_WOODPECKER_API_KEY` in the backend.
    *   Create IPC channels for fetching campaigns and exporting prospects.

*   **Story 4.4: Production Build & macOS Packaging**
    *   Configure `electron-builder` to produce a universal macOS `.dmg` file compatible with both Intel and M1/M2 Apple Silicon chips.
    *   Implement application icon branding.
    *   (Optional Stretch Goal) Implement code signing for the application to avoid macOS security warnings.

---

**Compatibility Requirements**
*   The final application must run on macOS, specifically on an M1 MacBook Air.
*   All functionality from Epic 3 must be retained and operate correctly within the Electron environment.

**Risk Mitigation**
*   **Primary Risk:** Complexity of setting up the Electron build and development environment.
    *   **Mitigation:** Follow established patterns using `vite-plugin-electron` to simplify the integration between Vite and Electron.
*   **Primary Risk:** User has trouble installing or running the application.
    *   **Mitigation:** Create a universal `.dmg` package, which is the standard and most intuitive installation method on macOS. Provide simple, clear instructions.

**Definition of Done**
*   All 4 stories completed with acceptance criteria met.
*   The application is packaged into a single `.dmg` file.
*   The application installs and runs correctly on a target M1 Mac.
*   All Claude and Woodpecker API keys have been removed from the frontend codebase and are managed exclusively by the Electron `main` process.
*   All application features, including data persistence from Epic 3, are fully functional in the final desktop app.