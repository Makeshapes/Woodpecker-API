# Epic 1: Foundation & Core Workflow

## Epic Goal

Establish project infrastructure with Vite + React + ShadCN UI, implement CSV import with validation, create lead list management interface, and integrate Claude AI for 6-touchpoint email sequence generation. This epic delivers a working prototype that can import leads and generate personalized content, providing immediate value for testing and iteration.

## Epic Description

**Project Context:**

- **Project Type:** Greenfield internal tool for Makeshapes sales team
- **Technology Stack:** Vite + React + TypeScript, Tailwind CSS + ShadCN UI
- **Integration Points:** Claude AI API (direct frontend integration in Phase 1)

**Epic Details:**

- **What's being created:** Complete frontend application foundation with AI-powered content generation
- **How it integrates:** Direct Claude API integration from frontend for rapid prototyping
- **Success criteria:** Working prototype that imports CSV leads and generates personalized email sequences

## Stories

1. **Story 1.1:** Project Setup & Basic UI Layout - Foundational project structure with all required dependencies
2. **Story 1.2:** CSV Import & Validation Interface - Drag-and-drop CSV upload with automatic validation and column mapping
3. **Story 1.3:** Lead List Management & Display - Organized, searchable lead list with batch selection capabilities
4. **Story 1.4:** Claude AI Integration & Content Generation - AI-powered 6-touchpoint email sequence generation

## Compatibility Requirements

- [ ] React 18+ compatibility maintained
- [ ] TypeScript strict mode compliance
- [ ] ShadCN UI component patterns followed consistently
- [ ] Responsive design works on desktop and tablet
- [ ] Modern browser support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## Risk Mitigation

- **Primary Risk:** Claude API rate limits or quota exhaustion during development
- **Mitigation:** Implement rate limiting, request queuing, and graceful error handling with retry logic
- **Rollback Plan:** Mock API responses for development if external API becomes unavailable

## Definition of Done

- [ ] All 4 stories completed with acceptance criteria met
- [ ] End-to-end workflow from CSV import to AI content generation works
- [ ] Error handling covers all API integration points
- [ ] Code follows established React/TypeScript patterns
- [ ] Application is responsive and accessible (WCAG AA basics)
- [ ] Development environment is documented for team onboarding

## Success Metrics

- CSV import and validation completes in under 30 seconds for 100 leads
- AI content generation completes in under 5 seconds per lead
- Error handling provides clear, actionable feedback to users
- All critical user paths work without technical intervention

## Dependencies

- Claude AI API access and keys configured
- Design system requirements from ShadCN UI available
- Development environment setup completed

## Handoff Notes for Story Development

**Story Manager Handoff:**

"Please develop detailed user stories for this greenfield epic. Key considerations:

- This is a new React/TypeScript application using Vite + ShadCN UI
- Integration points: Claude AI API (direct frontend calls in Phase 1)
- Existing patterns to establish: Modern React hooks, TypeScript interfaces, ShadCN component usage
- Critical requirements: Fast CSV processing, reliable AI integration, intuitive UX for sales team
- Each story must include proper error handling and loading states for external API calls

The epic should establish solid foundation patterns while delivering immediate value through AI-powered lead personalization."