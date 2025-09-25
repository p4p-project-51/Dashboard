import { Anchor, Text, Title } from "@mantine/core";
import classes from "./Welcome.module.css";
import Link from "next/link";

export function Welcome() {
  return (
    <>
      <Title className={classes.title} ta="center" mt={100}>
        Project #51
      </Title>

      <Text c="dimmed" ta="center" size="lg" mt="sm">
        Investigation of a liquid-metal based thermal cooling method for an IPT
        system
      </Text>

      <Link
        href="https://part4project.foe.auckland.ac.nz/home/project/detail/5592/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ wordWrap: "break-word" }}
      >
        <Text c="blue" ta="center" size="lg" mt="sm">
          https://part4project.foe.auckland.ac.nz/home/project/detail/5592/
        </Text>
      </Link>
    </>
  );
}
