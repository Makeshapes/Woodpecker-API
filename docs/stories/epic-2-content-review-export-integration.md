# Epic 2: Content Review & Export Integration

## Epic Goal

Complete the end-to-end user workflow by mplementing direct Woodpecker API integration for adding prospects to existing campaigns. This epic delivers a fully functional MVP that transforms the manual email personalization process into an automated workflow.

## Epic Description

**Project Context:**

- **Project Type:** Continuation of greenfield Woodpecker-API tool
- **Technology Stack:** React + TypeScript frontend with direct API integrations
- **Integration Points:** Woodpecker API (direct frontend integration)

**Epic Details:**

- **What's being created:** Woodpecker API integration system
- **How it integrates:** Builds on Epic 1 foundation, adds export capabilities and content editing workflow
- **Success criteria:** Complete workflow from lead import → AI generation → content review → Woodpecker export

## Stories

1. **Story 2.1:** Woodpecker API Integration & Campaign Management - Direct integration to add prospects to existing campaigns

## Compatibility Requirements

- [ ] Builds on Epic 1 foundation without breaking changes
- [ ] Woodpecker API format compliance maintained
- [ ] State management preserves data integrity across workflow steps
- [ ] UI components follow established ShadCN patterns

## Risk Mitigation

- **Primary Risk:** Woodpecker API integration failures or format mismatches
- **Mitigation:** Comprehensive API testing, JSON format validation, and error recovery mechanisms
- **Rollback Plan:** Export generated content as downloadable CSV file if API integration fails

## Definition of Done

- [ ] Story completed with acceptance criteria met
- [ ] Complete workflow from CSV import to Woodpecker export functions smoothly
- [ ] Content editing interface is intuitive and preserves data integrity
- [ ] Woodpecker API integration handles errors gracefully with retry logic
- [ ] Performance testing validates smooth operation with realistic lead volumes

## Success Metrics

- Complete workflow (import → generate → review → export) completes in under 1 hour for 50 leads
- Content review interface enables editing without data loss or formatting errors
- Woodpecker API integration achieves 99%+ success rate for properly formatted exports

## Dependencies

- Epic 1 (Foundation & Core Workflow) completed
- Woodpecker API access and authentication configured
- Understanding of Woodpecker JSON format requirements

## Integration Points

- **From Epic 1:** Lead data management, AI content generation system
- **To Epic 3:** Will be refactored to use backend proxy in Phase 2
- **External APIs:** Woodpecker campaigns API, enhanced Claude AI usage

## Handoff Notes for Story Development

**Story Manager Handoff:**

"Please develop detailed user stories for this workflow completion epic. Key considerations:

- This builds on the Epic 1 React/TypeScript foundation
- Integration points: Woodpecker API (direct frontend calls in Phase 1), enhanced Claude AI usage
- Existing patterns from Epic 1: Lead data management, AI content generation, ShadCN UI components
- Critical requirements: Intuitive content editing, reliable Woodpecker exports
- Each story must include comprehensive error handling for external API failures
- Focus on completing the MVP workflow while maintaining performance with realistic lead volumes

The epic should deliver a fully functional tool that replaces the manual email personalization process with an automated workflow."
