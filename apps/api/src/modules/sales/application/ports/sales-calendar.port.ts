export interface CalendarFollowUpEvent {
  title: string;
  description: string | null;
  start: Date;
  /** The Assigned to user: the event shows in their Calendar. */
  organizer_emp_id: number;
}

/** Mirrors Pending follow-ups into the Calendar (BFD section 7, Part 6: "Calendar"). */
export interface SalesCalendarPort {
  create(event: CalendarFollowUpEvent): Promise<number>;
  update(eventId: number, event: CalendarFollowUpEvent, actorEmpId: number): Promise<void>;
  /** Takes the event off the Calendar once the follow-up is Completed or Cancelled. */
  remove(eventId: number, actorEmpId: number): Promise<void>;
}

export const SALES_CALENDAR_PORT_TOKEN = Symbol('SalesCalendarPort');
