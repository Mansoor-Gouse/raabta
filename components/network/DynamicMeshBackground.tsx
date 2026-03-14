"use client";

/**
 * Light-themed animated mesh background for the landing page.
 * White base with subtle soft orbs; black/white gradients used only for emphasis elsewhere.
 */
export function DynamicMeshBackground() {
  return (
    <div
      className="network-mesh-bg fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Base white */}
      <div className="absolute inset-0 bg-[#FAFAFA]" />
      {/* Subtle light orbs for depth (no dark tones) */}
      <div className="network-mesh-orb network-mesh-orb-1" />
      <div className="network-mesh-orb network-mesh-orb-2" />
      <div className="network-mesh-orb network-mesh-orb-3" />
      <div className="network-mesh-orb network-mesh-orb-4" />
      <div className="network-mesh-orb network-mesh-orb-5" />
      {/* Very subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
