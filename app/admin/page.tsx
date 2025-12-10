'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Card,
  Spinner,
  Alert,
  Table,
  Badge,
  Button,
  Box,
} from '@chakra-ui/react';
import StatsCard from '@/components/admin/StatsCard';
import { getDashboardStats } from '@/lib/api/adminClient';
import { AdminDashboardStats } from '@/lib/db/connection';
import { SurveySession } from '@/lib/db/models';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<SurveySession[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await getDashboardStats();

      if (!result.success) {
        setError(result.error || 'Failed to load dashboard');
        return;
      }

      setStats(result.stats || null);
      setRecentSessions(result.recentSessions || []);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box>
        <VStack gap={4} py={16}>
          <Spinner size="xl" />
          <Text color="fg.muted">Loading dashboard...</Text>
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
        <Box>
          <Heading size="lg">Dashboard</Heading>
          <Text color="fg.muted">Overview of survey activity and statistics</Text>
        </Box>

        {/* Stats Cards */}
        {stats && (
          <HStack gap={4} flexWrap="wrap">
            <StatsCard
              label="Total Surveys"
              value={stats.totalSurveys}
              icon="📋"
              colorPalette="blue"
            />
            <StatsCard
              label="Completed"
              value={stats.completedSurveys}
              subValue={`${stats.totalSurveys > 0 ? ((stats.completedSurveys / stats.totalSurveys) * 100).toFixed(1) : 0}% completion rate`}
              icon="✅"
              colorPalette="green"
            />
            <StatsCard
              label="In Progress"
              value={stats.inProgressSurveys}
              icon="⏳"
              colorPalette="yellow"
            />
            <StatsCard
              label="Avg. Completion"
              value={`${stats.averageCompletion.toFixed(1)}%`}
              icon="📊"
              colorPalette="purple"
            />
          </HStack>
        )}

        {/* Secondary Stats */}
        {stats && (
          <HStack gap={4} flexWrap="wrap">
            <StatsCard
              label="This Week"
              value={stats.surveysThisWeek}
              subValue="New surveys"
              icon="📅"
              colorPalette="teal"
            />
            <StatsCard
              label="This Month"
              value={stats.surveysThisMonth}
              subValue="New surveys"
              icon="📆"
              colorPalette="cyan"
            />
            <StatsCard
              label="Total Responses"
              value={stats.totalResponses}
              subValue="Individual answers"
              icon="💬"
              colorPalette="orange"
            />
          </HStack>
        )}

        {/* Recent Activity */}
        <Card.Root>
          <Card.Header p={6}>
            <HStack justify="space-between">
              <Heading size="md">Recent Activity</Heading>
              <Button size="sm" variant="outline" onClick={() => router.push('/admin/surveys')}>
                View All
              </Button>
            </HStack>
          </Card.Header>
          <Card.Body pt={0} px={6} pb={6}>
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Company</Table.ColumnHeader>
                    <Table.ColumnHeader>Email</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Progress</Table.ColumnHeader>
                    <Table.ColumnHeader>Last Activity</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {recentSessions.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <Text textAlign="center" color="fg.muted" py={4}>
                          No surveys yet
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    recentSessions.map((session) => (
                      <Table.Row
                        key={session.session_id}
                        cursor="pointer"
                        _hover={{ bg: 'gray.50', _dark: { bg: 'gray.800' } }}
                        onClick={() => router.push(`/admin/surveys/${session.session_id}`)}
                      >
                        <Table.Cell fontWeight="medium">
                          {session.company_name || '-'}
                        </Table.Cell>
                        <Table.Cell>{session.respondent_email || '-'}</Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={session.is_completed ? 'green' : 'yellow'} size="sm">
                            {session.is_completed ? 'Completed' : 'In Progress'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            colorPalette={
                              session.completion_percentage >= 80
                                ? 'green'
                                : session.completion_percentage >= 50
                                ? 'yellow'
                                : 'red'
                            }
                            size="sm"
                          >
                            {session.completion_percentage?.toFixed(0) || 0}%
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>{formatDate(session.last_activity)}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Box>
  );
}
