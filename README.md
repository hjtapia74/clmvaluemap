# CLM Maturity Self-Assessment (SQLite Version)

A Next.js application for evaluating your organization's Contract Lifecycle Management (CLM) maturity using SurveyJS and SQLite.

## Features

- **Multi-stage assessment** across 6 CLM capability areas
- **SQLite database** for local data persistence (no external database required)
- **Session management** with recovery options
- **Progress tracking** across all survey stages
- **Comprehensive results** with visualizations
- **Email validation** to prevent duplicate surveys

## Tech Stack

- **Next.js 15.5** with App Router
- **TypeScript**
- **SQLite** (via better-sqlite3)
- **Chakra UI v3** for components
- **SurveyJS** for survey engine
- **Plotly** for results visualization

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
│   ├── api/           # API routes for database operations
│   ├── results/       # Results page
│   └── page.tsx       # Main survey page
├── components/
│   ├── Survey.tsx     # Main survey component
│   └── SidebarNavigation.tsx
├── lib/
│   ├── db/
│   │   ├── connection.ts  # SQLite database connection
│   │   └── models.ts      # TypeScript models
│   ├── api/
│   │   └── client.ts      # API client functions
│   └── config.ts          # Application configuration
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

## Key Differences from MySQL Version

1. **No external database required** - SQLite runs in-process
2. **Single file database** - All data in `survey.db`
3. **Simplified deployment** - No database credentials needed
4. **Better for low-concurrency** - Ideal for single-user or low-traffic scenarios
5. **Easier backup** - Just copy the `.db` file

## License

MIT