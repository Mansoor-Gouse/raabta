export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      {children}
    </div>
  );
}
