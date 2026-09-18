import { AmbientVideoBackground } from "@/components/ambient-video-background";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <div className="public-shell flex min-h-screen flex-col">
      <AmbientVideoBackground />
      <Nav />
      <Hero />
    </div>
  );
}
