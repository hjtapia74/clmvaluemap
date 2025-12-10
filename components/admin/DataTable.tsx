'use client';

import {
  Box,
  Table,
  Button,
  HStack,
  Text,
  Input,
  VStack,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  pagination,
  sorting,
  onRowClick,
  actions,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, onSearch]);

  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const handleSort = (column: Column<T>) => {
    if (column.sortable && sorting) {
      sorting.onSort(column.key as string);
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || !sorting) return null;
    if (sorting.sortBy !== column.key) return ' ↕';
    return sorting.sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <VStack gap={4} align="stretch" w="100%">
      {searchable && (
        <Box>
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxW="300px"
          />
        </Box>
      )}

      <Box overflowX="auto" borderRadius="md" border="1px solid" borderColor="border.subtle">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              {columns.map((column) => (
                <Table.ColumnHeader
                  key={column.key as string}
                  cursor={column.sortable ? 'pointer' : 'default'}
                  onClick={() => handleSort(column)}
                  _hover={column.sortable ? { bg: 'gray.100', _dark: { bg: 'gray.700' } } : {}}
                  w={column.width}
                >
                  {column.header}
                  {getSortIcon(column)}
                </Table.ColumnHeader>
              ))}
              {actions && <Table.ColumnHeader w="100px">Actions</Table.ColumnHeader>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length + (actions ? 1 : 0)}>
                  <HStack justify="center" py={8}>
                    <Spinner size="md" />
                    <Text color="fg.muted">Loading...</Text>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ) : data.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length + (actions ? 1 : 0)}>
                  <Text textAlign="center" color="fg.muted" py={8}>
                    {emptyMessage}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              data.map((item) => (
                <Table.Row
                  key={String(item[keyField])}
                  cursor={onRowClick ? 'pointer' : 'default'}
                  _hover={onRowClick ? { bg: 'gray.50', _dark: { bg: 'gray.800' } } : {}}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <Table.Cell key={column.key as string}>
                      {column.render
                        ? column.render(item)
                        : String(getValue(item, column.key as string) ?? '-')}
                    </Table.Cell>
                  ))}
                  {actions && (
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      {actions(item)}
                    </Table.Cell>
                  )}
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {pagination && pagination.totalPages > 1 && (
        <HStack justify="space-between" px={2}>
          <Text fontSize="sm" color="fg.muted">
            Page {pagination.page} of {pagination.totalPages}
          </Text>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}

// Helper component for status badges
export function StatusBadge({ completed }: { completed: boolean }) {
  return (
    <Badge colorPalette={completed ? 'green' : 'yellow'} size="sm">
      {completed ? 'Completed' : 'In Progress'}
    </Badge>
  );
}

// Helper component for progress display
export function ProgressDisplay({ percentage }: { percentage: number }) {
  const getColor = () => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  };

  return (
    <Badge colorPalette={getColor()} size="sm">
      {percentage.toFixed(0)}%
    </Badge>
  );
}
