import { ColorSchemeToggle } from "../components/ColorSchemeToggle/ColorSchemeToggle";
import { Welcome } from "../components/Welcome/Welcome";
import MultiProbeChart from "../components/MultiProbeChart";

export default function HomePage() {
  return (
    <>
      <Welcome />
      <ColorSchemeToggle />
      <MultiProbeChart />
    </>
  );
}
