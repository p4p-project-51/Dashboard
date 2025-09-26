"use client";

import { useState } from "react";
import {
  ActionIcon,
  Modal,
  Button,
  TextInput,
  Stack,
  Text,
  Group,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconKey, IconKeyOff } from "@tabler/icons-react";
import { useAuth } from "../../hooks/useAuth";

export function AuthButton() {
  const [opened, { open, close }] = useDisclosure(false);
  const { isAuthenticated, authenticate, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!uploadKey.trim()) {
      setError("Upload key is required");
      return;
    }

    authenticate(uploadKey);
    setUploadKey("");
    close();
  };

  const handleLogout = () => {
    logout();
    close();
  };

  return (
    <>
      <ActionIcon
        onClick={open}
        variant="default"
        size="xl"
        aria-label="Authentication"
        color={isAuthenticated ? "green" : "gray"}
      >
        {isAuthenticated ? (
          <IconKey stroke={1.5} />
        ) : (
          <IconKeyOff stroke={1.5} />
        )}
      </ActionIcon>

      <Modal opened={opened} onClose={close} title="Upload Authentication">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {isAuthenticated
              ? "You are currently authenticated for uploads."
              : "Enter your upload key to enable data uploads."}
          </Text>

          {isAuthenticated ? (
            <Group justify="center">
              <Button onClick={handleLogout} color="red" variant="light">
                Logout
              </Button>
            </Group>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Upload Key"
                  placeholder="Enter your upload key"
                  type="password"
                  value={uploadKey}
                  onChange={(e) => setUploadKey(e.currentTarget.value)}
                  error={error}
                />
                <Group justify="flex-end">
                  <Button type="submit">Authenticate</Button>
                </Group>
              </Stack>
            </form>
          )}
        </Stack>
      </Modal>
    </>
  );
}
