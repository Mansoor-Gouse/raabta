import Link from "next/link";
import { BlockedList } from "@/components/settings/BlockedList";

export default function SettingsPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Profile, notifications, and preferences.
      </p>
      <Link
        href="/app/profile"
        className="block py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6"
      >
        Edit profile
      </Link>
      <BlockedList />
    </div>
  );
}
