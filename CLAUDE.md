# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Agiloft CLM (Contract Lifecycle Management) Self-Assessment Survey** application migrated from Python/Streamlit to Next.js/React using SurveyJS. The application allows organizations to evaluate their contract management maturity across six critical stages while maintaining full compatibility with the existing SingleStore database.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Convert CSV to Survey JSON
npx tsx scripts/convertCsvToSurveyJson.ts

# Start local SingleStore database in Docker
./server.sh start

# Stop local SingleStore database
./server.sh stop

# Check database status
./server.sh status
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.5.3 with App Router
- **UI Library**: Chakra UI v3 (compound component patterns)
- **Survey Engine**: SurveyJS (survey-react-ui and survey-core)
- **Database**: SingleStore (MySQL-compatible) - Docker for local, cloud for production
- **Charts**: Plotly.js via react-plotly.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS

### Key Components

#### Survey System (`/components/Survey.tsx`)
- Multi-page survey using SurveyJS Model
- Auto-save functionality with 1-second debouncing
- Real-time progress tracking across 6 CLM stages
- Session persistence to SingleStore database
- Compatible with existing Streamlit app sessions
- **Critical**: Maps capability descriptions to question names for backward compatibility
- Integrated sidebar navigation for stage switching
- Handles null vs undefined for MySQL compatibility

#### Database Layer (`/lib/db/`)
- `connection.ts`: SingleStore connection pool and query functions
- `models.ts`: TypeScript interfaces matching existing database schema
- Uses API routes (`/app/api/*`) for client-server communication
- Session recovery by email, company name, or session ID
- **Important**: All ID fields are VARCHAR(36) to accommodate UUIDs

#### Session Management (`/lib/utils/session.ts`)
- UUID-based session IDs (36 characters)
- User identification via email + company hash
- Browser fingerprinting for session recovery
- Compatible with existing database schema

#### Sidebar Navigation (`/components/SidebarNavigation.tsx`)
- Shows all 6 survey stages with progress indicators
- Mobile responsive with toggle button
- Allows direct navigation between stages
- Access to results view when survey is sufficiently complete
- **Fix Applied**: Correctly maps stage indices to SurveyJS page indices (accounts for +2 offset)

#### Results Visualization (`/app/results/page.tsx`)
- Interactive radar chart comparing:
  - Self-assessment scores
  - Peer averages
  - Best-in-class benchmarks
- Export capabilities (CSV and PNG)
- Detailed score tables with gap analysis
- Insights and recommendations

### Data Flow

1. **Survey Definition**: CSV questions converted to SurveyJS JSON format
2. **User Session**: Created on email/company submission (page 2)
3. **Response Storage**: Auto-saved to `survey_responses` table on each answer
4. **Progress Tracking**: Updated in `survey_progress` table per stage
5. **Results Calculation**: Aggregated in `survey_results` table
6. **Visualization**: Radar chart with benchmark comparisons

### Database Schema (Existing SingleStore)

- `survey_sessions`: User sessions and metadata (session_id VARCHAR(36))
- `survey_responses`: Individual question responses
  - **Critical**: `response_id` is always NULL in existing data
  - Uses `capability` field (description text) as identifier
  - `rating` stores the 1-5 scale answer
- `stage_progress`: Stage completion tracking (no progress_id field)
- `survey_results_summary`: Calculated scores per stage
- `user_sessions`: Browser session management
- `audit_log`: Operation tracking

### Configuration (`/lib/config.ts`)

- Agiloft branding colors and logos
- Benchmark data (peer average, best in class)
- Stage mappings for radar chart
- Progress thresholds for meaningful results

## Important Implementation Details

### Critical Data Mappings

1. **Response Storage**:
   - Responses stored with `capability` field (the question description)
   - `response_id` field is always NULL (matches existing Streamlit data)
   - Capability descriptions are mapped to SurveyJS question names for data restoration
   - Example: "How effectively does your organization..." → "stage1_centralized_contract_repository_1"

2. **Page Structure** (Important for navigation):
   - Page 0: Introduction
   - Page 1: User Info (email/company collection)
   - Pages 2-7: Stages 1-6 respectively
   - Sidebar navigation accounts for this +2 offset

3. **Database Compatibility**:
   - Uses the same SingleStore database as the Streamlit version
   - Maintains identical table structures and field names
   - Sessions can be recovered across both applications
   - User identifiers generated consistently

### Survey Features
- 38 questions across 6 CLM maturity stages
- 1-5 rating scale with detailed explanations
- Conditional page flow (currently disabled, ready for future)
- Progress saved automatically with 1-second debounce
- Session timeout: 24 hours

### Responsive Design
- Mobile-friendly survey interface
- Chakra UI v3 components for consistency
- Agiloft brand colors throughout
- Accessible form controls

## Deployment Considerations

### EC2 Deployment
- Target: Amazon Linux on EC2
- Build locally or on server
- Environment variables in `.env.local`
- SingleStore connection via connection string

### Environment Variables

Required in `.env.local`:

```bash
# SingleStore connection
SINGLESTORE_URL=mysql://user:pass@host:port/database
DATABASE_MODE=local  # or 'remote' for production

# Application settings
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://your-domain.com  # for production
```

### Production Build
```bash
npm run build
npm run start
```

### CI/CD Pipeline (TODO)
- Git push triggers deployment
- SSH to EC2 instance
- Pull latest code
- Install dependencies
- Build application
- Restart PM2 process

## Known Issues and Solutions

1. **Database Column Mismatches**:
   - Issue: Some columns from initial schema don't exist
   - Solution: Updated queries to match actual SingleStore schema
   - Removed: time_spent_seconds, created_at in stage_progress, progress_id

2. **Response ID Length**:
   - Issue: Generated IDs exceeded VARCHAR(36) limit
   - Solution: Set response_id to NULL (matches existing data pattern)

3. **Sidebar Navigation Highlighting**:
   - Issue: Wrong stage highlighted when navigating
   - Solution: Added +2 offset in isActive calculation to account for intro/user_info pages

4. **MySQL Undefined Values**:
   - Issue: "Bind parameters must not contain undefined"
   - Solution: Convert undefined to null before database operations

## API Routes

- `/api/session` - Create/get survey sessions
- `/api/response` - Save/retrieve survey responses
- `/api/progress` - Update/get stage progress
- `/api/results` - Calculate/retrieve survey results

## Docker Setup (Local Development)

- SingleStore runs in Docker container
- Port: 3306 (MySQL compatible)
- Management script: `./server.sh`
- No SSL required for local mode
- Auto-creates database and tables on first run

## Migration Success Metrics

- ✅ Full data compatibility with Streamlit version
- ✅ Same survey structure and questions
- ✅ Session recovery across platforms
- ✅ Progress tracking and auto-save
- ✅ Results visualization with benchmarks
- ✅ Sidebar navigation between stages

## Future Enhancements (Documented)

### ~~Admin Dashboard~~ ✅ COMPLETED (2025-12-09)
- ~~View all survey responses~~
- ~~Analytics and reporting~~
- ~~Export bulk data~~
- User management (future: multiple admin users)

### Additional Features
- Email notifications for incomplete surveys
- Conditional logic between stages
- Custom question types
- Multi-language support
- API endpoints for external integration

## Chakra UI v3 Usage

This project uses Chakra UI v3. Key components:
- `Provider` wraps the app with theme
- `Card`, `Container`, `VStack`, `HStack` for layout
- `Button`, `Text`, `Heading` for typography
- `Table`, `Alert`, `Progress` for data display
- `Tabs` for view switching

Always validate component usage with the Chakra UI MCP server when available.

## Testing Approach

- Manual testing during development
- Database queries tested via direct connection
- Session recovery tested across applications
- Export functionality verified for CSV and images

## Recent Updates

### Dark Mode Support (2025-10-11)
- ✅ Implemented comprehensive dark mode with automatic system theme detection
- ✅ Added dark/light mode logo switching (SVG for light, PNG for dark)
- ✅ Created SurveyJS dark mode CSS overrides (`components/Survey.css`)
- ✅ Updated semantic color tokens throughout the application
- ✅ Fixed stage progress banner text colors for better readability
- ✅ Added user email and name display in sidebar session info
- ✅ Improved button padding on results page
- ✅ Added proper padding to progress cards
- ✅ Removed duplicate session ID from main page header
- ✅ Sidebar navigation now shows session info with email and name

### Responsive Design Updates (2025-10-11)
- ✅ Results page buttons stack vertically on mobile devices
- ✅ Added responsive margins to containers (smaller on mobile, larger on desktop)
- ✅ Logo margin and heading size adjust for mobile screens
- ✅ Full-width buttons on mobile for better touch targets
- ✅ Horizontal layout maintained on desktop/tablet screens

### Theme Configuration (`lib/theme.ts`)
Semantic color tokens for dark mode:
- `agiloft.fg`: Main foreground color (changes in dark mode)
- `agiloft.solid`: Primary button background
- `agiloft.muted`: Subtle backgrounds
- `bg.subtle`: Background for containers
- `fg.muted`: Muted text color
- `border.subtle`: Border colors

### Deployment Process
Application is deployed on AWS EC2 (Amazon Linux):
- Instance ID: `i-0abb7acc30beb3e77`
- Public IP: `34.201.151.219`
- Deployment script: `./deploy/update-app-amazon-linux.sh`
- Managed with PM2 process manager
- Automated deployment updates:
  1. Backup database
  2. Pull from GitHub
  3. Install dependencies
  4. Build application
  5. Restart PM2 process

### EC2 Deployment Commands
```bash
# Connect via EC2 Instance Connect (key expires after ~60 seconds)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-0abb7acc30beb3e77 \
  --instance-os-user ec2-user \
  --ssh-public-key file://~/.ssh/id_ed25519.pub \
  --availability-zone us-east-1b

# Quick deploy (pull, build, restart)
ssh ec2-user@34.201.151.219 \
  "cd /var/www/clm-survey && git pull origin main && npm run build && pm2 restart clm-survey"

# Or use deployment script (includes backup)
ssh ec2-user@34.201.151.219 \
  "cd /var/www/clm-survey && ./deploy/update-app-amazon-linux.sh"

# Manual database backup
ssh ec2-user@34.201.151.219 \
  "mkdir -p ~/backups && cp /var/www/clm-survey/survey.db ~/backups/survey_\$(date +%Y%m%d_%H%M%S).db"
```

### Admin Dashboard (2025-12-09)
A comprehensive administration module for managing surveys and viewing analytics.

#### Features
- **Authentication**: Environment variable-based login with bcrypt password hashing
- **Dashboard** (`/admin`): Overview with KPIs, completion rates, recent activity
- **Surveys** (`/admin/surveys`): List all surveys with search, filter, sort, pagination
- **Survey Detail** (`/admin/surveys/[id]`): View responses, results radar chart, delete survey
- **Analytics** (`/admin/analytics`): Charts for completion trends, stage scores, rating distribution
- **Export**: CSV export for surveys and responses

#### Admin Credentials
Default credentials (change in production!):
- Username: `admin`
- Password: `admin123`

To generate a new password hash:
```bash
npx tsx scripts/generateAdminHash.ts <your-password>
```

Then update `.env.local` (note: escape `$` with `\$`):
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=\$2b\$10\$<rest-of-hash>
ADMIN_SESSION_SECRET=<random-32-char-secret>
```

**Important:** The `$` characters in bcrypt hashes must be escaped with backslashes in `.env.local` files.

#### Admin Routes
| Route | Description |
|-------|-------------|
| `/admin/login` | Login page |
| `/admin` | Dashboard overview |
| `/admin/surveys` | Survey list with filters |
| `/admin/surveys/[id]` | Survey detail with responses |
| `/admin/analytics` | Charts and statistics |

#### Admin API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/login` | POST | Authenticate admin |
| `/api/admin/logout` | POST | Clear session |
| `/api/admin/verify` | GET | Verify session |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/surveys` | GET | List surveys (paginated) |
| `/api/admin/surveys/[id]` | GET/DELETE/PATCH | Survey CRUD |
| `/api/admin/responses` | DELETE | Delete response |
| `/api/admin/analytics` | GET | Analytics data |
| `/api/admin/export` | GET | CSV export |

#### Key Files
- `/lib/auth/admin.ts` - Authentication logic
- `/lib/api/adminClient.ts` - Client-side API wrapper
- `/components/admin/` - Admin UI components
- `/app/admin/` - Admin pages
- `/middleware.ts` - Route protection

#### Technical Notes

**Completion Status Calculation**:
The `is_completed` and `completion_percentage` fields in `survey_sessions` table are not updated by the survey app. Instead, completion is calculated dynamically from `stage_progress` table using subqueries in:
- `getDashboardStats()` - for KPI counts
- `getAllSessions()` - for survey list with accurate status
- `getRecentSessions()` - for dashboard recent activity

**Radar Chart**:
Admin survey detail page includes all three benchmark traces:
- Self Assessment (solid blue with fill)
- Peer Average (dashed gray)
- Best in Class (dotted green)

**UI Padding**:
Admin pages use consistent padding:
- Layout provides `p={6}` to main content area
- Card.Header uses `p={6}` for chart titles
- Card.Body uses `pt={0} px={6} pb={6}` for content
- StatsCard uses `p={6}` for KPI cards

#### Known Issues Fixed
1. **Surveys showing "In Progress" when completed**: Fixed by calculating completion from `stage_progress` table instead of relying on `survey_sessions.is_completed` field
2. **Missing "Best in Class" on admin radar chart**: Added third trace to match public results page
3. **bcrypt hash not working in .env.local**: Must escape `$` characters with `\$` in environment files