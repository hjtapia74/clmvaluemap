'use client';

import { Box, HStack, Button } from '@chakra-ui/react';
import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <HStack align="stretch" minH="100vh" gap={0}>
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <Box
        flex={1}
        ml={sidebarOpen ? '250px' : '0'}
        transition="margin-left 0.3s ease-in-out"
        minH="100vh"
        bg="bg.muted"
        p={6}
      >
        {/* Toggle button when sidebar is closed */}
        {!sidebarOpen && (
          <Button
            position="fixed"
            left={4}
            top={4}
            zIndex={5}
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </Button>
        )}
        {children}
      </Box>
    </HStack>
  );
}
