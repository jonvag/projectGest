import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <Hero />
    </div>
  );
}
