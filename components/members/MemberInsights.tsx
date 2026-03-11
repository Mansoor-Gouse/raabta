"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Insights = {
  circleRelation: {
    circleTypeForMe: "INNER" | "TRUSTED" | null;
    mutualInner: boolean;
    reason: string | null;
  };
  mutualConnectionsCount: number;
  mutualConnectionsBreakdown: { inner: number; trusted: number };
  eventsAttendedTogether: number;
  recentSharedEvents: { id: string; title: string; startAt: string }[];
  sharedIndustries: string[];
  sharedInterests: string[];
};

export function MemberInsights({ memberId }: { memberId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/members/${encodeURIComponent(memberId)}/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Insights | null) => {
        if (!cancelled && data) setInsights(data);
      })
      .catch(() => {
        if (!cancelled) setInsights(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loading || !insights) return null;

  const hasConnection =
    insights.circleRelation.circleTypeForMe != null ||
    insights.mutualConnectionsCount > 0 ||
    insights.eventsAttendedTogether > 0 ||
    insights.sharedIndustries.length > 0 ||
    insights.sharedInterests.length > 0;

  if (!hasConnection && !insights.circleRelation.mutualInner) return null;

  return (
    <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Connection with you
      </h3>
      <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        {insights.circleRelation.mutualInner && (
          <p className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-amber-800 dark:text-amber-200">
            You are in each other&apos;s Inner Circle
          </p>
        )}
        {insights.circleRelation.circleTypeForMe && !insights.circleRelation.mutualInner && (
          <p>
            In your {insights.circleRelation.circleTypeForMe === "INNER" ? "Inner" : "Trusted"} Circle
            {insights.circleRelation.reason && (
              <span className="text-gray-500 dark:text-gray-400">
                {" "}— {insights.circleRelation.reason.replace(/_/g, " ")}
              </span>
            )}
          </p>
        )}
        {insights.mutualConnectionsCount > 0 && (
          <p>
            You share {insights.mutualConnectionsCount} trusted connection
            {insights.mutualConnectionsCount === 1 ? "" : "s"}
            {insights.mutualConnectionsBreakdown.inner + insights.mutualConnectionsBreakdown.trusted > 0 && (
              <span className="text-gray-500 dark:text-gray-400">
                {" "}({insights.mutualConnectionsBreakdown.inner} in Inner, {insights.mutualConnectionsBreakdown.trusted} in Trusted)
              </span>
            )}
          </p>
        )}
        {insights.eventsAttendedTogether > 0 && (
          <p>
            You attended {insights.eventsAttendedTogether} event
            {insights.eventsAttendedTogether === 1 ? "" : "s"} together
          </p>
        )}
        {insights.recentSharedEvents.length > 0 && (
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-200">Recent shared events</p>
            <ul className="mt-1 space-y-0.5">
              {insights.recentSharedEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/app/events/${e.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {e.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(insights.sharedIndustries.length > 0 || insights.sharedInterests.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {insights.sharedIndustries.map((i) => (
              <span
                key={i}
                className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
              >
                {i}
              </span>
            ))}
            {insights.sharedInterests.map((i) => (
              <span
                key={i}
                className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-800 dark:text-blue-200"
              >
                {i}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
