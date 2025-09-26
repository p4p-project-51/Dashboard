import { Anchor, Text, Title } from "@mantine/core";
import Link from "next/link";

export function Welcome() {
  return (
    <>
      <Title ta="center">
        Project #51
      </Title>

      <Text c="dimmed" ta="center" size="lg" mt="sm">
        Investigation of a liquid-metal based thermal cooling method for an IPT
        system
      </Text>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
        <Link
          href="https://part4project.foe.auckland.ac.nz/home/project/detail/5592/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            wordWrap: "break-word",
            display: "inline-block"
          }}
        >
          <Text c="blue" size="lg" component="span">
            https://part4project.foe.auckland.ac.nz/home/project/detail/5592/
          </Text>
        </Link>
      </div>
    </>
  );
}
