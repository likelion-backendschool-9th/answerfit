import { HomeHero } from "@/app/_components/HomeHero/HomeHero";
import { ClosingSection } from "./_components/ClosingSection/ClosingSection";
import { FeedbackSection } from "./_components/FeedbackSection/FeedbackSection";
import { FlowSection } from "./_components/FlowSection/FlowSection";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FlowSection />
      <FeedbackSection />
      <ClosingSection />
    </>
  );
}
