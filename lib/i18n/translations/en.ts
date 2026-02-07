// English translations for UI strings
export const en = {
  // App header
  appTitle: 'CLM Self-Assessment',
  appSubtitle: 'Enterprise Contract Lifecycle Management Maturity Assessment',

  // Survey
  loadingSurvey: 'Loading survey...',
  overallProgress: 'Overall Progress',
  complete: 'Complete',
  viewResultsAnalysis: 'View Results & Analysis',

  // Session recovery
  startOrResumeSurvey: 'Start or Resume Survey',
  resumeExistingSurvey: 'Resume Existing Survey',
  hideRecovery: 'Hide Recovery',
  recoverPreviousSession: 'Recover your previous survey session by providing one of the following:',
  emailAddress: 'Email Address',
  enterYourEmail: 'Enter your email',
  companyName: 'Company Name',
  enterCompanyName: 'Enter your company name',
  sessionId: 'Session ID',
  enterSessionId: 'Enter your session ID',
  recover: 'Recover',
  sessionNotFound: 'Session not found. Please check your information or start a new survey.',
  failedToRecover: 'Failed to recover session. Please try again.',

  // Session selector dialog
  multipleSessionsFound: 'Multiple Sessions Found',
  selectSessionMessage: 'We found multiple survey sessions for {company}. Please select which one you\'d like to continue:',
  started: 'Started',
  progress: 'Progress',
  lastActivity: 'Last activity',
  cancel: 'Cancel',

  // Existing email dialog
  emailAlreadyUsed: 'Email Already Used',
  existingSurveyFound: 'Existing Survey Found',
  existingEmailMessage: 'This email address already has a survey session. You can load the existing session or create a new one.',
  existingSessionDetails: 'Existing Session Details:',
  email: 'Email',
  company: 'Company',
  whatWouldYouDo: 'What would you like to do?',
  loadExistingSession: 'Load Existing Session',
  createNewAnyway: 'Create New Anyway',

  // Sidebar navigation
  clmSelfAssessment: 'CLM Self-Assessment',
  navigationProgress: 'Navigation & Progress',
  surveyStages: 'Survey Stages',
  analysis: 'Analysis',
  viewResults: 'View Results',
  analysisReady: 'Analysis Ready',
  remaining: 'remaining',
  name: 'Name',

  // Stage names (short versions)
  stage1Short: 'Stage 1: e-Document',
  stage2Short: 'Stage 2: e-Signature',
  stage3Short: 'Stage 3: Workflow',
  stage4Short: 'Stage 4: Authoring',
  stage5Short: 'Stage 5: Intelligence',
  stage6Short: 'Stage 6: Execution',

  // Stage names (full versions)
  stage1Full: 'CLM Stage 1: e-Document',
  stage2Full: 'CLM Stage 2: e-Signature',
  stage3Full: 'CLM Stage 3: Contract Workflow Automation',
  stage4Full: 'CLM Stage 4: Contract Authoring Automation',
  stage5Full: 'CLM Stage 5: Contract Intelligence',
  stage6Full: 'CLM Stage 6: Contract Execution',

  // Results page
  loadingResults: 'Loading results...',
  loading: 'Loading...',
  error: 'Error',
  backToSurvey: 'Back to Survey',
  editAnswers: 'Edit Answers',
  startNewSurvey: 'Start New Survey',
  exportCsv: 'Export CSV',
  exportChart: 'Export Chart',
  resultsFor: 'Results for {company} | {email}',
  incompleteAssessment: 'Incomplete Assessment',
  incompleteMessage: 'You\'ve completed {percent}% of the assessment. For more meaningful results, we recommend completing at least {minPercent}% of the questions.',
  overallAverage: 'Overall Average (1-5)',
  scaledScore: 'Scaled Score (0-100)',
  completion: 'Completion',
  radarChart: 'Radar Chart',
  detailedScores: 'Detailed Scores',

  // Table headers
  stage: 'Stage',
  average15: 'Average (1-5)',
  scaled0100: 'Scaled (0-100)',
  peerAvg: 'Peer Avg',
  bestInClass: 'Best in Class',
  gapToPeer: 'Gap to Peer',

  // Results insights
  keyInsights: 'Key Insights',
  performingAbove: 'Performing {points} points above peer average',
  belowConsider: '{points} points below peer average - consider improvement',

  // Benchmark legend
  selfAssessment: 'Self Assessment',
  peerAverage: 'Peer Average',
  chartTitle: 'CLM Maturity Assessment Results',

  // Language toggle
  language: 'Language',
  english: 'English',
  spanish: 'Spanish',
};

export type TranslationKey = keyof typeof en;
