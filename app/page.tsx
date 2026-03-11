import Link from "next/link";

export default function HomePage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        paddingTop: "calc(1rem + var(--safe-area-inset-top))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))",
      }}
    >
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
        Messaging PWA
      </h1>
      <Link
        href="/login"
        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:opacity-90 active:opacity-80 min-h-[48px] inline-flex items-center justify-center touch-manipulation"
      >
        Sign in
      </Link>
    </main>
  );
}
