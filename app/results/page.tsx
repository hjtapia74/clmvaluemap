'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Card,
  Button,
  Table,
  Spinner,
  Box,
  Alert
} from '@chakra-ui/react';
import { Config } from '@/lib/config';
import { getSessionResults, getSession, calculateAndSaveResults } from '@/lib/api/client';
import { SurveyResultsSummary, SurveySession } from '@/lib/db/models';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SurveyResultsSummary[]>([]);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);

      // Load session data
      const sessionResult = await getSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        setError(sessionResult.error || 'Session not found');
        return;
      }
      setSession(sessionResult.session);

      // Load results
      let resultsResult = await getSessionResults(sessionId);

      // If no results exist, calculate them first
      if (!resultsResult.results || resultsResult.results.length === 0) {
        console.log('No results found, calculating results for session:', sessionId);
        const calcResult = await calculateAndSaveResults(sessionId);
        if (calcResult.success) {
          // Reload results after calculation
          resultsResult = await getSessionResults(sessionId);
        }
      }

      if (!resultsResult.success) {
        setError(resultsResult.error || 'Failed to load results');
        return;
      }

      setResults(resultsResult.results || []);

      if (!resultsResult.results || resultsResult.results.length === 0) {
        setError('No results found for this session. Please ensure you have answered at least some questions.');
      }
    } catch (err) {
      console.error('Failed to load results:', err);
      setError('Failed to load results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!results || results.length === 0) return;

    const headers = ['Stage', 'Average Score', 'Scaled Score (0-100)', 'Questions Answered', 'Total Questions'];
    const rows = results.map(r => [
      r.stage_name,
      Number(r.stage_average)?.toFixed(2) || 'N/A',
      Number(r.stage_scaled_score)?.toFixed(2) || 'N/A',
      Number(r.answered_count) || 0,
      Number(r.question_count) || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clm-assessment-results-${sessionId}.csv`;
    link.click();
  };

  const exportChartAsImage = () => {
    // This will be handled by Plotly's built-in download button
    const plotElement = document.querySelector('.js-plotly-plot') as any;
    if (plotElement && plotElement._fullLayout) {
      (window as any).Plotly.downloadImage(plotElement, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: `clm-assessment-radar-${sessionId}`
      });
    }
  };

  const startNewSurvey = () => {
    // Clear local storage to ensure a fresh start
    if (typeof window !== 'undefined') {
      localStorage.removeItem('surveySessionId');
      localStorage.removeItem('surveyResponses');
    }
    // Redirect to home page to start a new survey
    router.push('/');
  };

  const backToSurvey = () => {
    // Navigate back to survey with current session
    router.push(`/?sessionId=${sessionId}`);
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text>Loading results...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={6} align="stretch">
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>

          {/* Action buttons */}
          <HStack justify="center" gap={4}>
            {sessionId && (
              <Button onClick={backToSurvey} colorPalette="blue" size="lg">
                ← Back to Survey
              </Button>
            )}
            <Button onClick={startNewSurvey} colorPalette="green" variant="outline" size="lg">
              Start New Survey
            </Button>
          </HStack>
        </VStack>
      </Container>
    );
  }

  // Prepare data for radar chart
  const categories = Config.BENCHMARK_DATA.stages;
  const selfAssessmentScores = categories.map(stageName => {
    const result = results.find(r => r.stage_name === stageName);
    return Number(result?.stage_scaled_score) || 0;
  });

  const radarData = [
    {
      type: 'scatterpolar',
      r: selfAssessmentScores,
      theta: categories.map(s => s.replace('CLM Stage ', 'Stage ')),
      fill: 'toself',
      name: 'Self Assessment',
      line: { color: Config.COLORS.primary },
      fillcolor: 'rgba(0, 69, 124, 0.2)'
    },
    {
      type: 'scatterpolar',
      r: Config.BENCHMARK_DATA.peerAverage.map(v => v * 10), // Scale to 0-100
      theta: categories.map(s => s.replace('CLM Stage ', 'Stage ')),
      fill: 'toself',
      name: 'Peer Average',
      line: { color: Config.COLORS.warning },
      fillcolor: 'rgba(237, 137, 54, 0.1)'
    },
    {
      type: 'scatterpolar',
      r: Config.BENCHMARK_DATA.bestInClass.map(v => v * 10), // Scale to 0-100
      theta: categories.map(s => s.replace('CLM Stage ', 'Stage ')),
      fill: 'toself',
      name: 'Best in Class',
      line: { color: Config.COLORS.success },
      fillcolor: 'rgba(72, 187, 120, 0.1)'
    }
  ];

  const radarLayout = {
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickmode: 'linear',
        tick0: 0,
        dtick: 20
      }
    },
    showlegend: true,
    legend: {
      x: 0.85,
      y: 1
    },
    title: 'CLM Maturity Assessment Results',
    font: {
      family: 'system-ui, -apple-system, sans-serif'
    }
  };

  // Calculate overall completion and average
  const totalAnswered = results.reduce((sum, r) => sum + (Number(r.answered_count) || 0), 0);
  const totalQuestions = results.reduce((sum, r) => sum + (Number(r.question_count) || 0), 0);
  const overallCompletion = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;
  const overallAverage = results.length > 0
    ? results.reduce((sum, r) => sum + (Number(r.stage_average) || 0), 0) / results.length
    : 0;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack>
            <Box as="img" src={Config.LOGO_URL} alt="Agiloft" h="40px" mr={10} />
            <VStack align="start" gap={0}>
              <Heading size="lg">{Config.APP_TITLE}</Heading>
              <Text fontSize="sm" color="gray.600">{Config.APP_SUBTITLE}</Text>
            </VStack>
          </HStack>
          <HStack gap={3}>
            <Button onClick={backToSurvey} colorPalette="orange" size="md">
              ← Edit Answers
            </Button>
            <Button onClick={startNewSurvey} colorPalette="green" variant="outline" size="md">
              Start New Survey
            </Button>
            <Box w="1px" h="30px" bg="gray.300" />
            <Button onClick={exportToCSV} colorPalette="blue" variant="outline" size="md">
              Export CSV
            </Button>
            <Button onClick={exportChartAsImage} colorPalette="blue" size="md">
              Export Chart
            </Button>
          </HStack>
        </HStack>

        {/* Session Info */}
        {session && (
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Results for {session.company_name} | {session.respondent_email}
          </Text>
        )}

        {/* Completion Warning */}
        {overallCompletion < Config.MIN_COMPLETION_FOR_MEANINGFUL && (
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Incomplete Assessment</Alert.Title>
              <Alert.Description>
                You've completed {overallCompletion.toFixed(0)}% of the assessment.
                For more meaningful results, we recommend completing at least {Config.MIN_COMPLETION_FOR_MEANINGFUL}% of the questions.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Summary Stats */}
        <Box mt={4}>
          <HStack spacing={4} justify="center">
          {/* Overall Average Card */}
          <Card.Root flex={1} maxW="300px">
            <Card.Body textAlign="center">
              <VStack gap={2}>
                <Text fontSize="3xl" fontWeight="bold" color={Config.COLORS.primary}>
                  {overallAverage.toFixed(1)}
                </Text>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Overall Average (1-5)
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Scaled Score Card */}
          <Card.Root flex={1} maxW="300px">
            <Card.Body textAlign="center">
              <VStack gap={2}>
                <Text fontSize="3xl" fontWeight="bold" color={Config.COLORS.secondary}>
                  {((overallAverage - 1) * 25).toFixed(0)}
                </Text>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Scaled Score (0-100)
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Completion Card */}
          <Card.Root flex={1} maxW="300px">
            <Card.Body textAlign="center">
              <VStack gap={2}>
                <Text fontSize="3xl" fontWeight="bold" color={Config.COLORS.success}>
                  {overallCompletion.toFixed(0)}%
                </Text>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Completion
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          </HStack>
        </Box>

        {/* Chart and Table Sections */}
        <VStack gap={6} align="stretch">
          {/* Radar Chart */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Radar Chart</Heading>
            </Card.Header>
            <Card.Body>
              <Box height="600px">
                <Plot
                  data={radarData as any}
                  layout={radarLayout}
                  config={{
                    responsive: true,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `clm-assessment-radar-${sessionId}`,
                      height: 800,
                      width: 1200,
                      scale: 1
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            </Card.Body>
          </Card.Root>

          {/* Detailed Scores Table */}
          <Card.Root>
            <Card.Header>
              <Heading size="md">Detailed Scores</Heading>
            </Card.Header>
            <Card.Body>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Stage</Table.ColumnHeader>
                    <Table.ColumnHeader>Average (1-5)</Table.ColumnHeader>
                    <Table.ColumnHeader>Scaled (0-100)</Table.ColumnHeader>
                    <Table.ColumnHeader>Peer Avg</Table.ColumnHeader>
                    <Table.ColumnHeader>Best in Class</Table.ColumnHeader>
                    <Table.ColumnHeader>Gap to Peer</Table.ColumnHeader>
                    <Table.ColumnHeader>Completion</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {categories.map((stageName, idx) => {
                    const result = results.find(r => r.stage_name === stageName);
                    const scaled = Number(result?.stage_scaled_score) || 0;
                    const peerScaled = Config.BENCHMARK_DATA.peerAverage[idx] * 10;
                    const bestScaled = Config.BENCHMARK_DATA.bestInClass[idx] * 10;
                    const gap = scaled - peerScaled;
                    const completion = result
                      ? ((Number(result.answered_count) || 0) / (Number(result.question_count) || 1)) * 100
                      : 0;

                    return (
                      <Table.Row key={`table-${idx}-${stageName}`}>
                        <Table.Cell>{stageName.replace('CLM Stage ', 'Stage ')}</Table.Cell>
                        <Table.Cell>{Number(result?.stage_average)?.toFixed(2) || 'N/A'}</Table.Cell>
                        <Table.Cell>{scaled.toFixed(0)}</Table.Cell>
                        <Table.Cell>{peerScaled.toFixed(0)}</Table.Cell>
                        <Table.Cell>{bestScaled.toFixed(0)}</Table.Cell>
                        <Table.Cell>
                          <Text color={gap >= 0 ? 'green.600' : 'red.600'}>
                            {gap >= 0 ? '+' : ''}{gap.toFixed(0)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{completion.toFixed(0)}%</Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>
        </VStack>

        {/* Insights */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Key Insights</Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              {results.map((result) => {
                const idx = categories.indexOf(result.stage_name);
                if (idx === -1) return null;

                const scaled = Number(result.stage_scaled_score) || 0;
                const peerScaled = Config.BENCHMARK_DATA.peerAverage[idx] * 10;
                const gap = scaled - peerScaled;

                if (Math.abs(gap) < 5) return null; // Skip if gap is small

                return (
                  <Alert.Root
                    key={`${result.session_id}-${result.stage_name}-${idx}`}
                    status={gap > 0 ? 'success' : 'warning'}
                  >
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{result.stage_name.replace('CLM Stage ', 'Stage ')}</Alert.Title>
                      <Alert.Description>
                        {gap > 0
                          ? `Performing ${gap.toFixed(0)} points above peer average`
                          : `${Math.abs(gap).toFixed(0)} points below peer average - consider improvement`}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                );
              })}
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
}