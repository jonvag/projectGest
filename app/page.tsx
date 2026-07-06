import { DottedBackground } from "@/components/dotted-background";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <DottedBackground />
      <Nav />
      <Hero />
    </div>
  );
}
