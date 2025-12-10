'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  Image,
} from '@chakra-ui/react';
import { useColorMode } from '@/components/ui/color-mode';
import { Config } from '@/lib/config';
import { logout } from '@/lib/api/adminClient';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Surveys', href: '/admin/surveys', icon: '📋' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = true, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { colorMode } = useColorMode();

  const logoUrl = colorMode === 'dark' ? Config.LOGO_URL_DARK : Config.LOGO_URL_LIGHT;

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <Box
      w="250px"
      h="100vh"
      bg="bg.subtle"
      borderRight="1px solid"
      borderColor="border.subtle"
      position="fixed"
      left={isOpen ? '0' : '-250px'}
      top="0"
      overflowY="auto"
      p={4}
      zIndex={10}
      transition="left 0.3s ease-in-out"
    >
      <VStack gap={4} align="stretch" h="full">
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="center">
            <Image
              src={logoUrl}
              alt="Agiloft Logo"
              h="32px"
              objectFit="contain"
            />
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                ✕
              </Button>
            )}
          </HStack>
          <Text fontSize="sm" color="fg.muted" mt={2}>
            Admin Dashboard
          </Text>
        </Box>

        <Separator />

        {/* Navigation */}
        <VStack gap={1} align="stretch" flex={1}>
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={isActive(item.href) ? 'solid' : 'ghost'}
              colorPalette={isActive(item.href) ? 'blue' : undefined}
              justifyContent="flex-start"
              size="md"
              onClick={() => router.push(item.href)}
            >
              <HStack gap={3}>
                <Text>{item.icon}</Text>
                <Text>{item.label}</Text>
              </HStack>
            </Button>
          ))}
        </VStack>

        <Separator />

        {/* Footer */}
        <VStack gap={2} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            onClick={() => router.push('/')}
          >
            <HStack gap={3}>
              <Text>🏠</Text>
              <Text>Back to Survey</Text>
            </HStack>
          </Button>
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
