import AppShell from "../layout/AppShell";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGsapContext } from "../motion/useGsapContext";
import HeroSection from "../components/landing/HeroSection";
import AttractionStorySection from "../components/landing/AttractionStorySection";
import JourneyMapSection from "../components/landing/JourneyMapSection";
import WorkflowSection from "../components/landing/WorkflowSection";
import FinalCTASection from "../components/landing/FinalCTASection";

function content(language) {
  const zh = language === "zh";
  return {
    zh,
    hero: {
      eyebrow: zh ? "\u65b0\u52a0\u5761\u667a\u80fd\u65c5\u884c\u89c4\u5212" : "Singapore intelligent travel planning",
      title: zh ? "\u628a\u65b0\u52a0\u5761\uff0c\u8d70\u6210\u5c5e\u4e8e\u4f60\u7684\u8282\u594f\u3002" : "Let Singapore unfold at your pace.",
      body: zh ? "Nuogo \u662f\u7531 LLM \u8f85\u52a9\u7684\u65c5\u884c\u884c\u7a0b\u4e0e\u9884\u7b97\u89c4\u5212\u7cfb\u7edf\u3002\u7cfb\u7edf\u4f7f\u7528\u53d7\u652f\u6301\u7684\u65b0\u52a0\u5761\u666f\u70b9\u6761\u76ee\u3001\u4ef7\u683c\u53c2\u8003\u4e0e\u5f00\u653e\u65f6\u95f4\u8bb0\u5f55\uff0c\u518d\u7531 AI \u5728\u53d7\u5141\u8bb8\u7684\u5019\u9009\u666f\u70b9\u4e2d\u8f85\u52a9\u7f16\u6392\u4e00\u4efd\u7ecf\u8fc7\u9884\u7b97\u9a8c\u8bc1\u7684\u884c\u7a0b\u3002" : "Nuogo is an LLM-assisted itinerary and budget planning system. It uses supported Singapore attraction entries, price references, and opening-hour records, then asks AI to draft one budget-validated itinerary from the allowed candidate pool.",
      start: zh ? "\u5f00\u59cb\u89c4\u5212" : "Start Planning",
      guest: zh ? "\u4ee5\u8bbf\u5ba2\u8eab\u4efd\u7ee7\u7eed" : "Continue as Guest",
      guestAria: zh ? "\u4ee5\u8bbf\u5ba2\u8eab\u4efd\u7ee7\u7eed - \u8fdb\u5165\u8bbf\u5ba2\u6a21\u5f0f" : "Continue as Guest - enter Guest Mode",
      scroll: zh ? "\u5411\u4e0b\u63a2\u7d22\u65b0\u52a0\u5761" : "Explore Singapore below",
      manifestLabel: zh ? "Nuogo \u65c5\u884c\u65b9\u5f0f" : "The Nuogo travel method",
      manifestKicker: zh ? "\u65b0\u52a0\u5761\uff0c\u6162\u6162\u5c55\u5f00" : "Singapore, unfolding",
      manifest: zh ? "\u666f\u70b9\u5019\u9009\u6c60\u3001\u504f\u597d\u3001\u8def\u7ebf\u4e0e\u9884\u7b97\uff0c\u5728\u540c\u4e00\u6bb5\u65b0\u52a0\u5761\u884c\u7a0b\u91cc\u88ab\u4e00\u8d77\u68c0\u67e5\u3002" : "Candidate POIs, preferences, route and budget, checked together in one Singapore journey.",
    },
    stories: {
      eyebrow: zh ? "\u5728\u57ce\u5e02\u7684\u4e0d\u540c\u7ae0\u8282\u505c\u7559" : "Pause in the city's many chapters",
      title: zh ? "\u4e00\u5ea7\u57ce\u5e02\uff0c\u4e0d\u6b62\u4e00\u79cd\u62b5\u8fbe\u65b9\u5f0f\u3002" : "One city, more than one way to arrive.",
      body: zh ? "\u4ece\u6d77\u6e7e\u7684\u5efa\u7b51\u8f6e\u5ed3\uff0c\u5230\u8857\u533a\u91cc\u7684\u9999\u6c14\u4e0e\u8272\u5f69\u3002\u5148\u53d1\u73b0\u5438\u5f15\u4f60\u7684\u5730\u65b9\uff0c\u518d\u628a\u5b83\u4eec\u6574\u7406\u6210\u5408\u7406\u7684\u65c5\u884c\u8282\u594f\u3002" : "From the bay's architecture to the colour and flavour of its neighbourhoods. Begin with the places that draw you in, then shape them into a considered rhythm.",
      action: zh ? "\u63a2\u7d22\u65b0\u52a0\u5761\u666f\u70b9" : "Explore Singapore attractions",
    },
    journey: {
      eyebrow: zh ? "\u4e00\u6bb5\u65c5\u7a0b\uff0c\u6e05\u695a\u53ef\u89c1" : "A journey, made visible",
      title: zh ? "\u4ece\u7075\u611f\u51fa\u53d1\uff0c\u8ba9\u8def\u7ebf\u6162\u6162\u6210\u5f62\u3002" : "From a spark of interest to a route with shape.",
      body: zh ? "\u53c2\u8003 MRT \u8def\u7ebf\u56fe\uff0c\u611f\u53d7 Nuogo \u5982\u4f55\u628a\u4f60\u7684\u504f\u597d\u3001\u666f\u70b9\u4e0e\u9884\u7b97\u7ea6\u675f\u8fde\u63a5\u4e3a\u4e00\u4efd\u53ef\u5ba1\u9605\u7684\u884c\u7a0b\u3002" : "Use the MRT network as a clear reference while Nuogo connects preferences, places and budget constraints into an itinerary you can review.",
      legend: zh ? "\u65b0\u52a0\u5761 MRT \u8def\u7ebf\u53c2\u8003" : "Singapore MRT route reference",
    },
    workflow: {
      eyebrow: zh ? "Nuogo \u5982\u4f55\u5de5\u4f5c" : "How Nuogo works",
      title: zh ? "\u5c11\u4e00\u70b9\u5206\u6563\uff0c\u591a\u4e00\u70b9\u7b03\u5b9a\u3002" : "Less scattered planning. More confident travel.",
      body: zh ? "\u6bcf\u4e00\u6b65\u90fd\u670d\u52a1\u4e8e\u4e00\u4efd\u884c\u7a0b\uff1a\u4fdd\u7559\u4f60\u7684\u9009\u62e9\uff0c\u4e5f\u4f7f\u7528\u7cfb\u7edf\u4e2d\u7684\u65f6\u95f4\u3001\u8def\u7ebf\u4e0e\u4ef7\u683c\u53c2\u8003\u68c0\u67e5\u603b\u9884\u7b97\u3002" : "Each step serves one itinerary: your choices are respected while stored time, route and price references check the total budget.",
    },
    final: {
      eyebrow: zh ? "\u5f00\u59cb\u4f60\u7684\u65b0\u52a0\u5761\u884c\u7a0b" : "Begin your Singapore itinerary",
      title: zh ? "\u4e0b\u4e00\u6bb5\u57ce\u5e02\u8bb0\u5fc6\uff0c\u4ece\u4e00\u4e2a\u9009\u62e9\u5f00\u59cb\u3002" : "Your next city memory starts with one choice.",
      body: zh ? "\u8fdb\u5165\u65b0\u52a0\u5761\u666f\u70b9\u53d1\u73b0\u4e0e\u65c5\u884c\u504f\u597d\u6d41\u7a0b\uff0c\u751f\u6210\u4e00\u4efd\u57fa\u4e8e\u6765\u6e90\u652f\u6301\u8d44\u6599\u7684\u884c\u7a0b\u3002" : "Enter the Singapore discovery and preference flow to create an itinerary based on source-backed travel data.",
      action: zh ? "\u5f00\u59cb\u89c4\u5212" : "Start Planning",
    },
  };
}

export default function LandingPage() {
  const { language } = useLanguage();
  const t = content(language);
  const { scope: rootRef } = useGsapContext(({ gsap, ScrollTrigger }) => {
    if (!ScrollTrigger) return undefined;
    const context = gsap.context(() => {
      gsap.from(".atlas-hero__content > *, .atlas-hero__manifest", { y: 20, opacity: 0, duration: 0.72, stagger: 0.09, ease: "power3.out" });
      gsap.to(".atlas-hero__photo", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".atlas-hero", start: "top top", end: "bottom top", scrub: true } });
    }, rootRef);
    return () => context.revert();
  }, []);

  return <AppShell dark><main className="nuogo-landing nuogo-landing--atlas" ref={rootRef}>
    <HeroSection copy={t.hero} zh={t.zh} />
    <div className="landing-story-reveal"><AttractionStorySection copy={t.stories} zh={t.zh} /></div>
    <div className="landing-story-reveal"><JourneyMapSection copy={t.journey} zh={t.zh} /></div>
    <div className="landing-story-reveal"><WorkflowSection copy={t.workflow} zh={t.zh} /></div>
    <div className="landing-story-reveal"><FinalCTASection copy={t.final} /></div>
  </main></AppShell>;
}
