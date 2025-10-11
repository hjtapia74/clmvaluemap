'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Card,
  Badge,
  Separator,
  Icon
} from '@chakra-ui/react';
import { Config } from '@/lib/config';

// Helper function to get compact stage names for completed stages
const getCompactStageName = (stageName: string): string => {
  const stageNumber = stageName.match(/Stage (\d+)/)?.[1];
  const mapping: Record<string, string> = {
    '1': 'Stage 1: e-Document ✓',
    '2': 'Stage 2: e-Signature ✓',
    '3': 'Stage 3: Workflow ✓',
    '4': 'Stage 4: Authoring ✓',
    '5': 'Stage 5: Intelligence ✓',
    '6': 'Stage 6: Execution ✓'
  };
  return stageNumber ? mapping[stageNumber] || stageName.replace('CLM Stage ', 'Stage ') : stageName.replace('CLM Stage ', 'Stage ');
};

interface SidebarNavigationProps {
  currentPage?: number;
  stageProgresses: Record<string, number>;
  overallProgress: number;
  sessionId: string;
  userEmail?: string;
  userName?: string;
  onStageSelect?: (pageIndex: number) => void;
  onResultsSelect?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function SidebarNavigation({
  currentPage = 0,
  stageProgresses,
  overallProgress,
  sessionId,
  userEmail,
  userName,
  onStageSelect,
  onResultsSelect,
  isOpen = true,
  onClose
}: SidebarNavigationProps) {
  // Get stage information from survey JSON
  const stages = Object.entries(Config.STAGE_RADAR_NAMES);

  return (
    <Box
      w="300px"
      h="100vh"
      bg="bg.subtle"
      borderRight="1px solid"
      borderColor="border.subtle"
      position="fixed"
      left={isOpen ? "0" : "-300px"}
      top="0"
      overflowY="auto"
      p={4}
      zIndex={10}
      transition="left 0.3s ease-in-out"
      display={isOpen ? "block" : "none"}
    >
      <VStack gap={4} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="lg" fontWeight="bold" color="agiloft.fg">
                CLM Self-Assessment
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Navigation & Progress
              </Text>
            </VStack>
            {/* Close button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              ✕
            </Button>
          </HStack>
        </Box>

        {/* Overall Progress */}
        <Card.Root size="sm">
          <Card.Body p={4}>
            <VStack gap={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="medium">Overall Progress</Text>
                <Badge colorPalette={overallProgress >= 100 ? 'green' : 'agiloft'}>
                  {overallProgress.toFixed(0)}%
                </Badge>
              </HStack>
              <Progress.Root value={overallProgress} size="sm" colorPalette="agiloft">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Separator />

        {/* Stage Navigation */}
        <VStack gap={2} align="stretch">
          <Text fontSize="md" fontWeight="semibold" color="fg.emphasized">
            Survey Stages
          </Text>

          {stages.map(([key, stageName], index) => {
            const progress = stageProgresses[key] || 0;
            // Fix: currentPage is SurveyJS page index, need to account for intro and user_info pages
            const isActive = currentPage === index + 2; // +2 for intro and user_info pages
            const isCompleted = progress >= 100;

            return (
              <Button
                key={key}
                variant={isActive ? "solid" : "ghost"}
                colorPalette={isCompleted ? 'green' : isActive ? 'agiloft' : 'gray'}
                size="sm"
                justifyContent="flex-start"
                p={3}
                h="auto"
                onClick={() => onStageSelect?.(index)}
                position="relative"
              >
                <VStack gap={1} align="stretch" w="100%">
                  <HStack justify="space-between" w="100%">
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      textAlign="left"
                      noOfLines={2}
                    >
                      {isCompleted
                        ? getCompactStageName(stageName)
                        : stageName.replace('CLM Stage ', 'Stage ')
                      }
                    </Text>
                    <HStack gap={1}>
                      {!isCompleted && (
                        <Text fontSize="xs" fontWeight="bold">
                          {progress.toFixed(0)}%
                        </Text>
                      )}
                    </HStack>
                  </HStack>

                  <Progress.Root
                    value={progress}
                    size="xs"
                    colorPalette={isCompleted ? 'green' : 'agiloft'}
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </VStack>
              </Button>
            );
          })}
        </VStack>

        <Separator />

        {/* Results Navigation */}
        <VStack gap={2} align="stretch">
          <Text fontSize="md" fontWeight="semibold" color="fg.emphasized">
            Analysis
          </Text>

          <Button
            variant="outline"
            colorPalette={overallProgress >= 80 ? 'green' : 'gray'}
            size="lg"
            onClick={onResultsSelect}
            isDisabled={overallProgress < 80}
            leftIcon={<Text>🎯</Text>}
            h="auto"
            py={3}
            px={4}
            justifyContent="flex-start"
          >
            <VStack spacing={0} align="flex-start">
              <Text fontSize="sm" fontWeight="medium">
                View Results
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {overallProgress >= 80 ? 'Analysis Ready' : `${(100 - overallProgress).toFixed(0)}% remaining`}
              </Text>
            </VStack>
          </Button>
        </VStack>

        {/* Session Info */}
        <Box mt="auto" pt={4}>
          <Card.Root size="sm" variant="subtle">
            <Card.Body p={4}>
              <VStack gap={2} align="stretch">
                <VStack gap={1} align="stretch">
                  <Text fontSize="xs" color="fg.muted">
                    Session ID
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color="fg">
                    {sessionId.split('-')[0]}...
                  </Text>
                </VStack>
                {userName && (
                  <VStack gap={1} align="stretch">
                    <Text fontSize="xs" color="fg.muted">
                      Name
                    </Text>
                    <Text fontSize="xs" color="fg" wordBreak="break-word">
                      {userName}
                    </Text>
                  </VStack>
                )}
                {userEmail && (
                  <VStack gap={1} align="stretch">
                    <Text fontSize="xs" color="fg.muted">
                      Email
                    </Text>
                    <Text fontSize="xs" color="fg" wordBreak="break-word">
                      {userEmail}
                    </Text>
                  </VStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Box>
      </VStack>
    </Box>
  );
}