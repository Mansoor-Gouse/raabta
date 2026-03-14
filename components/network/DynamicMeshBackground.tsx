"use client";

/**
 * Vercel/Next.js-style animated mesh gradient background for the landing page.
 * Uses CSS-only animated radial gradients for a subtle, premium feel.
 */
export function DynamicMeshBackground() {
  return (
    <div
      className="network-mesh-bg fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#0B0B0B]" />
      {/* Animated gradient orbs */}
      <div className="network-mesh-orb network-mesh-orb-1" />
      <div className="network-mesh-orb network-mesh-orb-2" />
      <div className="network-mesh-orb network-mesh-orb-3" />
      <div className="network-mesh-orb network-mesh-orb-4" />
      <div className="network-mesh-orb network-mesh-orb-5" />
      {/* Subtle grid overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
