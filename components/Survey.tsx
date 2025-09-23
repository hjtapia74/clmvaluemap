'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import {
  Box,
  Container,
  Heading,
  Text,
  Progress,
  VStack,
  HStack,
  Card,
  Button,
  Input,
  Alert,
  Dialog
} from '@chakra-ui/react';
import { Config } from '@/lib/config';
import {
  generateSessionId,
  generateUserIdentifier,
  generateBrowserFingerprint,
  generateSessionToken
} from '@/lib/utils/session';
import { SurveySession, SurveyResponse, StageProgress } from '@/lib/db/models';
import {
  createSession,
  saveResponse,
  updateStageProgress,
  getSessionProgress,
  getSessionResponses,
  findSessionByEmail,
  findSessionByCompany,
  findAllSessionsByCompany,
  getSession,
  calculateAndSaveResults
} from '@/lib/api/client';
import surveyDefinition from '@/data/surveyDefinition.json';
import SidebarNavigation from './SidebarNavigation';

interface SidebarState {
  isOpen: boolean;
}

interface SurveyComponentProps {
  onComplete?: (data: any) => void;
  initialSessionId?: string;
}

export default function SurveyComponent({ onComplete, initialSessionId }: SurveyComponentProps) {
  const [survey, setSurvey] = useState<Model | null>(null);
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');
  const [userInfo, setUserInfo] = useState<{ email: string; company: string } | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [stageProgresses, setStageProgresses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<SurveySession | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCompany, setRecoveryCompany] = useState('');
  const [recoverySessionId, setRecoverySessionId] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<SurveySession[]>([]);
  const [showExistingEmailDialog, setShowExistingEmailDialog] = useState(false);
  const [existingSession, setExistingSession] = useState<SurveySession | null>(null);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Build capability to question name mapping from survey definition
  const capabilityToQuestionMap = useRef<Record<string, string>>({});

  // Initialize survey model
  useEffect(() => {
    const model = new Model(surveyDefinition);

    // Build the mapping from capability descriptions to question names
    const mapping: Record<string, string> = {};
    surveyDefinition.pages.forEach((page: any) => {
      page.elements.forEach((element: any) => {
        if (element.description && element.name) {
          // Map both versions - with and without markdown formatting
          mapping[element.description] = element.name; // With markdown (for new data)
          const cleanDescription = element.description.replace(/\*\*/g, '').trim();
          mapping[cleanDescription] = element.name; // Without markdown (for old data)
        }
      });
    });
    capabilityToQuestionMap.current = mapping;
    console.log('Capability to question mapping built:', Object.keys(mapping).length, 'mappings');

    // Configure survey settings
    model.showProgressBar = 'both';
    model.progressBarType = 'pages';
    model.showQuestionNumbers = 'on';
    model.questionsOnPageMode = 'standard';
    model.showCompletedPage = false;

    // Apply Agiloft branding colors
    model.applyTheme({
      cssVariables: {
        '--sjs-general-backcolor': Config.COLORS.gray[50],
        '--sjs-general-backcolor-dim': Config.COLORS.gray[100],
        '--sjs-general-forecolor': Config.COLORS.gray[800],
        '--sjs-primary-backcolor': Config.COLORS.primary,
        '--sjs-primary-forecolor': '#FFFFFF',
        '--sjs-secondary-backcolor': Config.COLORS.secondary,
        '--sjs-secondary-forecolor': '#FFFFFF',
        '--sjs-special-red': Config.COLORS.danger,
        '--sjs-special-green': Config.COLORS.success,
      }
    });

    setSurvey(model);
  }, []);

  // Handle user info submission (from page 2)
  const handleUserInfoSubmit = useCallback(async (sender: Model) => {
    const data = sender.data;
    console.log('handleUserInfoSubmit called with data:', data);
    if (data.company_name && data.email) {
      setLoading(true);
      try {
        // First check if email already exists
        const existingResult = await findSessionByEmail(data.email);
        if (existingResult.success && existingResult.session) {
          // Email already exists - show dialog to user
          setExistingSession(existingResult.session);
          setPendingUserData(data);
          setShowExistingEmailDialog(true);
          setLoading(false);
          return; // Don't create new session yet
        }

        const newSessionId = generateSessionId();
        const userIdentifier = generateUserIdentifier(data.email, data.company_name);

        // Create session in database
        const session: SurveySession = {
          session_id: newSessionId,
          user_identifier: userIdentifier,
          company_name: data.company_name,
          respondent_email: data.email,
          respondent_name: data.name || '',
          user_ip_address: '',
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
          is_completed: false,
          total_questions: 38, // From conversion script output
          answered_questions: 0,
          completion_percentage: 0
        };

        const result = await createSession(session);
        if (!result.success) {
          throw new Error(result.error || 'Failed to create session');
        }

        setSessionId(newSessionId);
        setUserInfo({ email: data.email, company: data.company_name });
        setSessionData(session);

        console.log('Session created successfully');
      } catch (error) {
        console.error('Failed to create session:', error);
        alert('Failed to create session. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Session recovery function
  const recoverSession = useCallback(async (email?: string, company?: string, sessionIdInput?: string) => {
    console.log('recoverSession called with:', { email, company, sessionIdInput });
    try {
      setLoading(true);
      let result;

      if (sessionIdInput) {
        result = await getSession(sessionIdInput);
      } else if (email) {
        result = await findSessionByEmail(email);
      } else if (company) {
        // First check if there are multiple sessions for this company
        const allSessionsResult = await findAllSessionsByCompany(company);
        if (allSessionsResult.success && allSessionsResult.sessions && allSessionsResult.sessions.length > 1) {
          // Multiple sessions found - show selection dialog
          setAvailableSessions(allSessionsResult.sessions);
          setShowSessionSelector(true);
          setLoading(false);
          return false; // Don't continue recovery, let user choose
        } else {
          // Single or no session - use existing logic
          result = await findSessionByCompany(company);
        }
      }

      if (result?.success && result.session) {
        console.log('Session recovered, setting sessionId:', result.session.session_id);
        setSessionId(result.session.session_id);
        setUserInfo({
          email: result.session.respondent_email || '',
          company: result.session.company_name || ''
        });
        setSessionData(result.session);
        setShowRecovery(false);

        // Load existing progress
        const progressResult = await getSessionProgress(result.session.session_id);
        if (progressResult.success && progressResult.progress) {
          const stageProgress: Record<string, number> = {};
          let totalAnswered = 0;
          let totalQuestions = 0;

          progressResult.progress.forEach(p => {
            stageProgress[Object.keys(Config.STAGE_RADAR_NAMES).find(key =>
              Config.STAGE_RADAR_NAMES[key] === p.stage_name) || ''] = Number(p.completion_percentage) || 0;
            totalAnswered += Number(p.answered_questions) || 0;
            totalQuestions += Number(p.total_questions) || 0;
          });

          setStageProgresses(stageProgress);
          setOverallProgress(totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0);
        }

        // Load existing survey responses and restore survey state
        const responsesResult = await getSessionResponses(result.session.session_id);
        if (responsesResult.success && responsesResult.responses && survey) {
          const surveyData: Record<string, any> = {};

          // Convert responses back to survey data format
          responsesResult.responses.forEach(response => {
            // Map capability to question name using our mapping
            const questionId = capabilityToQuestionMap.current[response.capability];

            if (!questionId) {
              console.warn('Skipping response with no mappable capability during recovery:', response.capability);
              return;
            }

            try {
              // The rating is already a number, use it directly
              const answer = response.rating;
              surveyData[questionId] = answer;
              console.log('Restored answer for', questionId, '(capability:', response.capability, ') :', answer);
            } catch (error) {
              console.warn('Failed to process response during recovery:', questionId, error);
            }
          });

          // Apply the data to the survey model
          survey.data = surveyData;
          console.log('Survey responses restored:', Object.keys(surveyData).length, 'answers loaded');
          console.log('Restored survey data:', surveyData);
        }

        console.log('Session recovered successfully');
        setRecoveryError(''); // Clear any previous errors
        return true;
      } else {
        setRecoveryError('Session not found. Please check your information or start a new survey.');
        return false;
      }
    } catch (error) {
      console.error('Failed to recover session:', error);
      setRecoveryError('Failed to recover session. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle session selection from dialog
  const handleSessionSelect = useCallback(async (selectedSession: SurveySession) => {
    setShowSessionSelector(false);
    setAvailableSessions([]);

    // Use the selected session for recovery
    const result = await getSession(selectedSession.session_id);
    if (result?.success && result.session) {
      console.log('Selected session recovered:', result.session.session_id);
      setSessionId(result.session.session_id);
      setSessionData(result.session);
      setUserInfo({
        email: result.session.respondent_email,
        company: result.session.company_name
      });

      // Load existing progress and responses (similar to existing recovery logic)
      const progressResult = await getSessionProgress(result.session.session_id);
      if (progressResult.success && progressResult.progress) {
        const stageProgress: Record<string, number> = {};
        let totalAnswered = 0;
        let totalQuestions = 0;

        progressResult.progress.forEach(p => {
          stageProgress[Object.keys(Config.STAGE_RADAR_NAMES).find(key =>
            Config.STAGE_RADAR_NAMES[key] === p.stage_name) || ''] = Number(p.completion_percentage) || 0;
          totalAnswered += Number(p.answered_questions) || 0;
          totalQuestions += Number(p.total_questions) || 0;
        });

        setStageProgresses(stageProgress);
        setOverallProgress(totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0);
      }

      // Load existing responses
      const responsesResult = await getSessionResponses(result.session.session_id);
      if (responsesResult.success && responsesResult.responses && survey) {
        const surveyData: Record<string, any> = {};
        responsesResult.responses.forEach(response => {
          const questionId = capabilityToQuestionMap.current[response.capability];
          if (questionId) {
            surveyData[questionId] = response.rating;
          }
        });
        survey.data = surveyData;
      }

      setRecoveryError('');
    } else {
      setRecoveryError('Failed to recover selected session.');
    }
  }, [survey]);

  // Handle existing email dialog actions
  const handleLoadExistingSession = useCallback(async () => {
    if (!existingSession) return;

    setShowExistingEmailDialog(false);
    await handleSessionSelect(existingSession);
  }, [existingSession, handleSessionSelect]);

  const handleCreateNewAnyway = useCallback(async () => {
    if (!pendingUserData) return;

    setShowExistingEmailDialog(false);
    setLoading(true);

    try {
      const newSessionId = generateSessionId();
      const userIdentifier = generateUserIdentifier(pendingUserData.email, pendingUserData.company_name);

      // Create session in database
      const session: SurveySession = {
        session_id: newSessionId,
        user_identifier: userIdentifier,
        company_name: pendingUserData.company_name,
        respondent_email: pendingUserData.email,
        respondent_name: pendingUserData.name || '',
        user_ip_address: '',
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
        is_completed: false,
        total_questions: 38,
        answered_questions: 0,
        completion_percentage: 0
      };

      const result = await createSession(session);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      setSessionId(newSessionId);
      setUserInfo({ email: pendingUserData.email, company: pendingUserData.company_name });
      setSessionData(session);

      console.log('New session created successfully despite existing email');
    } catch (error) {
      console.error('Failed to create new session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
      setExistingSession(null);
      setPendingUserData(null);
    }
  }, [pendingUserData]);

  // Handle initialSessionId if provided (for returning to survey from results)
  useEffect(() => {
    if (initialSessionId && survey) {
      console.log('Recovering session from initialSessionId:', initialSessionId);
      recoverSession(undefined, undefined, initialSessionId);
    }
  }, [initialSessionId, survey, recoverSession]);

  // Auto-save responses
  const saveResponses = useCallback(async (sender: Model) => {
    if (!sessionId || !userInfo) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid too many database calls
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const currentPage = sender.currentPage;
        if (!currentPage) return;

        // Get stage information
        const pageName = currentPage.name;
        const stageMatch = pageName.match(/stage_(\d+)/);
        if (!stageMatch) return;

        const stageNum = stageMatch[1];
        const stageName = Object.keys(Config.STAGE_RADAR_NAMES).find(key =>
          key.startsWith(`${stageNum}:`)
        );

        if (!stageName) return;

        // Save responses for current page
        const pageQuestions = currentPage.questions;
        let answeredCount = 0;

        for (const question of pageQuestions) {
          const answer = sender.data[question.name];
          if (answer !== undefined && answer !== null) {
            answeredCount++;

            const response: SurveyResponse = {
              response_id: null, // Database shows existing records have NULL response_id
              session_id: sessionId,
              stage_name: Config.STAGE_RADAR_NAMES[stageName],
              capability: question.description || '',
              question: question.title || '',
              rating: parseInt(answer),
              rating_explanation: null,
              selected_option_text: question.choices?.find((c: any) => c.value === answer)?.text || null,
            };

            const saveResult = await saveResponse(response);
            if (!saveResult.success) {
              console.error('Failed to save response:', saveResult.error);
            }
          }
        }

        // Update stage progress
        const progress: StageProgress = {
          progress_id: `${sessionId}_stage_${stageNum}`,
          session_id: sessionId,
          stage_name: Config.STAGE_RADAR_NAMES[stageName],
          stage_order: parseInt(stageNum),
          total_questions: pageQuestions.length,
          answered_questions: answeredCount,
          completion_percentage: (answeredCount / pageQuestions.length) * 100,
          is_completed: answeredCount === pageQuestions.length
        };

        const progressResult = await updateStageProgress(progress);
        if (!progressResult.success) {
          console.error('Failed to update progress:', progressResult.error);
        }

        // If stage is completed, calculate results
        if (progress.is_completed) {
          console.log(`Stage ${stageName} completed, calculating results...`);
          try {
            const calcResult = await calculateAndSaveResults(sessionId);
            if (!calcResult.success) {
              console.error('Failed to calculate results after stage completion:', calcResult.error);
            } else {
              console.log('Results calculated successfully for completed stage');
            }
          } catch (error) {
            console.error('Error calculating results:', error);
          }
        }

        // Update local progress state
        setStageProgresses(prev => ({
          ...prev,
          [stageName]: Number(progress.completion_percentage) || 0
        }));

        // Calculate overall progress
        const allProgressResult = await getSessionProgress(sessionId);
        if (allProgressResult.success && allProgressResult.progress) {
          const totalAnswered = allProgressResult.progress.reduce((sum, p) => sum + p.answered_questions, 0);
          const totalQuestions = allProgressResult.progress.reduce((sum, p) => sum + p.total_questions, 0);
          const overallPct = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;
          setOverallProgress(overallPct);
        }

      } catch (error) {
        console.error('Failed to save responses:', error);
        console.warn('Failed to save responses. They will be retried.');
      }
    }, 1000); // 1 second debounce
  }, [sessionId, userInfo]);

  // Stage navigation handler
  const handleStageSelect = useCallback(async (stageIndex: number) => {
    if (!survey || !sessionId) return;

    console.log('Stage navigation requested:', stageIndex);
    console.log('Current survey data before navigation:', Object.keys(survey.data).length, 'keys');

    // Find the page corresponding to the stage
    // Skip the first page (intro) and user_info page, start from stage pages
    const stagePageIndex = stageIndex + 2; // +2 for intro and user_info pages

    if (stagePageIndex >= survey.visiblePageCount) {
      console.warn('Invalid stage index:', stageIndex, 'page index:', stagePageIndex);
      return;
    }

    // First navigate to the page
    survey.currentPageNo = stagePageIndex;
    setCurrentPageIndex(stagePageIndex);
    console.log('Navigated to page:', stagePageIndex);

    // Then refresh the survey data to ensure all answers are visible
    try {
      const responsesResult = await getSessionResponses(sessionId);
      if (responsesResult.success && responsesResult.responses) {
        console.log('Found', responsesResult.responses.length, 'saved responses');

        const surveyData: Record<string, any> = {};

        // Convert responses back to survey data format
        responsesResult.responses.forEach(response => {
          // Map capability to question name using our mapping
          const questionId = capabilityToQuestionMap.current[response.capability];

          if (!questionId) {
            console.warn('Skipping response with no mappable capability in stage navigation:', response.capability);
            return;
          }

          try {
            // The rating is already a number, use it directly
            const answer = response.rating;
            surveyData[questionId] = answer;
            console.log('Restored answer for', questionId, '(capability:', response.capability, ') :', answer);
          } catch (error) {
            console.warn('Failed to process response for question:', questionId, error);
          }
        });

        // Apply the data to the survey model AFTER navigation
        survey.data = { ...survey.data, ...surveyData };

        // Force survey to update/refresh its display
        survey.render();

        console.log('Survey data updated after navigation:', Object.keys(survey.data).length, 'total answers');
      }
    } catch (error) {
      console.error('Failed to refresh survey data:', error);
    }
  }, [survey, sessionId]);

  // Results navigation handler
  const handleResultsSelect = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Calculate and save results before navigating
      console.log('Calculating results for session:', sessionId);
      const result = await calculateAndSaveResults(sessionId);
      if (!result.success) {
        console.error('Failed to calculate results:', result.error);
      }
    } catch (error) {
      console.error('Error calculating results:', error);
    }

    // Navigate to results page
    window.location.href = `/results?sessionId=${sessionId}`;
  }, [sessionId]);

  // Set up survey event handlers
  useEffect(() => {
    if (!survey) return;

    // Handle page changes
    survey.onCurrentPageChanged.add((sender) => {
      console.log('Page changed. Current page:', sender.currentPage?.name);
      console.log('Previous page:', sender.visiblePages[sender.currentPageNo - 1]?.name);
      console.log('Current sessionId:', sessionId);

      // Update current page index
      setCurrentPageIndex(sender.currentPageNo);

      // Check if leaving user info page (page name should be from our JSON definition)
      const previousPageName = sender.visiblePages[sender.currentPageNo - 1]?.name;
      if (previousPageName === 'user_info' && !sessionId) {
        console.log('Triggering handleUserInfoSubmit');
        handleUserInfoSubmit(sender);
      }

      // Save responses when page changes
      if (sessionId) {
        saveResponses(sender);
      }
    });

    // Handle value changes (for auto-save)
    survey.onValueChanged.add((sender) => {
      if (sessionId) {
        saveResponses(sender);
      }
    });

    // Handle survey completion
    survey.onComplete.add(async (sender) => {
      if (sessionId) {
        await saveResponses(sender);
      }
      if (onComplete) {
        // Pass both survey data and session info
        onComplete({
          ...sender.data,
          session_id: sessionId
        });
      }
    });

    return () => {
      survey.onCurrentPageChanged.clear();
      survey.onValueChanged.clear();
      survey.onComplete.clear();
    };
  }, [survey, sessionId, handleUserInfoSubmit, saveResponses, onComplete]);

  if (!survey) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Text>Loading survey...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Box position="relative" minH="100vh">
      {/* Sidebar Navigation */}
      {sessionId && (
        <SidebarNavigation
          currentPage={currentPageIndex}
          stageProgresses={stageProgresses}
          overallProgress={overallProgress}
          sessionId={sessionId}
          onStageSelect={handleStageSelect}
          onResultsSelect={handleResultsSelect}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Overlay */}
      {sessionId && sidebarOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          w="100%"
          h="100%"
          bg="blackAlpha.500"
          zIndex={9}
          display={{ base: "block", md: "none" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <Box
        ml={sessionId && sidebarOpen ? "300px" : "0"}
        transition="margin-left 0.3s"
      >
        <Container maxW="container.lg" py={8} px={4}>
          <VStack spacing={6} align="center">
        {/* Header with logo */}
        <HStack justify="space-between" align="center" w="100%" maxW="800px">
          <HStack>
            {sessionId && !sidebarOpen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                mr={3}
              >
                ☰
              </Button>
            )}
            <Box as="img" src={Config.LOGO_URL} alt="Agiloft" h="40px" mr={10} />
            <VStack align="start" spacing={0}>
              <Heading size="lg">{Config.APP_TITLE}</Heading>
              <Text fontSize="sm" color="gray.600">{Config.APP_SUBTITLE}</Text>
            </VStack>
          </HStack>
          {/* Debug info */}
          {sessionId && (
            <Text fontSize="xs" color="gray.500">Session: {sessionId.substring(0, 8)}...</Text>
          )}
        </HStack>

        {/* Overall Progress */}
        {sessionId && (
          <Card.Root maxW="800px" w="100%">
            <Card.Body>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">Overall Progress</Text>
                  <Text fontSize="sm" color="gray.600">
                    {overallProgress.toFixed(0)}% Complete
                  </Text>
                </HStack>
                <Progress.Root value={overallProgress} size="sm" colorPalette="agiloft">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>

                {/* View Results button for completed surveys */}
                {overallProgress >= 80 && (
                  <Button
                    colorPalette="green"
                    size="sm"
                    onClick={() => window.location.href = `/results?sessionId=${sessionId}`}
                  >
                    View Results & Analysis
                  </Button>
                )}

                {/* Stage progress indicators */}
                <HStack spacing={2} flexWrap="wrap">
                  {Object.entries(Config.STAGE_RADAR_NAMES).map(([key, name]) => {
                    const progress = stageProgresses[key] || 0;
                    return (
                      <Box
                        key={key}
                        px={2}
                        py={1}
                        borderRadius="md"
                        bg={progress === 100 ? 'green.100' : progress > 0 ? 'agiloft.100' : 'gray.100'}
                        fontSize="xs"
                      >
                        {name.replace('CLM Stage ', 'S')}: {progress.toFixed(0)}%
                      </Box>
                    );
                  })}
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Session Recovery */}
        {!sessionId && (
          <Card.Root maxW="800px" w="100%">
            <Card.Header pb={showRecovery ? 0 : 4} px={6} pt={6}>
              <HStack justify="space-between">
                <Heading size="md">Start or Resume Survey</Heading>
                <Button
                  variant="surface"
                  size="sm"
                  px={5}
                  py={2}
                  onClick={() => {
                    setShowRecovery(!showRecovery);
                    setRecoveryError(''); // Clear error when toggling
                  }}
                >
                  {showRecovery ? 'Hide Recovery' : 'Resume Existing Survey'}
                </Button>
              </HStack>
            </Card.Header>
            {showRecovery && (
              <Card.Body px={6} py={4}>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="sm" color="gray.600">
                    Recover your previous survey session by providing one of the following:
                  </Text>

                  {recoveryError && (
                    <Alert.Root status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{recoveryError}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}

                  <VStack spacing={3} align="stretch">
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Email Address</Text>
                      <HStack>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                        />
                        <Button
                          onClick={() => recoverSession(recoveryEmail)}
                          disabled={!recoveryEmail || loading}
                          size="sm"
                          px={5}
                          py={2}
                        >
                          Recover
                        </Button>
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontWeight="semibold" mb={2}>Company Name</Text>
                      <HStack>
                        <Input
                          type="text"
                          placeholder="Enter your company name"
                          value={recoveryCompany}
                          onChange={(e) => setRecoveryCompany(e.target.value)}
                        />
                        <Button
                          onClick={() => recoverSession(undefined, recoveryCompany)}
                          disabled={!recoveryCompany || loading}
                          size="sm"
                          px={5}
                          py={2}
                        >
                          Recover
                        </Button>
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontWeight="semibold" mb={2}>Session ID</Text>
                      <HStack>
                        <Input
                          type="text"
                          placeholder="Enter your session ID"
                          value={recoverySessionId}
                          onChange={(e) => setRecoverySessionId(e.target.value)}
                        />
                        <Button
                          onClick={() => recoverSession(undefined, undefined, recoverySessionId)}
                          disabled={!recoverySessionId || loading}
                          size="sm"
                          px={5}
                          py={2}
                        >
                          Recover
                        </Button>
                      </HStack>
                    </Box>
                  </VStack>
                </VStack>
              </Card.Body>
            )}
          </Card.Root>
        )}

        {/* Survey */}
        <Card.Root maxW="800px" w="100%">
          <Card.Body>
            <Survey model={survey} />
          </Card.Body>
        </Card.Root>
          </VStack>
        </Container>
      </Box>

      {/* Session Selection Dialog */}
      <Dialog.Root open={showSessionSelector} onOpenChange={(e) => setShowSessionSelector(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Multiple Sessions Found</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  We found multiple survey sessions for {recoveryCompany}. Please select which one you'd like to continue:
                </Text>

                <VStack gap={2} align="stretch">
                  {availableSessions.map((session) => (
                    <Card.Root
                      key={session.session_id}
                      variant="outline"
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                      onClick={() => handleSessionSelect(session)}
                    >
                      <Card.Body py={3}>
                        <VStack align="start" gap={1}>
                          <Text fontWeight="semibold">{session.respondent_email}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {session.respondent_name && `${session.respondent_name} • `}
                            Started: {new Date(session.created_at).toLocaleDateString()}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Progress: {Number(session.completion_percentage || 0).toFixed(0)}% •
                            Last activity: {new Date(session.last_activity || session.updated_at).toLocaleDateString()}
                          </Text>
                        </VStack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </VStack>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="outline"
                onClick={() => setShowSessionSelector(false)}
              >
                Cancel
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Existing Email Dialog */}
      <Dialog.Root open={showExistingEmailDialog} onOpenChange={(e) => setShowExistingEmailDialog(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Email Already Used</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Existing Survey Found</Alert.Title>
                    <Alert.Description>
                      This email address already has a survey session. You can load the existing session or create a new one.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>

                {existingSession && (
                  <Card.Root variant="outline">
                    <Card.Body py={3}>
                      <VStack align="start" gap={2}>
                        <Text fontWeight="semibold">Existing Session Details:</Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Email:</strong> {existingSession.respondent_email}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Company:</strong> {existingSession.company_name}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Progress:</strong> {Number(existingSession.completion_percentage || 0).toFixed(0)}%
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Last Activity:</strong> {new Date(existingSession.last_activity || existingSession.updated_at).toLocaleDateString()}
                        </Text>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                )}

                <Text fontSize="sm" color="gray.600">
                  What would you like to do?
                </Text>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={3}>
                <Button
                  variant="outline"
                  onClick={() => setShowExistingEmailDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="agiloft"
                  onClick={handleLoadExistingSession}
                >
                  Load Existing Session
                </Button>
                <Button
                  colorPalette="orange"
                  onClick={handleCreateNewAnyway}
                >
                  Create New Anyway
                </Button>
              </HStack>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}