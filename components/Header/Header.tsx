"use client";

import { useState, useEffect, useRef } from "react";
import { Burger, Container, Group, Button, Title, Drawer, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { MantineLogo } from "@mantinex/mantine-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./Header.module.css";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";
import { AuthButton } from "../AuthButton/AuthButton";

const links = [
  { link: "/", label: "Home" },
  { link: "/live", label: "Real-time Connection" },
];

export function Header() {
  const [opened, { toggle }] = useDisclosure(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement>(null);

  const items = links.map((link) => (
    <Button
      key={link.label}
      component={Link}
      href={link.link}
      size="md"
      variant={pathname === link.link ? "filled" : "subtle"}
      color={pathname === link.link ? "purple" : "gray"}
    >
      {link.label}
    </Button>
  ));

  return (
    <header ref={headerRef} className={classes.header}>
      <Container size="xxl" className={classes.inner}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          Interface
        </Link>
        <Group gap={5} visibleFrom="xs">
          {items}
          <AuthButton />
          <ColorSchemeToggle />
        </Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
        {/* Drawer for mobile menu */}
        <Drawer
          opened={opened}
          onClose={toggle}
          padding="md"
          size="xs"
          hiddenFrom="xs"
          title={
            <Title order={2} m={0}>
              Menu
            </Title>
          }
        >
          <Stack
            gap={8}
          >
            {items}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "auto" }}>
              <AuthButton />
              <ColorSchemeToggle />
            </div>
          </Stack>
        </Drawer>
      </Container>
    </header>
  );
}
