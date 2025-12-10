'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Button,
  Box,
  Spinner,
  Alert,
} from '@chakra-ui/react';
import { getAnalytics, exportData, downloadBlob } from '@/lib/api/adminClient';
import { AnalyticsData } from '@/lib/db/connection';
import { useColorMode } from '@/components/ui/color-mode';
import { Config } from '@/lib/config';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function AnalyticsPage() {
  const { colorMode } = useColorMode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const result = await getAnalytics();

      if (!result.success) {
        setError(result.error || 'Failed to load analytics');
        return;
      }

      setAnalytics(result.analytics || null);
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const surveysBlob = await exportData('surveys');
      downloadBlob(surveysBlob, `all-surveys-${new Date().toISOString().split('T')[0]}.csv`);

      const responsesBlob = await exportData('responses');
      downloadBlob(responsesBlob, `all-responses-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  const isDark = colorMode === 'dark';
  const textColor = isDark ? '#E2E8F0' : '#2D3748';
  const gridColor = isDark ? '#4A5568' : '#E2E8F0';

  if (loading) {
    return (
      <Box>
        <VStack gap={4} py={16}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading analytics...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }

  return (
    <Box>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="lg">Analytics</Heading>
            <Text color="fg.muted">Survey trends and statistics</Text>
          </Box>
          <Button size="sm" variant="outline" onClick={handleExportAll}>
            Export All Data
          </Button>
        </HStack>

        {analytics && (
          <>
            {/* Completion Rate Over Time */}
            {analytics.completionRates.length > 0 && (
              <Card.Root>
                <Card.Header p={6}>
                  <Heading size="md">Survey Activity (Last 30 Days)</Heading>
                </Card.Header>
                <Card.Body pt={0} px={6} pb={6}>
                  <Box h="300px">
                    <Plot
                      data={[
                        {
                          x: analytics.completionRates.map((r) => r.date),
                          y: analytics.completionRates.map((r) => r.count),
                          type: 'bar',
                          name: 'Total Surveys',
                          marker: { color: Config.COLORS.primary },
                        },
                        {
                          x: analytics.completionRates.map((r) => r.date),
                          y: analytics.completionRates.map((r) => r.completed),
                          type: 'bar',
                          name: 'Completed',
                          marker: { color: Config.COLORS.success },
                        },
                      ]}
                      layout={{
                        barmode: 'group',
                        showlegend: true,
                        legend: { x: 0, y: 1.1, orientation: 'h' as const },
                        margin: { t: 40, b: 60, l: 50, r: 20 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        font: { color: textColor },
                        xaxis: { gridcolor: gridColor },
                        yaxis: { gridcolor: gridColor, title: 'Count' },
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Box>
                </Card.Body>
              </Card.Root>
            )}

            {/* Stage Scores */}
            {analytics.stageScores.length > 0 && (
              <Card.Root>
                <Card.Header p={6}>
                  <Heading size="md">Average Scores by Stage</Heading>
                </Card.Header>
                <Card.Body pt={0} px={6} pb={6}>
                  <Box h="350px">
                    <Plot
                      data={[
                        {
                          x: analytics.stageScores.map((s) => {
                            const shortName = s.stage.replace(/^\d+:\s*/, '');
                            return shortName.length > 15 ? shortName.substring(0, 15) + '...' : shortName;
                          }),
                          y: analytics.stageScores.map((s) => (s.avgScore || 0).toFixed(2)),
                          type: 'bar',
                          name: 'Average Score',
                          marker: { color: Config.COLORS.primary },
                          text: analytics.stageScores.map((s) => `${s.count} surveys`),
                          textposition: 'outside' as const,
                        },
                      ]}
                      layout={{
                        showlegend: false,
                        margin: { t: 40, b: 100, l: 50, r: 20 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        font: { color: textColor },
                        xaxis: { gridcolor: gridColor, tickangle: -45 },
                        yaxis: { gridcolor: gridColor, title: 'Average Score (1-5)', range: [0, 5] },
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Box>
                </Card.Body>
              </Card.Root>
            )}

            <HStack gap={6} flexWrap="wrap" align="stretch">
              {/* Response Distribution */}
              {analytics.responseDistribution.length > 0 && (
                <Card.Root flex={1} minW="300px">
                  <Card.Header p={6}>
                    <Heading size="md">Rating Distribution</Heading>
                  </Card.Header>
                  <Card.Body pt={0} px={6} pb={6}>
                    <Box h="250px">
                      <Plot
                        data={[
                          {
                            x: analytics.responseDistribution.map((r) => `Rating ${r.rating}`),
                            y: analytics.responseDistribution.map((r) => r.count),
                            type: 'bar',
                            marker: {
                              color: analytics.responseDistribution.map((r) => {
                                if (r.rating >= 4) return Config.COLORS.success;
                                if (r.rating >= 3) return Config.COLORS.warning;
                                return Config.COLORS.danger;
                              }),
                            },
                          },
                        ]}
                        layout={{
                          showlegend: false,
                          margin: { t: 20, b: 40, l: 50, r: 20 },
                          paper_bgcolor: 'transparent',
                          plot_bgcolor: 'transparent',
                          font: { color: textColor },
                          xaxis: { gridcolor: gridColor },
                          yaxis: { gridcolor: gridColor, title: 'Count' },
                        }}
                        config={{ responsive: true }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </Box>
                  </Card.Body>
                </Card.Root>
              )}

              {/* Top Companies */}
              {analytics.companySurveys.length > 0 && (
                <Card.Root flex={1} minW="300px">
                  <Card.Header p={6}>
                    <Heading size="md">Top Companies by Surveys</Heading>
                  </Card.Header>
                  <Card.Body pt={0} px={6} pb={6}>
                    <Box h="250px">
                      <Plot
                        data={[
                          {
                            y: analytics.companySurveys.map((c) =>
                              c.company.length > 20 ? c.company.substring(0, 20) + '...' : c.company
                            ).reverse(),
                            x: analytics.companySurveys.map((c) => c.count).reverse(),
                            type: 'bar',
                            orientation: 'h' as const,
                            marker: { color: Config.COLORS.primary },
                          },
                        ]}
                        layout={{
                          showlegend: false,
                          margin: { t: 20, b: 40, l: 120, r: 20 },
                          paper_bgcolor: 'transparent',
                          plot_bgcolor: 'transparent',
                          font: { color: textColor },
                          xaxis: { gridcolor: gridColor, title: 'Surveys' },
                          yaxis: { gridcolor: gridColor },
                        }}
                        config={{ responsive: true }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </Box>
                  </Card.Body>
                </Card.Root>
              )}
            </HStack>

            {/* Empty state if no data */}
            {analytics.completionRates.length === 0 &&
              analytics.stageScores.length === 0 &&
              analytics.responseDistribution.length === 0 && (
                <Card.Root>
                  <Card.Body p={6}>
                    <Text textAlign="center" color="fg.muted" py={8}>
                      No analytics data available yet. Start collecting survey responses to see trends.
                    </Text>
                  </Card.Body>
                </Card.Root>
              )}
          </>
        )}
      </VStack>
    </Box>
  );
}
