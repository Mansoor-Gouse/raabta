import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminReportsClient } from "./AdminReportsClient";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.isLoggedIn) redirect("/login");
  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Moderation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Review and resolve reports. (Admin access can be restricted later.)
        </p>
        <AdminReportsClient />
      </div>
    </div>
  );
}
