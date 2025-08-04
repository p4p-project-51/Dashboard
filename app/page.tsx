import { Container } from "@mantine/core";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle/ColorSchemeToggle";
import { Welcome } from "../components/Welcome/Welcome";
import MultiProbeChart from "../components/MultiProbeChart";

export default function HomePage() {
  return (
    <Container size="xxl" px="md">
      <Welcome />
      <ColorSchemeToggle />
      <MultiProbeChart />
    </Container>
  );
}
