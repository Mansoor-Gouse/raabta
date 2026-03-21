export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-flow min-h-dvh bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F5] to-[#F0F0F0]">
      {children}
    </div>
  );
}
