'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  VStack,
  Card,
  Heading,
  Text,
  Input,
  Button,
  Alert,
  Box,
  Image,
  Spinner,
} from '@chakra-ui/react';
import { useColorMode } from '@/components/ui/color-mode';
import { Config } from '@/lib/config';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { colorMode } = useColorMode();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(redirectTo);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = colorMode === 'dark' ? Config.LOGO_URL_DARK : Config.LOGO_URL_LIGHT;

  return (
    <Container maxW="400px" py={16}>
      <VStack gap={8}>
        <Box>
          <Image
            src={logoUrl}
            alt="Agiloft Logo"
            h="40px"
            objectFit="contain"
          />
        </Box>

        <Card.Root w="100%">
          <Card.Body p={8}>
            <VStack gap={6}>
              <VStack gap={2} textAlign="center">
                <Heading size="lg">Admin Login</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Sign in to access the administration panel
                </Text>
              </VStack>

              {error && (
                <Alert.Root status="error" w="100%">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack gap={4} w="100%">
                  <Box w="100%">
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Username
                    </Text>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      autoComplete="username"
                      required
                    />
                  </Box>

                  <Box w="100%">
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Password
                    </Text>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      required
                    />
                  </Box>

                  <Button
                    type="submit"
                    w="100%"
                    colorPalette="blue"
                    loading={loading}
                    loadingText="Signing in..."
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>

              <Text fontSize="xs" color="fg.muted" textAlign="center">
                This is a protected area. Only authorized administrators can access.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
        >
          Back to Survey
        </Button>
      </VStack>
    </Container>
  );
}

function LoginLoading() {
  return (
    <Container maxW="400px" py={16}>
      <VStack gap={8}>
        <Spinner size="xl" />
        <Text color="fg.muted">Loading...</Text>
      </VStack>
    </Container>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
