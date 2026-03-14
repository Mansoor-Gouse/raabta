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
    { cx: 15, cy: 20 },
    { cx: 50, cy: 15 },
    { cx: 85, cy: 25 },
    { cx: 25, cy: 50 },
    { cx: 75, cy: 45 },
    { cx: 50, cy: 70 },
    { cx: 35, cy: 85 },
    { cx: 65, cy: 80 },
  ];
  const lines = [
    [0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5], [3, 6], [5, 6], [5, 7], [4, 7],
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
          <stop offset="0%" stopColor="rgba(245,245,245,0.4)" />
          <stop offset="100%" stopColor="rgba(245,245,245,0.05)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="rgba(245,245,245,0.12)"
          strokeWidth="0.3"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r="1.2"
          fill="url(#nodeGlow)"
          filter="url(#glow)"
        />
      ))}
    </svg>
  );
}

export function NetworkLanding() {
  useSmoothScroll();
  return (
    <div className="network-landing relative min-h-screen bg-[#0B0B0B] text-[#F5F5F5] overflow-x-hidden scroll-smooth">
      <DynamicMeshBackground />
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-gradient-to-b from-[#0B0B0B]/95 via-[#151515]/90 to-[#1a1a1a]/90">
        <div className="absolute inset-0 overflow-hidden">
          <ConstellationBg />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="network-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#F5F5F5] leading-[1.1] opacity-0 animate-[network-fade-in_0.8s_ease-out_forwards]">
            The Rope
          </h1>
          <p className="network-serif text-lg sm:text-xl md:text-2xl font-light text-[#F5F5F5]/90 mt-4 opacity-0 animate-[network-fade-in_0.8s_ease-out_0.15s_forwards] [font-variant:small-caps] tracking-[0.15em]">
            a network of faith
          </p>
          <p className="mt-10 text-lg sm:text-xl text-[#F5F5F5]/80 font-normal max-w-2xl mx-auto leading-relaxed opacity-0 animate-[network-fade-in_0.8s_ease-out_0.25s_forwards]">
            An exclusive network where thoughtful, affluent, and influential Muslims connect through faith, dialogue, and meaningful collaboration.
          </p>
          <blockquote className="mt-14 px-6 py-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm text-left max-w-2xl mx-auto opacity-0 animate-[network-fade-in_0.8s_ease-out_0.35s_forwards]">
            <p className="text-2xl sm:text-3xl text-[#F5F5F5]/95 leading-relaxed font-arabic" dir="rtl" lang="ar">
              وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا
            </p>
            <p className="network-serif text-lg sm:text-xl text-[#F5F5F5]/80 italic leading-relaxed mt-4">
              &ldquo;Hold firmly to the rope of Allah all together and do not become divided.&rdquo;
            </p>
            <cite className="mt-3 block text-sm text-[#F5F5F5]/60 not-italic">— القرآن ٣:١٠٣ / Qur&apos;an 3:103</cite>
          </blockquote>
          <div className="mt-12 flex flex-wrap gap-4 justify-center opacity-0 animate-[network-fade-in_0.8s_ease-out_0.45s_forwards]">
            <a
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] border border-white/10 text-[#F5F5F5] font-medium hover:from-[#333] hover:to-[#252525] hover:border-[rgba(180,160,120,0.3)] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.06)] hover:shadow-[0_0_40px_rgba(180,160,120,0.08)]"
            >
              Request Membership
            </a>
            <a
              href="#the-idea"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-white/15 text-[#F5F5F5]/90 font-medium hover:bg-white/5 hover:border-white/25 transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Fragmentation & Hold the Rope Together (merged) */}
      <section id="the-idea" className="relative py-28 px-6 bg-gradient-to-b from-[#1a1a1a]/90 via-[#222]/90 to-[#2a2a2a]/90">
        <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#F5F5F5] mb-4">
              Fragmentation in the Age of Connection
            </h2>
            <p className="network-serif text-xl sm:text-2xl font-light text-center text-[#F5F5F5]/80 mb-16">
              Hold the Rope Together
            </p>
            <div className="grid sm:grid-cols-3 gap-10 mb-20">
              <div className="flex flex-col items-center text-center">
                <div className="network-dynamic-icon w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                  <svg className="w-7 h-7 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <p className="text-[#F5F5F5] font-medium">1.9 Billion Muslims Worldwide</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="network-dynamic-icon w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                  <svg className="w-7 h-7 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 2 2 0 0 1 2 2v2.945M8 3.935V5.5A2.5 2.5 0 0 0 10.5 8h.5a2 2 0 0 1 2 2 2 2 0 1 0 4 0v-1.055M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                </div>
                <p className="text-[#F5F5F5] font-medium">Muslims living in 190+ countries</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="network-dynamic-icon w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                  <svg className="w-7 h-7 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-[#F5F5F5] font-medium">Communities increasingly fragmented despite digital connectivity</p>
              </div>
            </div>
            <div className="max-w-2xl mx-auto text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-8 py-6 mb-12">
                <p className="text-xl sm:text-2xl text-[#F5F5F5]/95 leading-relaxed font-arabic" dir="rtl" lang="ar">
                  وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا
                </p>
                <p className="network-serif text-lg text-[#F5F5F5]/80 italic mt-3">&ldquo;Hold firmly to the rope of Allah all together and do not become divided.&rdquo;</p>
                <p className="text-sm text-[#F5F5F5]/50 mt-2">القرآن ٣:١٠٣ / Qur&apos;an 3:103</p>
              </div>
              <p className="text-[#F5F5F5]/85 text-lg leading-relaxed mb-10">
                A network where thoughtful, affluent, and influential believers connect through:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { icon: "lightbulb", label: "ideas" },
                  { icon: "message", label: "dialogue" },
                  { icon: "target", label: "shared purpose" },
                  { icon: "users", label: "collaboration" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center">
                    <div className="network-dynamic-icon w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                      {item.icon === "lightbulb" && (
                        <svg className="w-5 h-5 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 0 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {item.icon === "message" && (
                        <svg className="w-5 h-5 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                      {item.icon === "target" && (
                        <svg className="w-5 h-5 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      )}
                      {item.icon === "users" && (
                        <svg className="w-5 h-5 text-[#F5F5F5]/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-[#F5F5F5]/80 capitalize">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Platform Features */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-[#2a2a2a]/90 via-[#2f2f2f]/90 to-[#333]/90">
        <FadeInSection>
          <div className="max-w-5xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#F5F5F5] mb-20">
              Platform Features
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Private Circles",
                  desc: "Trusted circles connecting you with affluent and influential Muslims for meaningful conversation.",
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
                  desc: "Deep conversations about faith, philosophy, and society.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
                {
                  title: "Exclusive Gatherings",
                  desc: "Private dinners, retreats, and salons among powerful and purposeful believers.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                    </svg>
                  ),
                },
                {
                  title: "Community Impact",
                  desc: "Collaborate on initiatives that benefit the community.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                    </svg>
                  ),
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                >
                  <div className="network-dynamic-icon w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F5F5F5]/90 mb-5 shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                    <span className="network-dynamic-icon-inner block">{card.icon}</span>
                  </div>
                  <h3 className="network-serif text-xl font-medium text-[#F5F5F5] mb-2">{card.title}</h3>
                  <p className="text-[#F5F5F5]/70 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* The Power of Small Circles */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-[#333]/90 via-[#383838]/90 to-[#3a3a3a]/90">
        <FadeInSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#F5F5F5] mb-12">
              The Power of Small Circles
            </h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-8 sm:px-12 py-10 sm:py-14">
              <p className="text-[#F5F5F5]/90 text-lg sm:text-xl leading-relaxed text-center mb-10">
                History shows that civilizations are shaped not by crowds, but by small groups of sincere individuals who share belief and purpose.
              </p>
              <div className="border-t border-white/15 pt-10">
                <p className="network-serif text-xl sm:text-2xl text-[#F5F5F5]/95 italic text-center leading-relaxed">
                  &ldquo;When believers connect with trust and vision, their influence multiplies.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Benefits */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-[#3a3a3a]/90 via-[#404040]/90 to-[#454545]/90">
        <FadeInSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="network-serif text-3xl sm:text-4xl font-light text-center text-[#F5F5F5] mb-20">
              Benefits of the Network
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { text: "Connect with affluent and influential Muslims across cities and countries", icon: "map" },
                { text: "Exchange meaningful ideas with thoughtful, powerful believers", icon: "refresh" },
                { text: "Collaborate on charitable and social initiatives", icon: "handshake" },
                { text: "Organize and join exclusive gatherings and retreats", icon: "calendar" },
                { text: "Build lasting relationships grounded in faith and purpose", icon: "heart" },
                { text: "Create impact alongside leaders and change-makers", icon: "award" },
              ].map(({ text, icon }, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="network-dynamic-icon flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mt-0.5">
                    {icon === "map" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                      </svg>
                    )}
                    {icon === "refresh" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {icon === "handshake" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
                      </svg>
                    )}
                    {icon === "calendar" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                      </svg>
                    )}
                    {icon === "heart" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                      </svg>
                    )}
                    {icon === "award" && (
                      <svg className="w-5 h-5 text-[#F5F5F5]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[#F5F5F5]/90 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Final CTA */}
      <section id="request" className="relative py-32 px-6 bg-gradient-to-b from-[#2a2a2a]/95 via-[#1a1a1a]/95 to-[#0B0B0B]/98">
        <FadeInSection>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="network-serif text-3xl sm:text-4xl md:text-5xl font-light text-[#F5F5F5] mb-6 leading-tight">
              Great movements often begin with a few sincere people.
            </h2>
            <p className="text-lg text-[#F5F5F5]/80 mb-12">
              This platform exists to connect you with affluent, influential, and powerful Muslims who share your faith and purpose.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] border border-white/15 text-[#F5F5F5] font-medium hover:from-[#333] hover:to-[#252525] hover:border-[rgba(180,160,120,0.35)] transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-[0_0_50px_rgba(180,160,120,0.1)]"
            >
              Request Membership
            </a>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
