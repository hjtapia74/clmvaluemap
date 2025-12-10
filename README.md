# CLM Maturity Self-Assessment (SQLite Version)

A Next.js application for evaluating your organization's Contract Lifecycle Management (CLM) maturity using SurveyJS and SQLite.

## Features

- **Multi-stage assessment** across 6 CLM capability areas
- **SQLite database** for local data persistence (no external database required)
- **Session management** with recovery options
- **Progress tracking** across all survey stages
- **Comprehensive results** with visualizations
- **Email validation** to prevent duplicate surveys
- **Admin dashboard** for managing surveys and viewing analytics
- **Dark mode support** with system preference detection

## Tech Stack

- **Next.js 15.5** with App Router
- **TypeScript**
- **SQLite** (via better-sqlite3)
- **Chakra UI v3** for components
- **SurveyJS** for survey engine
- **Plotly** for results visualization
- **bcrypt** for password hashing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/hjtapia74/clmvaluemap.git
cd clmvaluemap
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database

This version uses SQLite for data storage:
- Database file: `survey.db` (automatically created on first run)
- No external database setup required
- All data is stored locally in the project directory
- The database file is excluded from git (.gitignore)

## Project Structure

```
├── app/
│   ├── admin/         # Admin dashboard pages
│   │   ├── analytics/ # Analytics and charts
│   │   ├── login/     # Admin login
│   │   └── surveys/   # Survey management
│   ├── api/           # API routes for database operations
│   │   └── admin/     # Admin API endpoints
│   ├── results/       # Results page
│   └── page.tsx       # Main survey page
├── components/
│   ├── admin/         # Admin UI components
│   ├── Survey.tsx     # Main survey component
│   └── SidebarNavigation.tsx
├── lib/
│   ├── auth/          # Authentication logic
│   ├── db/
│   │   ├── connection.ts  # SQLite database connection
│   │   └── models.ts      # TypeScript models
│   ├── api/
│   │   ├── client.ts      # API client functions
│   │   └── adminClient.ts # Admin API client
│   └── config.ts          # Application configuration
├── middleware.ts      # Route protection
└── data/
    └── surveyDefinition.json  # Survey questions
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Admin Dashboard

The application includes a protected admin area for managing surveys and viewing analytics.

### Setup

1. Create a `.env.local` file with admin credentials:
```bash
# Generate a password hash
npx tsx scripts/generateAdminHash.ts yourpassword

# Add to .env.local (escape $ characters with \)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=\$2b\$10\$...your-hash-here...
ADMIN_SESSION_SECRET=your-random-secret-here
```

2. Access the admin panel at `/admin/login`

### Features

- **Dashboard**: Overview with KPIs (total surveys, completion rates, recent activity)
- **Surveys**: List, search, filter, and manage all survey submissions
- **Survey Detail**: View individual responses, radar charts, and export data
- **Analytics**: Charts for completion trends, stage scores, and rating distribution
- **Export**: Download surveys and responses as CSV

### Default Credentials

For development, the default credentials are:
- Username: `admin`
- Password: `admin123`

**Important**: Change these credentials in production!

## Key Differences from MySQL Version

1. **No external database required** - SQLite runs in-process
2. **Single file database** - All data in `survey.db`
3. **Simplified deployment** - No database credentials needed
4. **Better for low-concurrency** - Ideal for single-user or low-traffic scenarios
5. **Easier backup** - Just copy the `.db` file

## License

MIT