'use client';

import { Card, VStack, Text, HStack, Badge } from '@chakra-ui/react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  icon?: string;
  colorPalette?: string;
}

export default function StatsCard({
  label,
  value,
  subValue,
  change,
  icon,
  colorPalette = 'blue',
}: StatsCardProps) {
  const getChangeColor = () => {
    if (change === undefined) return undefined;
    if (change > 0) return 'green';
    if (change < 0) return 'red';
    return 'gray';
  };

  const formatChange = () => {
    if (change === undefined) return null;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  return (
    <Card.Root flex={1} minW="200px">
      <Card.Body p={6}>
        <VStack gap={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              {label}
            </Text>
            {icon && <Text fontSize="lg">{icon}</Text>}
          </HStack>
          <HStack align="baseline" gap={2}>
            <Text fontSize="3xl" fontWeight="bold" color={`${colorPalette}.600`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            {change !== undefined && (
              <Badge colorPalette={getChangeColor()} size="sm">
                {formatChange()}
              </Badge>
            )}
          </HStack>
          {subValue && (
            <Text fontSize="xs" color="fg.muted">
              {subValue}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
