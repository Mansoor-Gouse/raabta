export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0B0B0B] via-[#1a1a1a] to-[#252525]">
      {children}
    </div>
  );
}
