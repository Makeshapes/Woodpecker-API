# Epic 3: Local Data Persistence with SQLite

**Epic Goal**
Replace the application's fragile `localStorage` persistence with a robust, file-based SQLite database. This epic establishes a solid data foundation, ensuring data integrity, persistence across app restarts, and enabling more complex data queries, transforming the application from a temporary-state prototype into a reliable local-first tool.

**Epic Description**
*   **Project Context:**
    *   **Project Type:** Data layer architecture refactor for the Woodpecker-API tool.
    *   **Technology Stack:** SQLite database integration into the existing React application structure. The application logic will eventually run inside an Electron shell.
    *   **Integration Points:** A new data access layer will be created to interface between the application logic and the SQLite database.

*   **Epic Details:**
    *   **What's being created:** A structured SQLite database schema and a data access layer to manage all application data (leads, content, mappings).
    *   **How it integrates:** The existing `leadsStorage.ts` utility and any other `localStorage` calls will be completely replaced with calls to the new data access layer.
    *   **Success criteria:** All application data is successfully stored in and retrieved from a local SQLite file, and data persists reliably between sessions.

---

**Stories**

*   **Story 3.1: SQLite Database Schema & Initialization**
    *   Design and implement the database schema with tables for `imports`, `leads`, `generated_content`, and `app_metadata`.
    *   Implement logic to initialize the database file and create tables on first application launch.

*   **Story 3.2: Backend Data Access Layer (DAL) Implementation**
    *   Create a set of functions (the DAL) that handle all CRUD (Create, Read, Update, Delete) operations for the database tables.
    *   This layer will contain all the raw SQL queries and logic for interacting with `better-sqlite3`.

*   **Story 3.3: Inter-Process Communication (IPC) Bridge**
    *   Implement Electron `ipcMain` handlers in the main process that call the DAL functions.
    *   Create a `preload.ts` script to securely expose the DAL functions to the React frontend (e.g., `window.api.getLeads`).

*   **Story 3.4: Frontend Refactoring to Use New Data Layer**
    *   Rewrite the `src/utils/leadsStorage.ts` file to make asynchronous calls to the new IPC bridge (`window.api`) instead of `localStorage`.
    *   Update any React components that are affected by this change from synchronous `localStorage` to asynchronous database calls.

---

**Compatibility Requirements**
*   The new database schema must accommodate all data fields currently stored in `localStorage`.
*   The frontend application must continue to function with the new asynchronous data layer without any change to the user-facing UI or workflows.

**Risk Mitigation**
*   **Primary Risk:** Data loss for any existing users of the prototype.
    *   **Mitigation:** For this internal tool, the simplest mitigation is to communicate that the database upgrade is a breaking change and `localStorage` data will not be migrated. For a real product, a migration script would be written.
*   **Primary Risk:** Performance degradation due to IPC overhead compared to synchronous `localStorage`.
    *   **Mitigation:** Use the efficient `better-sqlite3` library and ensure queries are optimized. For this scale, performance impact will be negligible.

**Definition of Done**
*   All 4 stories completed with acceptance criteria met.
*   The application no longer uses `localStorage` for any persistent data.
*   All leads, mappings, and generated content are stored in a `leads.db` file in the user's application data directory.
*   Data correctly persists after closing and reopening the application.
*   All existing features (importing, generating, viewing details) work correctly with the new database backend.