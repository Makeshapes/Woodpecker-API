# Woodpecker-API Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Reduce email campaign creation time from 8 hours to 1 hour for 50-lead campaigns
- Achieve 100% personalization rate for all email sends vs current 20%
- Generate positive ROI within 60 days through increased meeting bookings
- Maintain AI content approval rate above 85% without edits
- Support seamless Woodpecker API integration with 99%+ success rate

### Background Context

The Makeshapes sales team faces critical scalability challenges in their email outreach process. Currently, the team spends 4-8 hours manually personalizing campaigns for 50+ leads, resulting in inconsistent quality, format errors, and delayed campaigns. The existing refined Claude prompt template and Woodpecker JSON format specifications provide the foundation for an automated solution that maintains personalization quality while dramatically reducing manual effort.

This internal tool addresses the gap between bulk sending (poor engagement) and manual personalization (doesn't scale) by combining AI-driven content generation with direct API integration to existing Woodpecker campaigns.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-12 | v1.0 | Initial PRD creation | PM Agent |

## Requirements

### Functional Requirements

**FR1:** The system shall import CSV files containing lead data with automatic column mapping and validation for required fields (company, contact name, email, title).

**FR2:** The system shall integrate with Claude API to generate 6-touchpoint email sequences using the existing refined prompt template.

**FR3:** The system shall provide an inline content review interface where users can edit, approve, or reject generated email snippets before export.

**FR4:** The system shall integrate directly with Woodpecker API to add prospects to existing campaigns without manual JSON formatting.

**FR5:** The system shall display imported leads in a filterable list with basic search functionality and batch selection capabilities.

**FR6:** The system shall provide session-based prompt template editing that reverts to default template after use.

**FR7:** The system shall track export status (success/failed/email/timestamp) in SQLite database while purging generated content after export.

**FR8:** The system shall provide retry logic for failed AI generation attempts and API calls.

**FR9:** The system shall validate CSV data quality and report errors for missing required fields before processing.

**FR10:** The system shall support campaign selection from existing Woodpecker campaigns via dropdown interface.

### Non-Functional Requirements

**NFR1:** The system shall process single leads in under 2 minutes from CSV import to Woodpecker export.

**NFR2:** The system shall maintain 99.9% uptime for internal team access during business hours.

**NFR3:** The system shall achieve 99%+ API success rate for Woodpecker imports without formatting errors.

**NFR4:** The system shall support concurrent usage by up to 20 team members without performance degradation.

**NFR5:** The system shall load pages in under 2 seconds and complete AI generation in under 5 seconds per lead.

**NFR6:** The system shall handle CSV files containing up to 1000+ leads in list view without performance issues.

**NFR7:** The system shall implement HTTPS-only communication with API key encryption at rest.

**NFR8:** The system shall provide rate limiting on all endpoints to prevent API quota exhaustion.

## User Interface Design Goals

### Overall UX Vision
Clean, efficient workflow-focused interface that transforms the complex multi-step email personalization process into a simple linear flow: Upload → Generate → Review → Export. The design prioritizes speed and clarity for sales professionals who need to process leads quickly without technical complexity.

### Key Interaction Paradigms
- **Single-page application flow** with clear progress indicators through the 4-step process
- **Batch operations** for processing multiple leads simultaneously with individual review capability
- **Inline editing** for generated content with before/after preview functionality
- **One-click actions** for approve/reject decisions on AI-generated content
- **Drag-and-drop CSV upload** with immediate validation feedback

### Core Screens and Views
- **Dashboard/Import Screen**: CSV upload area with drag-and-drop, validation results, and import progress
- **Lead List View**: DataTable with filtering, search, and batch selection using ShadCN components  
- **Content Generation View**: AI generation interface with loading states and retry options
- **Review/Edit Interface**: Split-pane view showing original lead data and generated content with inline editing
- **Export Status Screen**: Campaign selection dropdown and export progress with success/failure tracking

### Accessibility: WCAG AA
Meeting WCAG AA standards for keyboard navigation, screen reader compatibility, and color contrast to ensure usability for all team members.

### Branding
Minimal, professional styling using ShadCN UI's default design system. Focus on functionality over visual branding since this is an internal productivity tool.

### Target Device and Platforms: Web Responsive
Desktop-first responsive design optimized for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ on Windows 10+ and macOS 10.14+. Mobile support for basic review/approval tasks.

## Technical Assumptions

### Repository Structure: Monorepo
Single repository with separate packages for frontend and backend, following the brief's preference for unified development and deployment.

### Service Architecture
**Two-Phase Architecture:**
- **Phase 1**: Simple client-server with frontend directly calling external APIs (Claude, Woodpecker) for rapid prototyping
- **Phase 2**: Backend proxy pattern where Express server handles all external API calls for security and rate limiting

### Testing Requirements
**Unit + Integration Testing:**
- Frontend: Component testing with React Testing Library and Vitest
- Backend: API endpoint testing with Jest/Supertest 
- Integration: End-to-end workflow testing with Playwright for critical user paths

### Additional Technical Assumptions and Requests

**Frontend Stack (Decided):**
- Vite + React + TypeScript for type safety and rapid development
- Tailwind CSS + ShadCN UI for consistent, professional styling
- Zustand or React Context for state management
- React Hook Form for CSV upload and content editing forms

**Backend Stack (Decided):**
- Node.js + Express for API proxy and database operations
- SQLite with persistent volume for minimal database requirements
- Environment-based configuration for API keys and settings

**Deployment Architecture (Decided):**
- Docker Compose setup following Postiz deployment pattern
- DigitalOcean droplet deployment with GitHub Actions CI/CD
- Internal network access only (no public authentication required)
- HTTPS with Let's Encrypt for secure API communication

**External API Integration:**
- Claude API: Direct frontend integration in Phase 1, backend proxy in Phase 2
- Woodpecker API: Rate limiting consideration (100 requests/minute)
- Retry logic with exponential backoff for failed API calls

**Data Management:**
- SQLite for export tracking only (success/failed/email/timestamp)
- No persistent storage of generated content (purged after export)
- CSV processing entirely in-memory for performance

**Security Requirements:**
- API keys stored as environment variables
- Rate limiting on all endpoints to prevent quota exhaustion  
- Input validation for CSV data and user-generated content
- HTTPS-only communication for all external API calls

## Epic List

**Epic 1: Foundation & Core Workflow (Phase 1)**
Establish project infrastructure, CSV import functionality, and basic AI-powered content generation with direct API integration.

**Epic 2: Content Review & Export Integration (Phase 1)**  
Build the content review interface, inline editing capabilities, and direct Woodpecker API integration for seamless prospect addition to existing campaigns.

**Epic 3: Backend Infrastructure & Security (Phase 2)**
Implement backend proxy server, move API calls from frontend to secure backend, and add comprehensive error handling and logging.

**Epic 4: Data Persistence & Production Deployment (Phase 2)**
Add SQLite database for export tracking, implement deployment infrastructure, and establish production-ready monitoring and maintenance procedures.

## Epic 1 - Foundation & Core Workflow

**Epic Goal:** Establish project infrastructure with Vite + React + ShadCN UI, implement CSV import with validation, create lead list management interface, and integrate Claude AI for 6-touchpoint email sequence generation. This epic delivers a working prototype that can import leads and generate personalized content, providing immediate value for testing and iteration.

### Story 1.1 Project Setup & Basic UI Layout
**As a** developer,
**I want** to set up the foundational project structure with all required dependencies,
**so that** the team has a consistent development environment and UI framework ready for feature development.

**Acceptance Criteria:**
1. Vite + React + TypeScript project initialized with proper folder structure
2. Tailwind CSS and ShadCN UI components installed and configured
3. Basic application layout with header, navigation, and main content areas
4. Development server runs successfully with hot reloading
5. ESLint and Prettier configured for code consistency
6. Basic routing structure established using React Router
7. Environment variable configuration setup for API keys

### Story 1.2 CSV Import & Validation Interface
**As a** sales team member,
**I want** to upload CSV files containing lead data with automatic validation,
**so that** I can quickly import my prospect lists and identify any data quality issues before processing.

**Acceptance Criteria:**
1. Drag-and-drop CSV upload component implemented using ShadCN UI
2. Automatic column mapping detects standard fields (company, contact name, email, title)
3. Data validation identifies missing required fields and displays clear error messages
4. Upload progress indicator shows file processing status
5. Preview of imported data displays in a table format before confirmation
6. Support for CSV files up to 1000 leads without performance degradation
7. Clear success/failure feedback with actionable error messages

### Story 1.3 Lead List Management & Display
**As a** sales team member,
**I want** to view and manage my imported leads in an organized, searchable list,
**so that** I can easily navigate through prospects and select specific leads for content generation.

**Acceptance Criteria:**
1. Lead data displayed using ShadCN DataTable component with sorting capabilities
2. Search functionality filters leads by company name, contact name, or email
3. Batch selection checkboxes enable multi-lead operations
4. Lead count and status indicators show total imported vs. processed leads
5. Individual lead detail view shows all available prospect information
6. Filter options for company, title, or processing status
7. Pagination or virtualization handles large lead lists (1000+) efficiently

### Story 1.4 Claude AI Integration & Content Generation
**As a** sales team member,
**I want** to generate personalized 6-touchpoint email sequences using AI,
**so that** I can create high-quality, customized outreach content without manual writing.

**Acceptance Criteria:**
1. Claude API integration configured with environment variable API key management
2. Existing refined prompt template loaded and used for content generation
3. Generate 6-touchpoint email sequence for selected leads
4. Loading states and progress indicators during AI content generation
5. Retry logic implemented for failed generation attempts with user feedback
6. Generated content displays in structured format (touchpoint 1-6)
7. Rate limiting prevents API quota exhaustion with user notifications
8. Error handling for API failures with clear user guidance

## Epic 2 - Content Review & Export Integration

**Epic Goal:** Complete the end-to-end user workflow by building the content review interface with inline editing capabilities, implementing direct Woodpecker API integration for adding prospects to existing campaigns, and establishing session-based prompt template management. This epic delivers a fully functional MVP that transforms the manual email personalization process into an automated workflow.

### Story 2.1 Content Review & Editing Interface
**As a** sales team member,
**I want** to review and edit AI-generated email content before exporting,
**so that** I can ensure the messaging aligns with my voice and addresses specific prospect needs.

**Acceptance Criteria:**
1. Split-pane interface displays lead data alongside generated 6-touchpoint content
2. Inline editing functionality for each email touchpoint with rich text support
3. Before/after preview shows original AI content vs. user modifications
4. Individual approve/reject buttons for each touchpoint with bulk operations
5. Content validation ensures edited text maintains required formatting
6. Undo/redo functionality for content modifications
7. Progress indicators show review completion status across selected leads
8. Save draft functionality preserves work-in-progress during session

### Story 2.2 Woodpecker API Integration & Campaign Management
**As a** sales team member,
**I want** to add approved prospects directly to existing Woodpecker campaigns,
**so that** I can seamlessly integrate AI-generated content into my established outreach workflows.

**Acceptance Criteria:**
1. Woodpecker API integration configured with environment variable API key
2. Dropdown interface displays existing Woodpecker campaigns for selection
3. JSON formatting automatically converts approved content to Woodpecker format
4. Batch export functionality adds multiple prospects to selected campaign simultaneously
5. Real-time export progress tracking with individual success/failure status
6. Error handling for API failures with retry options and clear user feedback
7. Validation prevents duplicate prospect additions to same campaign
8. Export confirmation dialog summarizes prospects being added and target campaign

### Story 2.3 Session-Based Prompt Template Management
**As a** sales team member,
**I want** to customize the AI prompt template for specific campaigns or industries,
**so that** I can fine-tune content generation without permanently altering the default template.

**Acceptance Criteria:**
1. Template editor interface allows modification of Claude prompt during session
2. Default template loads automatically from configuration on application start
3. Session-based changes persist only during current browser session
4. Template preview shows current prompt structure and key variables
5. Reset button restores default template settings instantly
6. Template validation ensures required variables remain intact
7. Template changes apply to subsequent AI generation requests immediately
8. Session storage manages template state without backend persistence

### Story 2.4 End-to-End Workflow Integration & Testing
**As a** sales team member,
**I want** to complete the entire process from CSV import to Woodpecker export in a single session,
**so that** I can validate the complete workflow and identify any integration issues.

**Acceptance Criteria:**
1. State management preserves data flow from import → generation → review → export
2. Navigation between workflow steps maintains progress and data integrity
3. Comprehensive error handling covers all integration points with user-friendly messages
4. Performance optimization ensures smooth operation with 50+ lead batches
5. Success confirmation displays export summary with campaign details and prospect count
6. Complete workflow tested with real CSV data and live Woodpecker API
7. User feedback collection mechanism captures usability issues and suggestions
8. Documentation updated with complete user workflow instructions

## Epic 3 - Backend Infrastructure & Security

**Epic Goal:** Implement secure backend infrastructure by creating an Express server that proxies all external API calls, moving Claude and Woodpecker integrations from frontend to backend for enhanced security and rate limiting. This epic transforms the Phase 1 prototype into a production-ready architecture with proper API key management and comprehensive error handling.

### Story 3.1 Express Backend Server Setup & API Routing
**As a** developer,
**I want** to establish a Node.js Express backend server with RESTful API routes,
**so that** external API calls can be securely handled server-side with proper authentication and rate limiting.

**Acceptance Criteria:**
1. Express server initialized with TypeScript and proper project structure
2. RESTful API routes established for all frontend-to-backend communication
3. Environment variable configuration for API keys and server settings
4. CORS configuration allows frontend requests while maintaining security
5. Request/response logging middleware for debugging and monitoring
6. Health check endpoint provides server status and dependency verification
7. Error handling middleware provides consistent error response format
8. Server startup script with proper error handling and graceful shutdown

### Story 3.2 Claude API Proxy & Rate Limiting
**As a** sales team member,
**I want** Claude API calls to be handled securely through the backend,
**so that** API keys remain protected and rate limiting prevents quota exhaustion.

**Acceptance Criteria:**
1. Backend endpoint proxies Claude API requests with secure API key handling
2. Rate limiting implemented to respect Claude API quotas and prevent overuse
3. Request queuing system manages concurrent AI generation requests
4. Retry logic with exponential backoff handles temporary API failures
5. Response caching for identical requests reduces API usage and improves performance
6. Frontend updated to call backend endpoints instead of direct Claude API
7. Error handling provides meaningful feedback for API failures and quota limits
8. Monitoring logs track API usage, success rates, and error patterns

### Story 3.3 Woodpecker API Proxy & Integration Security
**As a** sales team member,
**I want** Woodpecker API integration to be handled through secure backend endpoints,
**so that** campaign data and API credentials are protected while maintaining seamless export functionality.

**Acceptance Criteria:**
1. Backend endpoint securely handles all Woodpecker API communication
2. Campaign retrieval endpoint fetches existing campaigns for dropdown selection
3. Prospect addition endpoint handles batch exports with proper error handling
4. API key encryption at rest protects Woodpecker credentials
5. Request validation ensures data integrity before sending to Woodpecker API
6. Duplicate detection prevents adding same prospect to same campaign multiple times
7. Frontend updated to use backend endpoints for all Woodpecker operations
8. Comprehensive logging tracks export attempts, successes, and failures

### Story 3.4 Enhanced Error Handling & Logging Infrastructure
**As a** developer and sales team member,
**I want** comprehensive error handling and logging throughout the application,
**so that** issues can be quickly diagnosed and resolved without disrupting user workflows.

**Acceptance Criteria:**
1. Centralized error handling captures and categorizes all application errors
2. Structured logging provides detailed information for debugging and monitoring
3. User-friendly error messages hide technical details while providing actionable guidance
4. Error recovery mechanisms automatically retry failed operations where appropriate
5. Frontend error boundaries prevent application crashes from unhandled errors
6. Backend error middleware provides consistent error response format
7. Log rotation and storage management prevents disk space issues
8. Error tracking dashboard helps identify patterns and recurring issues

## Epic 4 - Data Persistence & Production Deployment

**Epic Goal:** Complete the production-ready application by implementing SQLite database for export tracking, establishing Docker-based deployment infrastructure following the Postiz pattern, and creating monitoring and maintenance procedures. This epic delivers a fully deployed, production-ready internal tool with data persistence and operational reliability.

### Story 4.1 SQLite Database & Export Tracking Implementation
**As a** sales team member,
**I want** the system to track my export history and prevent duplicate additions,
**so that** I can avoid accidentally adding the same prospects to campaigns multiple times and review my past export activities.

**Acceptance Criteria:**
1. SQLite database schema designed for export tracking (success/failed/email/timestamp)
2. Database initialization scripts create required tables and indexes
3. Export tracking records all Woodpecker API attempts with detailed status information
4. Duplicate detection prevents same email from being added to same campaign
5. Export history interface displays past exports with filtering and search capabilities
6. Database queries optimized for performance with large export volumes
7. Data retention policy automatically purges old export records after specified period
8. Database backup and recovery procedures documented and tested

### Story 4.2 Frontend-Backend Integration & Data Flow
**As a** sales team member,
**I want** the frontend to seamlessly communicate with the backend for all data operations,
**so that** I can use the application without noticing the underlying architecture changes.

**Acceptance Criteria:**
1. Frontend API client configured to communicate with backend endpoints
2. State management updated to handle asynchronous backend operations
3. Loading states and progress indicators reflect backend processing times
4. Error handling gracefully manages backend connectivity issues
5. Data synchronization ensures frontend state matches backend database
6. Session management maintains user context across frontend-backend communication
7. Performance optimization minimizes API calls and data transfer
8. Offline detection provides user feedback when backend is unavailable

### Story 4.3 Docker Compose Infrastructure & Environment Configuration
**As a** developer,
**I want** to deploy the application using Docker Compose with proper environment management,
**so that** the deployment is consistent, reproducible, and follows established infrastructure patterns.

**Acceptance Criteria:**
1. Docker Compose configuration defines frontend, backend, and database services
2. Environment variable management secures API keys and configuration settings
3. Persistent volume configuration ensures SQLite database survives container restarts
4. Service dependencies and health checks ensure proper startup sequence
5. Development and production environment configurations separated appropriately
6. Container resource limits prevent excessive memory or CPU usage
7. Logging configuration captures application and infrastructure logs centrally
8. Docker image optimization reduces build times and deployment size

### Story 4.4 DigitalOcean Deployment & CI/CD Pipeline
**As a** Makeshapes team member,
**I want** the application automatically deployed to DigitalOcean with CI/CD integration,
**so that** updates are seamlessly deployed and the tool is reliably accessible for internal use.

**Acceptance Criteria:**
1. DigitalOcean droplet configured following established Postiz deployment pattern
2. GitHub Actions workflow automates deployment on push to main branch
3. HTTPS configuration with Let's Encrypt provides secure access
4. Internal network access controls restrict usage to authorized team members
5. Monitoring and alerting notify team of deployment failures or system issues
6. Backup procedures protect SQLite database and application configuration
7. Rollback procedures enable quick recovery from failed deployments
8. Documentation provides clear instructions for maintenance and troubleshooting