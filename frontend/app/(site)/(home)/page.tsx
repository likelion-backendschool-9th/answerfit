import { HomeHero } from "@/app/_components/HomeHero/HomeHero";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { ClosingSection } from "./_components/ClosingSection/ClosingSection";
import { FeedbackSection } from "./_components/FeedbackSection/FeedbackSection";
import { FlowSection } from "./_components/FlowSection/FlowSection";
import { RoomsSection } from "./_components/RoomsSection/RoomsSection";

/** 구역마다 스크롤이 맞춰진다(globals.css의 data-snap-sections) */
export default function HomePage() {
  return (
    <>
      <TopBar current={PATHS.home} />
      <div data-snap-sections>
        <HomeHero />
        <RoomsSection />
        <FlowSection />
        <FeedbackSection />
        <ClosingSection />
      </div>
    </>
  );
}
