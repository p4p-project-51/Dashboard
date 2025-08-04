"use client";

import { useState, useEffect, useRef } from "react";
import { Burger, Container, Group, Button, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { MantineLogo } from "@mantinex/mantine-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import classes from "./Header.module.css";

const links = [
  { link: "/", label: "About" },
  { link: "/vitals", label: "Vitals" },
  { link: "/history", label: "History" },
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
      size="lg"
      variant={pathname === link.link ? "filled" : "subtle"}
      color={pathname === link.link ? "purple" : "gray"}
      radius="md"
      px={24}
      py={16}
      style={{ fontWeight: 600, fontSize: "1.15rem" }}
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
        </Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
      </Container>
    </header>
  );
}
