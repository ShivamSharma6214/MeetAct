

# MeetAct - Implementation Plan

## Overview
A full-stack meeting-to-action-items automation platform that saves PMs 4+ hours/week by instantly extracting, organizing, and syncing action items to project management tools.

---

## Phase 1: Foundation & Core Infrastructure

### Authentication System
- Email/password registration and login
- Google OAuth integration
- Protected routes with auth guards
- User profile management with team associations

### Database Architecture
**Tables:**
- `profiles` - User data, preferences, team memberships
- `meetings` - Meeting records with title, date, transcript, audio URL
- `action_items` - Extracted items with owner, deadline, priority, status, confidence score
- `integrations` - OAuth tokens for Jira, Trello, Slack per user
- `reminders_log` - Tracking sent notifications
- `analytics` - Time saved metrics, completion rates

### File Storage
- Supabase Storage bucket for audio files (up to 100MB)
- Transcript text storage in database
- Automatic cleanup for GDPR compliance (30-day optional delete)

---

## Phase 2: User Interface

### Landing Page
- Hero section explaining the value proposition (reduce meeting overhead by 75%)
- Feature highlights with icons
- "Get Started" CTA leading to signup

### Dashboard (Main Hub)
- Recent meetings list with action item status breakdown
- Quick stats: "Time Saved This Week", "Actions Completed", "Open Items"
- "New Meeting" prominent button
- Dark mode toggle in header

### Meeting Upload Flow
- Drag-and-drop zone for files (.txt, .doc, .mp3, .wav, .m4a)
- OR paste transcript text directly
- Processing state with animated spinner + live preview of extracted items
- Audio files trigger Whisper transcription first

### Action Items Table
- Sortable, filterable data table
- Inline editing for owner, deadline, status, priority
- Confidence score indicator (low scores flagged with warning icon)
- Bulk selection for export/push actions
- Real-time sync across browser tabs

### Integration Panel
- "Push to Jira" button with project/board selector
- Mapping preview before push (actionItem → Summary, owner → Assignee)
- Success confirmation with direct links to created issues
- CSV/JSON export buttons

---

## Phase 3: AI Extraction Engine

### Transcript Processing Endpoint
- Accept text input or audio file URL
- For audio: Call Whisper API for transcription first
- Parse transcript with Lovable AI (Gemini) using optimized prompt
- Return structured JSON array of action items

### Extraction Features
- Speaker diarization awareness (handle "John said he'll...")
- Date parsing (relative dates like "next Friday" → ISO format)
- Priority inference from context ("urgent", "ASAP", "when possible")
- Confidence scoring for ambiguous items
- Low-confidence flagging for manual review

### Output Schema
```json
{
  "id": "uuid",
  "actionItem": "Task description",
  "owner": "Name (@email if detected)",
  "deadline": "2026-02-09T00:00:00Z",
  "priority": "High",
  "status": "Open",
  "confidence": 0.92,
  "notes": "Context from transcript"
}
```

---

## Phase 4: Jira Integration

### OAuth Connection
- "Connect Jira" flow using Atlassian OAuth 2.0
- Secure token storage in integrations table
- Token refresh handling

### Issue Creation
- Fetch user's accessible Jira projects and issue types
- Field mapping: Summary, Description, Assignee, Due Date, Priority
- Bulk create with progress indicator
- Return direct links to created issues
- Handle errors gracefully (user not found, project access denied)

---

## Phase 5: Additional Exports

### CSV Export
- Download all action items as CSV
- Compatible with Notion, Asana, Monday.com import
- Include all fields with proper formatting

### JSON Export
- Raw JSON download for developers/custom integrations

---

## Phase 6: Analytics & Metrics

### Time Saved Calculation
- Track meetings processed and actions extracted
- Estimate time saved (baseline: 15 min/meeting manual processing)
- Display weekly/monthly rollups

### Success Metrics Dashboard
- Actions created vs. completed ratio
- Average confidence scores
- Integration usage breakdown
- "Missed Tasks Reduced" projection

---

## Phase 7: Polish & Production Readiness

### UX Enhancements
- Onboarding tour for first-time users
- Loading skeletons for all data fetches
- Error handling with actionable messages ("Failed to detect owner—assign manually?")
- Mobile-responsive design for on-the-go access

### Performance
- Optimistic UI updates for status changes
- Debounced inline editing saves
- Lazy loading for meeting history

### Documentation
- Environment variables template
- API documentation for edge functions
- Deployment guide

---

## Design Direction
- **Style**: Clean, professional dashboard inspired by Linear/Jira
- **Colors**: Neutral base with accent colors for priorities (red=high, yellow=medium, green=low)
- **Typography**: Clear hierarchy with readable fonts
- **Dark Mode**: Full support with toggle
- **Interactions**: Smooth transitions, instant feedback

