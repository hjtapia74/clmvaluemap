'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Box,
  Badge,
  Alert,
} from '@chakra-ui/react';
import DataTable, { Column, StatusBadge, ProgressDisplay } from '@/components/admin/DataTable';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { getSurveys, deleteSurvey, exportData, downloadBlob, SurveyListParams } from '@/lib/api/adminClient';
import { SurveySession } from '@/lib/db/models';

export default function SurveysListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SurveySession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [sortBy, setSortBy] = useState<SurveyListParams['sortBy']>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSurveys({
        page,
        limit: 20,
        search,
        status,
        sortBy,
        sortOrder,
      });

      if (!result.success) {
        setError(result.error || 'Failed to load surveys');
        return;
      }

      setSessions(result.sessions || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Load surveys error:', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, sortBy, sortOrder]);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column as SurveyListParams['sortBy']);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleteLoading(true);
      const result = await deleteSurvey(deleteId);

      if (result.success) {
        loadSurveys();
      } else {
        setError(result.error || 'Failed to delete survey');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete survey');
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportData('surveys');
      downloadBlob(blob, `surveys-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: Column<SurveySession>[] = [
    {
      key: 'company_name',
      header: 'Company',
      sortable: true,
      render: (item) => (
        <Text fontWeight="medium">{item.company_name || '-'}</Text>
      ),
    },
    {
      key: 'respondent_email',
      header: 'Email',
      render: (item) => item.respondent_email || '-',
    },
    {
      key: 'respondent_name',
      header: 'Name',
      render: (item) => item.respondent_name || '-',
    },
    {
      key: 'is_completed',
      header: 'Status',
      render: (item) => <StatusBadge completed={item.is_completed} />,
    },
    {
      key: 'completion_percentage',
      header: 'Progress',
      sortable: true,
      render: (item) => <ProgressDisplay percentage={item.completion_percentage || 0} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (item) => formatDate(item.created_at),
    },
    {
      key: 'last_activity',
      header: 'Last Activity',
      sortable: true,
      render: (item) => formatDate(item.last_activity),
    },
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="lg">Surveys</Heading>
            <Text color="fg.muted">
              {total} total {total === 1 ? 'survey' : 'surveys'}
            </Text>
          </Box>
          <HStack gap={2}>
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
          </HStack>
        </HStack>

        {/* Filters */}
        <HStack gap={2} flexWrap="wrap">
          <Button
            size="sm"
            variant={status === 'all' ? 'solid' : 'outline'}
            onClick={() => { setStatus('all'); setPage(1); }}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={status === 'completed' ? 'solid' : 'outline'}
            colorPalette="green"
            onClick={() => { setStatus('completed'); setPage(1); }}
          >
            Completed
          </Button>
          <Button
            size="sm"
            variant={status === 'in_progress' ? 'solid' : 'outline'}
            colorPalette="yellow"
            onClick={() => { setStatus('in_progress'); setPage(1); }}
          >
            In Progress
          </Button>
        </HStack>

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={sessions}
          keyField="session_id"
          loading={loading}
          searchable
          searchPlaceholder="Search by company, email, or name..."
          onSearch={handleSearch}
          pagination={{
            page,
            totalPages,
            onPageChange: setPage,
          }}
          sorting={{
            sortBy: sortBy || 'created_at',
            sortOrder,
            onSort: handleSort,
          }}
          onRowClick={(item) => router.push(`/admin/surveys/${item.session_id}`)}
          actions={(item) => (
            <HStack gap={1}>
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/admin/surveys/${item.session_id}`);
                }}
              >
                View
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(item.session_id);
                }}
              >
                Delete
              </Button>
            </HStack>
          )}
          emptyMessage="No surveys found"
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
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
