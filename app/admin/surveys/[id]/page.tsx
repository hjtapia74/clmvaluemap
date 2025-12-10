'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Button,
  Box,
  Badge,
  Table,
  Progress,
  Spinner,
  Alert,
  Separator,
  Tabs,
} from '@chakra-ui/react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { getSurveyDetails, deleteSurvey, exportData, downloadBlob } from '@/lib/api/adminClient';
import { SurveySession, SurveyResponse, StageProgress, SurveyResultsSummary } from '@/lib/db/models';
import { Config } from '@/lib/config';
import { useColorMode } from '@/components/ui/color-mode';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SurveyDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { colorMode } = useColorMode();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [progress, setProgress] = useState<StageProgress[]>([]);
  const [results, setResults] = useState<SurveyResultsSummary[]>([]);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadSurveyDetails();
  }, [id]);

  const loadSurveyDetails = async () => {
    try {
      setLoading(true);
      const result = await getSurveyDetails(id);

      if (!result.success) {
        setError(result.error || 'Failed to load survey');
        return;
      }

      setSession(result.session || null);
      setResponses(result.responses || []);
      setProgress(result.progress || []);
      setResults(result.results || []);
    } catch (err) {
      console.error('Load survey error:', err);
      setError('Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const result = await deleteSurvey(id);

      if (result.success) {
        router.push('/admin/surveys');
      } else {
        setError(result.error || 'Failed to delete survey');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete survey');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExport = async (type: 'surveys' | 'responses') => {
    try {
      const blob = await exportData(type, id);
      downloadBlob(blob, `survey-${type}-${id}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group responses by stage
  const responsesByStage = responses.reduce((acc, response) => {
    if (!acc[response.stage_name]) {
      acc[response.stage_name] = [];
    }
    acc[response.stage_name].push(response);
    return acc;
  }, {} as Record<string, SurveyResponse[]>);

  // Prepare radar chart data
  const radarData = () => {
    if (results.length === 0) return null;

    const stageOrder = ['1:', '2:', '3:', '4:', '5:', '6:'];
    const sortedResults = [...results].sort((a, b) => {
      const aOrder = stageOrder.findIndex(s => a.stage_name.startsWith(s));
      const bOrder = stageOrder.findIndex(s => b.stage_name.startsWith(s));
      return aOrder - bOrder;
    });

    const categories = sortedResults.map(r => {
      const shortName = r.stage_name.replace(/^\d+:\s*/, '');
      return shortName.length > 20 ? shortName.substring(0, 20) + '...' : shortName;
    });
    const scores = sortedResults.map(r => r.stage_scaled_score || 0);

    const isDark = colorMode === 'dark';

    return [
      {
        type: 'scatterpolar' as const,
        r: [...scores, scores[0]], // Close the polygon
        theta: [...categories, categories[0]],
        fill: 'toself',
        name: 'Self Assessment',
        line: { color: Config.COLORS.primary },
        fillcolor: isDark ? 'rgba(38, 58, 92, 0.3)' : 'rgba(38, 58, 92, 0.2)',
      },
      {
        type: 'scatterpolar' as const,
        r: [...Config.BENCHMARK_DATA.peerAverage.map(v => v * 10), Config.BENCHMARK_DATA.peerAverage[0] * 10],
        theta: [...categories, categories[0]],
        fill: 'toself',
        name: 'Peer Average',
        line: { color: '#718096', dash: 'dash' as const },
        fillcolor: 'transparent',
      },
      {
        type: 'scatterpolar' as const,
        r: [...Config.BENCHMARK_DATA.bestInClass.map(v => v * 10), Config.BENCHMARK_DATA.bestInClass[0] * 10],
        theta: [...categories, categories[0]],
        fill: 'toself',
        name: 'Best in Class',
        line: { color: Config.COLORS.success, dash: 'dot' as const },
        fillcolor: 'transparent',
      },
    ];
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4} py={16}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading survey details...</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !session) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error || 'Survey not found'}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
        <Button mt={4} onClick={() => router.push('/admin/surveys')}>
          Back to Surveys
        </Button>
      </Container>
    );
  }

  const chartData = radarData();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Button variant="ghost" size="sm" mb={2} onClick={() => router.push('/admin/surveys')}>
              ← Back to Surveys
            </Button>
            <Heading size="lg">{session.company_name || 'Unnamed Survey'}</Heading>
            <Text color="fg.muted">{session.respondent_email}</Text>
          </Box>
          <HStack gap={2}>
            <Button size="sm" variant="outline" onClick={() => handleExport('responses')}>
              Export Responses
            </Button>
            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Survey
            </Button>
          </HStack>
        </HStack>

        {/* Session Info Card */}
        <Card.Root>
          <Card.Body>
            <HStack gap={8} flexWrap="wrap">
              <Box>
                <Text fontSize="sm" color="fg.muted">Company</Text>
                <Text fontWeight="medium">{session.company_name || '-'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Name</Text>
                <Text fontWeight="medium">{session.respondent_name || '-'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Email</Text>
                <Text fontWeight="medium">{session.respondent_email || '-'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Status</Text>
                <Badge colorPalette={session.is_completed ? 'green' : 'yellow'}>
                  {session.is_completed ? 'Completed' : 'In Progress'}
                </Badge>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Progress</Text>
                <Text fontWeight="medium">{session.completion_percentage?.toFixed(0) || 0}%</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Created</Text>
                <Text fontWeight="medium">{formatDate(session.created_at)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Last Activity</Text>
                <Text fontWeight="medium">{formatDate(session.last_activity)}</Text>
              </Box>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Stage Progress */}
        {progress.length > 0 && (
          <Card.Root>
            <Card.Header>
              <Heading size="md">Stage Progress</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                {progress
                  .sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0))
                  .map((p) => (
                    <Box key={p.stage_name}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">{p.stage_name}</Text>
                        <Text fontSize="sm" color="fg.muted">
                          {p.answered_questions}/{p.total_questions} questions
                        </Text>
                      </HStack>
                      <Progress.Root value={p.completion_percentage || 0} size="sm">
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                    </Box>
                  ))}
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Tabs for Results and Responses */}
        <Tabs.Root defaultValue="results">
          <Tabs.List>
            <Tabs.Trigger value="results">Results</Tabs.Trigger>
            <Tabs.Trigger value="responses">Responses ({responses.length})</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="results">
            {results.length > 0 ? (
              <VStack gap={4} align="stretch" pt={4}>
                {/* Radar Chart */}
                {chartData && (
                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">Assessment Results</Heading>
                    </Card.Header>
                    <Card.Body>
                      <Box h="400px">
                        <Plot
                          data={chartData}
                          layout={{
                            polar: {
                              radialaxis: {
                                visible: true,
                                range: [0, 100],
                              },
                            },
                            showlegend: true,
                            legend: { x: 0, y: -0.2, orientation: 'h' as const },
                            margin: { t: 40, b: 80, l: 40, r: 40 },
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            font: { color: colorMode === 'dark' ? '#E2E8F0' : '#2D3748' },
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </Box>
                    </Card.Body>
                  </Card.Root>
                )}

                {/* Results Table */}
                <Card.Root>
                  <Card.Header>
                    <Heading size="md">Score Summary</Heading>
                  </Card.Header>
                  <Card.Body p={0}>
                    <Box overflowX="auto">
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>Stage</Table.ColumnHeader>
                            <Table.ColumnHeader>Average (1-5)</Table.ColumnHeader>
                            <Table.ColumnHeader>Score (0-100)</Table.ColumnHeader>
                            <Table.ColumnHeader>Questions</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {results
                            .sort((a, b) => a.stage_name.localeCompare(b.stage_name))
                            .map((r) => (
                              <Table.Row key={r.stage_name}>
                                <Table.Cell>{r.stage_name}</Table.Cell>
                                <Table.Cell>{r.stage_average?.toFixed(2) || '-'}</Table.Cell>
                                <Table.Cell>
                                  <Badge
                                    colorPalette={
                                      (r.stage_scaled_score || 0) >= 70
                                        ? 'green'
                                        : (r.stage_scaled_score || 0) >= 50
                                        ? 'yellow'
                                        : 'red'
                                    }
                                  >
                                    {r.stage_scaled_score?.toFixed(1) || '-'}
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  {r.answered_count}/{r.question_count}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                  </Card.Body>
                </Card.Root>
              </VStack>
            ) : (
              <Card.Root mt={4}>
                <Card.Body>
                  <Text color="fg.muted" textAlign="center">
                    No results calculated yet. Complete more questions to see results.
                  </Text>
                </Card.Body>
              </Card.Root>
            )}
          </Tabs.Content>

          <Tabs.Content value="responses">
            <VStack gap={4} align="stretch" pt={4}>
              {Object.entries(responsesByStage).length === 0 ? (
                <Card.Root>
                  <Card.Body>
                    <Text color="fg.muted" textAlign="center">
                      No responses recorded yet.
                    </Text>
                  </Card.Body>
                </Card.Root>
              ) : (
                Object.entries(responsesByStage)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([stageName, stageResponses]) => (
                    <Card.Root key={stageName}>
                      <Card.Header>
                        <Heading size="sm">{stageName}</Heading>
                      </Card.Header>
                      <Card.Body p={0}>
                        <Box overflowX="auto">
                          <Table.Root size="sm">
                            <Table.Header>
                              <Table.Row>
                                <Table.ColumnHeader w="50%">Question</Table.ColumnHeader>
                                <Table.ColumnHeader>Rating</Table.ColumnHeader>
                                <Table.ColumnHeader>Answered</Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {stageResponses.map((r, idx) => (
                                <Table.Row key={idx}>
                                  <Table.Cell>
                                    <Text fontSize="sm" noOfLines={2}>
                                      {r.capability}
                                    </Text>
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Badge
                                      colorPalette={
                                        r.rating >= 4 ? 'green' : r.rating >= 3 ? 'yellow' : 'red'
                                      }
                                    >
                                      {r.rating}/5
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell>
                                    {formatDate(r.answered_at)}
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </Box>
                      </Card.Body>
                    </Card.Root>
                  ))
              )}
            </VStack>
          </Tabs.Content>
        </Tabs.Root>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Survey"
          message="Are you sure you want to delete this survey? This action cannot be undone and will remove all responses and results."
          confirmText="Delete"
          isLoading={deleteLoading}
          variant="danger"
        />
      </VStack>
    </Container>
  );
}
