import { HomeHero } from "@/app/_components/HomeHero/HomeHero";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { ClosingSection } from "./_components/ClosingSection/ClosingSection";
import { FeedbackSection } from "./_components/FeedbackSection/FeedbackSection";
import { FlowSection } from "./_components/FlowSection/FlowSection";

export default function HomePage() {
  return (
    <>
      <TopBar current={PATHS.home} />
      <HomeHero />
      <FlowSection />
      <FeedbackSection />
      <ClosingSection />
    </>
  );
}
