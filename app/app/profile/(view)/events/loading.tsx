import { EventCardSkeleton } from "@/components/events/EventsListSkeleton";

export default function ProfileEventsLoading() {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--elite-bg)] no-scrollbar">
      <ul className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <li key={i}>
            <EventCardSkeleton variant="elite" />
          </li>
        ))}
      </ul>
    </div>
  );
}

