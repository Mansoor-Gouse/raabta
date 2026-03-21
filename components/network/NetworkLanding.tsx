"use client";

import { useEffect } from "react";
import { FadeInSection } from "./FadeInSection";
import { DynamicMeshBackground } from "./DynamicMeshBackground";

function useSmoothScroll() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);
}

function ConstellationBg() {
  const nodes = [
    { cx: 25, cy: 35 },
    { cx: 50, cy: 25 },
    { cx: 75, cy: 40 },
    { cx: 35, cy: 65 },
    { cx: 65, cy: 70 },
  ];
  const lines = [
    [0, 1], [1, 2], [0, 3], [1, 3], [3, 4], [2, 4],
  ];
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-30"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="nodeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(11,11,11,0.12)" />
          <stop offset="100%" stopColor="rgba(11,11,11,0.02)" />
        </linearGradient>
      </defs>
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="rgba(11,11,11,0.06)"
          strokeWidth="0.3"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r="1" fill="url(#nodeGlow)" />
      ))}
    </svg>
  );
}

export function NetworkLanding() {
  useSmoothScroll();
  return (
    <div className="network-landing relative min-h-screen bg-[#FAFAFA] text-[#171717] overflow-x-hidden scroll-smooth">
      <a
        href="#the-idea"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-[#0B0B0B] focus:ring-offset-2 focus:bg-white focus:text-[#0B0B0B] focus:font-medium"
      >
        Skip to main content
      </a>
      <DynamicMeshBackground />
      <main id="main-content">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-gradient-to-b from-white via-[#FAFAFA] to-[#F5F5F5]">
        <div className="absolute inset-0 overflow-hidden">
          <ConstellationBg />
        </div>
        <div className="network-hero-content relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="network-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#0B0B0B] leading-[1.1] opacity-0 animate-[network-fade-in_0.8s_ease-out_forwards]">
            The Rope
          </h1>
          <p className="network-serif text-lg sm:text-xl md:text-2xl font-light text-[#262626] mt-4 opacity-0 animate-[network-fade-in_0.8s_ease-out_0.15s_forwards] [font-variant:small-caps] tracking-[0.2em]">
            a network of faith
          </p>
          <p className="mt-8 text-lg sm:text-xl text-[#404040] font-normal max-w-2xl mx-auto leading-relaxed opacity-0 animate-[network-fade-in_0.8s_ease-out_0.25s_forwards]">
            A network where thoughtful, affluent, and influential Muslims connect through faith, dialogue, and collaboration—built for trust and real conversation.
          </p>
          {/* <p className="mt-3 text-sm text-[#737373] opacity-0 animate-[network-fade-in_0.8s_ease-out_0.28s_forwards]">
            Sign in with your mobile number to use the full app—feed, chat, events, and more.
          </p> */}
          <div className="mt-14 flex max-w-2xl mx-auto opacity-0 animate-[network-fade-in_0.8s_ease-out_0.35s_forwards]">
            <div className="w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-[#1a1a1a] to-[#0B0B0B]" aria-hidden />
            <blockquote className="flex-1 ml-4 px-6 py-6 rounded-2xl border border-black/[0.08] bg-white/95 text-left">
            <p className="text-2xl sm:text-3xl text-[#171717] leading-relaxed font-arabic" dir="rtl" lang="ar">
              وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا
            </p>
            <p className="network-serif text-lg sm:text-xl text-[#404040] italic leading-relaxed mt-4">
              &ldquo;Hold firmly to the rope of Allah all together and do not become divided.&rdquo;
            </p>
            <cite className="mt-3 block text-sm text-[#737373] not-italic">— القرآن ٣:١٠٣ / Qur&apos;an 3:103</cite>
          </blockquote>
          </div>
          <div className="mt-12 flex flex-wrap gap-4 justify-center opacity-0 animate-[network-fade-in_0.8s_ease-out_0.45s_forwards]">
            <a
              href="/login"
              className="network-cta-primary inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-[#1a1a1a] to-[#0B0B0B] text-white font-medium hover:from-[#252525] hover:to-[#151515] transition-all duration-300 focus-visible:outline-none active:scale-[0.98]"
            >
              Get Started
            </a>
            <a
              href="#the-idea"
              className="network-cta-secondary inline-flex items-center justify-center px-8 py-4 rounded-full border-2 border-[#0B0B0B]/20 text-[#171717] font-medium hover:bg-black/5 hover:border-[#0B0B0B]/30 transition-all duration-300 focus-visible:outline-none active:scale-[0.98]"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section id="the-idea" className="relative py-24 px-6 bg-gradient-to-b from-white via-[#FAFAFA] to-[#F5F5F5]">
        <FadeInSection>
          <div className="max-w-5xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#0B0B0B] mb-14 network-heading-accent">
              Platform Features
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Circles & trust",
                  desc: "Smaller circles for deeper conversations with people you trust.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="12" cy="12" r="7" />
                      <circle cx="12" cy="7" r="1.5" />
                      <circle cx="16" cy="12" r="1.5" />
                      <circle cx="12" cy="17" r="1.5" />
                      <circle cx="8" cy="12" r="1.5" />
                    </svg>
                  ),
                },
                {
                  title: "Thoughtful Discussions",
                  desc: "Deep conversations on faith and society.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
                {
                  title: "Events & gatherings",
                  desc: "Discover dinners, retreats, and salons in the app.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                    </svg>
                  ),
                },
                {
                  title: "Community Impact",
                  desc: "Charitable and social initiatives.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                    </svg>
                  ),
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="network-card rounded-2xl border border-black/[0.08] bg-white/95 p-8"
                >
                  <div className="network-dynamic-icon w-14 h-14 rounded-xl bg-black/[0.04] border border-black/[0.08] flex items-center justify-center text-[#404040] mb-5">
                    <span className="network-dynamic-icon-inner block">{card.icon}</span>
                  </div>
                  <h3 className="network-serif text-xl font-medium text-[#0B0B0B] mb-2">{card.title}</h3>
                  <p className="text-[#404040] text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* The Power of Small Circles */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-[#F5F5F5] via-[#FAFAFA] to-white">
        <FadeInSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#0B0B0B] mb-10">
              The Power of Small Circles
            </h2>
            <div className="network-card rounded-2xl border border-black/[0.08] bg-white/95 px-8 sm:px-12 py-10 sm:py-14">
              <p className="text-[#404040] text-lg sm:text-xl leading-relaxed text-center mb-10">
                History shows that civilizations are shaped not by crowds, but by small groups of sincere individuals who share belief and purpose.
              </p>
              <p className="network-serif text-xl sm:text-2xl text-[#171717] italic text-center leading-relaxed">
                &ldquo;When believers connect with trust and vision, their influence multiplies.&rdquo;
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Benefits */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-white via-[#FAFAFA] to-[#F5F5F5]">
        <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#0B0B0B] mb-3">
              What you can do in the app
            </h2>
            {/* <p className="text-center text-[#737373] text-sm mb-12">
              After you sign in, you can:
            </p> */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { text: "Connect with influential Muslims globally", icon: "map" },
                { text: "Exchange ideas with like-minded believers", icon: "refresh" },
                { text: "Collaborate on charitable initiatives", icon: "handshake" },
                { text: "Find and join gatherings and events", icon: "calendar" },
                { text: "Build lasting relationships in faith", icon: "heart" },
                { text: "Create impact with leaders and change-makers", icon: "award" },
              ].map(({ text, icon }, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="network-dynamic-icon flex-shrink-0 w-10 h-10 rounded-xl bg-black/[0.04] border border-black/[0.08] flex items-center justify-center mt-0.5">
                    {icon === "map" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                      </svg>
                    )}
                    {icon === "refresh" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {icon === "handshake" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
                      </svg>
                    )}
                    {icon === "calendar" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                      </svg>
                    )}
                    {icon === "heart" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                      </svg>
                    )}
                    {icon === "award" && (
                      <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[#404040] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Final CTA */}
      <section id="get-started" className="relative py-28 px-6 bg-gradient-to-b from-[#F5F5F5] via-[#FAFAFA] to-white">
        <FadeInSection>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="network-serif text-3xl sm:text-4xl md:text-5xl font-light text-[#0B0B0B] mb-5 leading-tight">
              Great movements often begin with a few sincere people.
            </h2>
            <p className="text-lg text-[#404040] mb-9">
              Connect with affluent, influential Muslims who share your faith and purpose.
            </p>
            <a
              href="/login"
              className="network-cta-primary inline-flex items-center justify-center px-10 py-4 rounded-full bg-gradient-to-r from-[#1a1a1a] to-[#0B0B0B] text-white font-medium hover:from-[#252525] hover:to-[#151515] transition-all duration-300 focus-visible:outline-none active:scale-[0.98]"
            >
              Get Started
            </a>
            {/* <p className="mt-6 text-sm text-[#737373]">
              One-time verification on your phone—then you&apos;re in.
            </p> */}
            <p className="mt-2 text-sm text-[#737373]">
              A calm, trusted space for people who take faith and community seriously.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-6 border-t border-black/[0.08] bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="network-serif text-[#404040] text-sm">
            The Rope — A network of faith
          </p>
          <div className="flex gap-6">
            <a href="/login" className="text-sm text-[#404040] hover:text-[#0B0B0B] transition-colors">
              Get Started
            </a>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
