import { Container, Title, Text } from "@mantine/core";
import UartTerminal from "../../components/UartTerminal";

export default function VitalsPage() {
  return (
    <Container size="md" px="md">
      <Title order={2}>Vitals</Title>
      <Text mt="md">UART Terminal:</Text>
      <UartTerminal />
    </Container>
  );
}
