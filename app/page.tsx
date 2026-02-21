import { HeroSection } from "@/components/sections/HeroSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { SolutionSection } from "@/components/sections/SolutionSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { DemoSection } from "@/components/sections/DemoSection";
import { SavingsCalculatorSection } from "@/components/sections/SavingsCalculatorSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { SocialProofSection } from "@/components/sections/SocialProofSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <DemoSection />
      <SavingsCalculatorSection />
      <PricingSection />
      <SocialProofSection />
      <FinalCTASection />
    </>
  );
}
