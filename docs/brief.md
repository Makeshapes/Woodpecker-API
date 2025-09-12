# Project Brief: Makeshapes Internal Sales Tool

## Executive Summary

The Makeshapes Internal Sales Tool is an internal Vite + React application for the Makeshapes sales team to automate email campaign personalization. Using our refined Claude prompt template, the tool imports CSV leads, generates 6-touchpoint sequences, enables quick review/editing, and adds prospects directly to existing Woodpecker campaigns via API. This internal tool will be operational in 3-5 days, transforming hours of manual work into minutes of automated workflow for our sales team.

## Problem Statement

The Makeshapes sales team currently faces significant challenges in creating personalized email campaigns at scale. Our current process involves manually copying lead data from spreadsheets, individually crafting personalized messages for each prospect, and then formatting this data to add to existing Woodpecker campaigns. This manual process results in:

- **Time inefficiency**: 5-10 minutes per lead for proper personalization, making campaigns of 50+ leads take 4-8 hours
- **Inconsistent quality**: Message quality varies based on writer fatigue and time constraints
- **Format errors**: Manual JSON formatting for API imports frequently causes failures and requires technical expertise
- **Context loss**: Important lead information gets overlooked when working through large lists
- **Delayed campaigns**: The friction of manual personalization causes teams to delay or skip outreach opportunities

Existing solutions either provide bulk sending without personalization (resulting in poor engagement) or require extensive manual work that doesn't scale. There's a critical need for a tool that combines the efficiency of automation with the quality of personalized outreach.

## Proposed Solution

A focused Vite + React application built with existing components that leverages our refined Claude prompt template for consistent, high-quality email generation. The solution builds on work already completed:

**Already Built:**
- Refined Claude prompt template with 6-touchpoint structure
- Woodpecker JSON format specifications
- CSV column mapping requirements

**Key Components:**
- **Tech Stack**: Vite + React + Tailwind CSS + ShadCN UI components
- **Simple workflow**: Import CSV → Generate with Claude → Review/Edit → Export to Woodpecker
- **Direct Woodpecker API integration**: No manual JSON handling
- **Export tracking**: Database storage of all exported campaigns for duplicate prevention

## Target Users

### Primary User Segment: Makeshapes Sales Team Members

**Profile:**
- Age: 22-35 years old
- Experience: 6 months to 3 years in sales
- Tech comfort: Moderate to high
- Team size: Part of 5-20 person SDR teams

**Current Workflow:**
- Receive lead lists from marketing or sales ops
- Research each prospect on LinkedIn and company websites
- Draft personalized outreach messages
- Input into CRM or email automation tool
- Track responses and engagement

**Specific Needs:**
- Faster personalization without sacrificing quality
- Easy-to-use tools that don't require technical knowledge
- Ability to maintain their voice and style
- Quick iteration on messaging that's not performing

**Goals:**
- Meet or exceed monthly qualified meeting quotas
- Increase email response rates above 5-10%
- Spend more time on high-value activities (calls, demos)
- Build pipeline efficiently

### Secondary User Segment: Makeshapes Sales Manager

**Profile:**
- Age: 28-45 years old
- Experience: 3-8 years in marketing operations
- Tech comfort: High, familiar with marketing automation platforms
- Responsibility: Managing campaign execution and performance

**Current Workflow:**
- Coordinate with sales on target account lists
- Set up campaigns in automation platforms
- Monitor campaign performance metrics
- Troubleshoot technical issues with imports/exports
- Report on campaign effectiveness

**Specific Needs:**
- Reliable data import/export without errors
- Visibility into content being sent
- Ability to enforce brand guidelines
- Campaign performance tracking

**Goals:**
- Reduce campaign setup time by 75%
- Maintain consistent brand voice across all outreach
- Improve overall campaign engagement metrics
- Minimize technical support requests from sales team

## Goals & Success Metrics

### Business Objectives
- Reduce email campaign creation time from 8 hours to 1 hour for 50-lead campaigns
- Increase email personalization rate from 20% to 100% of sends
- Achieve 15%+ average email open rates within first quarter
- Generate positive ROI within 60 days through increased meeting bookings
- Scale to support 100+ concurrent users by end of Year 1

### User Success Metrics
- Time to process single lead: Under 2 minutes
- User satisfaction score (CSAT): 4.5+ out of 5
- Feature adoption rate: 80% of users utilizing AI generation
- Content approval rate: 85% of AI-generated content approved without edits
- User retention: 90% monthly active user retention after 3 months

### Key Performance Indicators (KPIs)
- **Campaign Creation Speed**: Average time from CSV upload to Woodpecker export (target: <60 minutes for 50 leads)
- **AI Content Quality Score**: Percentage of snippets approved without edits (target: >85%)
- **API Success Rate**: Successful Woodpecker imports without errors (target: >99%)
- **User Engagement**: Daily active users / Monthly active users ratio (target: >40%)
- **System Uptime**: Application availability (target: 99.9%)

## MVP Scope

### Core Features (Must Have)
- **CSV Import & Validation:** Parse lead data with automatic column mapping, data validation, and error reporting for missing required fields
- **Lead List Management:** Display imported leads with filtering by company, basic search functionality, and selection for batch operations
- **Claude AI Integration:** Generate 6-snippet email sequences using existing refined prompt template with retry logic
- **Content Review Interface:** Display generated snippets with inline editing capability, before/after preview, and approve/reject functionality
- **Direct Woodpecker API Integration:** Add prospects directly to existing campaigns via API with error handling
- **Minimal Data Persistence:** SQLite database storing only export status (success/failed/email/timestamp) - generated content is purged
- **Prompt Template Management:** Default template with session-based editing (reverts to default after use)

### Out of Scope for MVP
- User authentication (self-hosted, internal access)
- Campaign performance tracking and analytics
- A/B testing functionality
- Competitive analysis features
- Advanced template library management
- Bulk regeneration of content
- Email scheduling features
- CRM integrations beyond Woodpecker
- Advanced formatting options (images, attachments)
- Content persistence (all generated content is purged)

### Phase 1 Success Criteria (Frontend + External API Testing)

**Epic 1.1 Complete:** Basic UI and CSV import working
**Epic 1.2 Complete:** Content generation with Claude API functional  
**Epic 1.3 Complete:** Woodpecker integration and end-to-end workflow tested

**Deliverable:** Fully functional tool with real API integrations (no persistence)

### Phase 2 Success Criteria (Backend Connection + Persistence)

**Epic 2.1 Complete:** Backend proxy server handling all API calls
**Epic 2.2 Complete:** Database persistence for export tracking
**Epic 2.3 Complete:** Production deployment on DigitalOcean

**Deliverable:** Production-ready tool with persistence and secure architecture

## Post-MVP Vision

### Phase 2 Features (Backend Connection)

- Persistent prompt template management
- Export history tracking and filtering
- Enhanced error handling and logging
- Batch operations for multiple leads
- Database-backed duplicate detection

### Future Considerations (Optional)

- Template library for different industries
- Bulk regeneration for specific leads
- Advanced analytics on export success rates
- A/B testing different prompt variations

## Technical Considerations

### Platform Requirements
- **Target Platforms:** Web-based application (desktop-first design)
- **Browser/OS Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ on Windows 10+, macOS 10.14+
- **Performance Requirements:** <2 second page loads, <5 second AI generation per lead, support for 1000+ leads in list view

### Technology Stack (Decided)
- **Frontend:** Vite + React + TypeScript + Tailwind CSS + ShadCN UI
- **Backend:** Node.js with Express (simple API for Claude/Woodpecker calls)
- **Database:** SQLite with persistent volume (like your Postiz setup)
- **Deployment:** Docker Compose + DigitalOcean (following your Postiz pattern)
- **CI/CD:** GitHub Actions auto-deploy on push to main
- **Authentication:** None needed (self-hosted, internal network access only)

### Architecture Considerations
- **Repository Structure:** Monorepo with separate packages for frontend/backend or two separate repositories with shared types package
- **Service Architecture:** Simple client-server for MVP, potential microservices for AI processing and API integrations post-MVP
- **Integration Requirements:** Claude API (required), Woodpecker API (Phase 2), potential webhooks for real-time updates
- **Security/Compliance:** HTTPS only, API key encryption at rest, rate limiting on all endpoints, GDPR-compliant data handling

## Constraints & Assumptions

### Constraints
- **Budget:** Minimal - using existing API keys and infrastructure
- **Timeline:** Two phases - Frontend + API testing, then Backend connection
- **Resources:** Single developer with existing refined prompt template
- **Technical:** Claude API rate limits, Woodpecker API quotas (100 requests/minute)

### Key Assumptions
- Users have access to clean CSV exports from their lead generation tools
- Claude API will maintain consistent quality for email generation use case
- Woodpecker's JSON import format will remain stable
- Users have basic technical competence to handle CSV files and copy/paste JSON
- Internet connectivity is reliable for API calls
- 80% of use cases will involve fewer than 100 leads per campaign

## Risks & Open Questions

### Key Risks
- **API Dependency:** Claude API downtime or quality degradation would break core functionality (Impact: Critical)
- **Data Quality:** Poor quality input CSVs could result in poor output quality (Impact: High)
- **Scalability:** SQLite may not handle concurrent users well (Impact: Medium for MVP)
- **Cost Overruns:** Claude API costs could exceed budget with heavy usage (Impact: Medium)
- **Adoption Friction:** Users may resist trusting AI for customer communication (Impact: High)

### Open Questions
- What's the optimal prompt structure for consistent, high-quality email generation?
- Should we implement retry logic for failed AI generation attempts?
- How should we handle duplicate leads across different campaigns?
- What level of customization should users have over AI prompts?
- Should generated content be stored permanently or purged after export?

### Areas Needing Further Research
- Woodpecker API rate limits and bulk import best practices (you have the docs)
- Claude API retry logic best practices
- Performance benchmarks for handling large CSV imports (1000+ leads)
- SQLite optimization for concurrent read/write operations

## Appendices

### A. Research Summary

Based on Makeshapes internal needs:
- Current manual process takes 4-8 hours for 50-lead personalization
- Team has refined Claude prompt template that generates quality content
- Woodpecker API documentation available for direct integration
- 4-user team needs simple, reliable tool without complexity
- Self-hosted approach matches existing Postiz deployment pattern

### C. References

- [Woodpecker API Documentation](https://woodpecker.co/api-docs)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Email Personalization Statistics 2024](https://www.campaignmonitor.com/resources/guides/email-marketing-benchmarks/)
- [Sales Development Benchmark Report](https://www.bridge-group.com/sdr-metrics)

## Next Steps

### Immediate Actions

**Phase 1: Frontend + External API Testing**

**Epic 1.1: Project Setup & Core UI**
1. Set up Vite + React + Tailwind + ShadCN UI project
2. Create basic layout with navigation and main sections
3. Build CSV import component with file upload and validation
4. Create lead list display with ShadCN DataTable and filtering

**Epic 1.2: Content Generation & Review**
5. Integrate Claude API directly from frontend using existing prompt template
6. Build content generation UI with loading states and retry logic
7. Design review/edit interface with ShadCN Card components
8. Add inline editing capabilities for generated snippets

**Epic 1.3: Export Integration & Testing**
9. Add Woodpecker API integration for adding prospects to existing campaigns
10. Connect all UI components with proper state management
11. Add error handling and user feedback for API failures
12. Test complete end-to-end workflow with real data (no persistence)

**Phase 2: Backend Connection + Database**

**Epic 2.1: Backend Infrastructure**
13. Set up Express backend server with API routes
14. Move Claude API calls from frontend to backend (proxy pattern)
15. Move Woodpecker API calls to backend for security

**Epic 2.2: Database & Persistence**
16. Add SQLite database for export status tracking
17. Connect frontend to backend endpoints
18. Implement export history viewing and filtering

**Epic 2.3: Deployment & Production**
19. Implement Docker Compose setup
20. Add environment configuration and secrets management
21. Deploy to DigitalOcean following Postiz deployment pattern

### Docker Deployment Setup (Following Postiz Pattern)

**Docker Compose Structure:**
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
      
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - WOODPECKER_API_KEY=${WOODPECKER_API_KEY}
    volumes:
      - ./data:/app/data  # SQLite persistence
```

**GitHub Actions CI/CD:**
- Auto-deploy on push to main
- Same DigitalOcean droplet pattern as Postiz
- Internal network access only (no public auth needed)

### Woodpecker Campaign ID Configuration

Since we're adding to existing campaigns, we need to:
1. Store campaign IDs in environment variables or database
2. Provide dropdown to select target campaign
3. Use Woodpecker API to fetch existing campaign list