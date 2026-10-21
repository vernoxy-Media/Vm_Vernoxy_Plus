import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CalendarAttendeeEntity,
  CalendarEventEntity,
  CalendarEventType,
  CalendarRsvpStatus,
  UnscheduledTaskEntity,
} from '../../domain/entities/calendar-event.entity';
import {
  CalendarEventsQuery,
  CalendarHolidayItem,
  CalendarMonthTaskItem,
  CalendarMonthTasksQuery,
  CalendarRepositoryPort,
  CalendarSummaryQuery,
  CalendarSummaryResult,
  CreateCalendarEventRepoInput,
  RespondRsvpRepoInput,
  UpdateCalendarEventRepoInput,
} from '../../domain/ports/calendar.repository.port';

@Injectable()
export class PrismaCalendarRepository implements CalendarRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private mapAttendee(a: any): CalendarAttendeeEntity {
    const emp = a.employees_calendar_event_attendees_employee_idToemployees;
    return {
      attendee_id: a.attendee_id,
      event_id: a.event_id,
      employee_id: a.employee_id,
      name: emp?.name ?? 'Unknown',
      email: emp?.email ?? '',
      profile_picture_url: emp?.profile_picture ?? null,
      response_status: a.response_status as CalendarRsvpStatus,
      is_optional: a.is_optional,
      responded_at: a.responded_at ? a.responded_at.toISOString() : null,
    };
  }

  private mapEvent(e: any): CalendarEventEntity {
    const org = e.employees_calendar_events_organizer_idToemployees;
    const task = e.tasks;
    return {
      event_id: e.event_id,
      event_type: e.event_type as CalendarEventType,
      title: e.title,
      description: e.description,
      start_time: e.start_time.toISOString(),
      end_time: e.end_time.toISOString(),
      is_all_day: e.is_all_day,
      location: e.location,
      meeting_link: e.meeting_link,
      status: e.status,
      task_id: e.task_id,
      task_code: task?.task_code ?? null,
      task_stage: task?.stage ?? null,
      organizer_id: e.organizer_id,
      organizer_name: org?.name ?? 'Unknown',
      attendees: (e.calendar_event_attendees || []).map((a: any) => this.mapAttendee(a)),
      created_at: e.created_at.toISOString(),
      row_version: e.row_version,
    };
  }

  async getEvents(query: CalendarEventsQuery): Promise<CalendarEventEntity[]> {
    const startDate = new Date(query.start_time);
    const endDate = new Date(query.end_time);

    const where: any = {
      deleted_at: null,
      start_time: { lte: endDate },
      end_time: { gte: startDate },
      OR: [
        { organizer_id: query.employee_id },
        {
          calendar_event_attendees: {
            some: {
              employee_id: query.employee_id,
              deleted_at: null,
            },
          },
        },
      ],
    };

    if (query.event_type) {
      where.event_type = query.event_type;
    }

    const events = await this.prisma.calendar_events.findMany({
      where,
      include: {
        employees_calendar_events_organizer_idToemployees: {
          select: { emp_id: true, name: true },
        },
        tasks: {
          select: { task_id: true, task_code: true, stage: true },
        },
        calendar_event_attendees: {
          where: { deleted_at: null },
          include: {
            employees_calendar_event_attendees_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    const filteredEvents = events.filter((e: any) => {
      if (e.event_type === 'task_block') {
        return e.tasks && (e.tasks.stage === 'requested' || e.tasks.stage === 'completed');
      }
      return true;
    });

    return filteredEvents.map((e: any) => this.mapEvent(e));
  }

  async getEventById(eventId: number): Promise<CalendarEventEntity | null> {
    const event = await this.prisma.calendar_events.findFirst({
      where: { event_id: eventId, deleted_at: null },
      include: {
        employees_calendar_events_organizer_idToemployees: {
          select: { emp_id: true, name: true },
        },
        tasks: {
          select: { task_id: true, task_code: true, stage: true },
        },
        calendar_event_attendees: {
          where: { deleted_at: null },
          include: {
            employees_calendar_event_attendees_employee_idToemployees: {
              select: { emp_id: true, name: true, email: true, profile_picture: true },
            },
          },
        },
      },
    });

    return event ? this.mapEvent(event) : null;
  }

  async createEvent(input: CreateCalendarEventRepoInput): Promise<CalendarEventEntity> {
    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.calendar_events.create({
        data: {
          event_type: input.event_type,
          title: input.title,
          description: input.description ?? null,
          start_time: input.start_time,
          end_time: input.end_time,
          is_all_day: input.is_all_day ?? false,
          location: input.location ?? null,
          meeting_link: input.meeting_link ?? null,
          task_id: input.task_id ?? null,
          organizer_id: input.organizer_id,
          created_by: input.organizer_id,
        },
      });

      if (input.attendee_ids && input.attendee_ids.length > 0) {
        // Exclude organizer from attendee list if accidentally passed
        const distinctAttendees = Array.from(new Set(input.attendee_ids)).filter(
          (id) => id !== input.organizer_id,
        );

        if (distinctAttendees.length > 0) {
          await tx.calendar_event_attendees.createMany({
            data: distinctAttendees.map((empId) => ({
              event_id: event.event_id,
              employee_id: empId,
              created_by: input.organizer_id,
            })),
          });
        }
      }

      return event;
    });

    return (await this.getEventById(created.event_id))!;
  }

  async updateEvent(input: UpdateCalendarEventRepoInput): Promise<CalendarEventEntity> {
    await this.prisma.$transaction(async (tx) => {
      const data: any = {
        updated_by: input.actor_id,
      };

      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.start_time !== undefined) data.start_time = input.start_time;
      if (input.end_time !== undefined) data.end_time = input.end_time;
      if (input.is_all_day !== undefined) data.is_all_day = input.is_all_day;
      if (input.location !== undefined) data.location = input.location;
      if (input.meeting_link !== undefined) data.meeting_link = input.meeting_link;
      if (input.status !== undefined) data.status = input.status;

      await tx.calendar_events.update({
        where: { event_id: input.event_id },
        data,
      });

      if (input.attendee_ids !== undefined) {
        // Soft delete removed attendees
        await tx.calendar_event_attendees.updateMany({
          where: {
            event_id: input.event_id,
            employee_id: { notIn: input.attendee_ids },
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
            deleted_by: input.actor_id,
          },
        });

        // Insert new attendees
        for (const empId of input.attendee_ids) {
          const existing = await tx.calendar_event_attendees.findFirst({
            where: { event_id: input.event_id, employee_id: empId },
          });

          if (!existing) {
            await tx.calendar_event_attendees.create({
              data: {
                event_id: input.event_id,
                employee_id: empId,
                created_by: input.actor_id,
              },
            });
          } else if (existing.deleted_at) {
            await tx.calendar_event_attendees.update({
              where: { attendee_id: existing.attendee_id },
              data: { deleted_at: null, deleted_by: null },
            });
          }
        }
      }
    });

    return (await this.getEventById(input.event_id))!;
  }

  async deleteEvent(eventId: number, actorId: number): Promise<void> {
    await this.prisma.calendar_events.update({
      where: { event_id: eventId },
      data: {
        deleted_at: new Date(),
        deleted_by: actorId,
        status: 'cancelled',
      },
    });
  }

  async respondRsvp(input: RespondRsvpRepoInput): Promise<void> {
    await this.prisma.calendar_event_attendees.updateMany({
      where: {
        event_id: input.event_id,
        employee_id: input.employee_id,
        deleted_at: null,
      },
      data: {
        response_status: input.response_status,
        responded_at: new Date(),
      },
    });
  }

  async getUnscheduledTasks(employeeId: number): Promise<UnscheduledTaskEntity[]> {
    // Tasks assigned to employee that are not completed and do NOT have an active calendar_event
    const rows = await this.prisma.tasks.findMany({
      where: {
        deleted_at: null,
        stage: { not: 'completed' },
        task_assignees: {
          some: {
            employee_id: employeeId,
            deleted_at: null,
          },
        },
        calendar_events: {
          none: {
            deleted_at: null,
          },
        },
      },
      select: {
        task_id: true,
        task_code: true,
        title: true,
        priority: true,
        stage: true,
        allocated_minutes: true,
        due_date: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return rows.map((r: any) => ({
      task_id: r.task_id,
      task_code: r.task_code,
      title: r.title,
      priority: r.priority,
      stage: r.stage,
      allocated_minutes: r.allocated_minutes,
      due_date: r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
    }));
  }

  async getMonthTasks(query: CalendarMonthTasksQuery): Promise<CalendarMonthTaskItem[]> {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    const stages: any[] = query.stage && query.stage !== 'all'
      ? [query.stage]
      : ['requested', 'completed'];

    const where: any = {
      deleted_at: null,
      stage: { in: stages },
      OR: [
        { requested_at: { gte: startDate, lte: endDate } },
        {
          AND: [
            { requested_at: null },
            { completed_at: { gte: startDate, lte: endDate } },
          ],
        },
        {
          AND: [
            { requested_at: null },
            { completed_at: null },
            { created_at: { gte: startDate, lte: endDate } },
          ],
        },
      ],
    };

    if (query.project_id) {
      where.project_id = query.project_id;
    }

    if (query.task_type_id) {
      where.task_type_id = query.task_type_id;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (!query.is_admin) {
      const userFilter = [
        {
          task_assignees: {
            some: {
              employee_id: query.requesting_emp_id,
              deleted_at: null,
            },
          },
        },
        { created_by: query.requesting_emp_id },
      ];
      where.AND = [
        ...(where.AND || []),
        { OR: userFilter },
      ];
    } else if (query.employee_ids && query.employee_ids.length > 0) {
      where.task_assignees = {
        some: {
          employee_id: { in: query.employee_ids },
          deleted_at: null,
        },
      };
    }

    const tasks = await this.prisma.tasks.findMany({
      where,
      include: {
        master_lookup: {
          select: { lookup_id: true, label: true },
        },
        task_assignees: {
          where: { deleted_at: null },
          include: {
            employees_task_assignees_employee_idToemployees: {
              select: { emp_id: true, name: true, profile_picture: true },
            },
          },
        },
        employees_tasks_created_byToemployees: {
          select: { emp_id: true, name: true },
        },
      },
      orderBy: {
        task_id: 'asc',
      },
    });

    return tasks.map((t) => {
      const targetDate = t.requested_at || t.completed_at || t.created_at;
      const submissionDate = targetDate.toISOString().slice(0, 10);
      const assignees = t.task_assignees.map((ta) => {
        const emp = ta.employees_task_assignees_employee_idToemployees;
        return {
          emp_id: emp.emp_id,
          name: emp.name,
          avatar: emp.profile_picture,
        };
      });

      return {
        task_id: t.task_id,
        task_code: t.task_code,
        title: t.title,
        stage: t.stage as 'requested' | 'completed',
        priority: t.priority,
        allocated_minutes: t.allocated_minutes,
        actual_minutes: t.actual_minutes,
        task_type_id: t.task_type_id,
        task_type_name: t.master_lookup?.label ?? t.other_task_type ?? 'Task',
        project_id: t.project_id,
        project_name: t.project_id ? `Project #${t.project_id}` : 'Personal',
        submission_date: submissionDate,
        assignees,
        submitted_by: t.employees_tasks_created_byToemployees
          ? {
              emp_id: t.employees_tasks_created_byToemployees.emp_id,
              name: t.employees_tasks_created_byToemployees.name,
            }
          : null,
      };
    });
  }

  async getCalendarSummary(query: CalendarSummaryQuery): Promise<CalendarSummaryResult> {
    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const where: any = {
      deleted_at: null,
      stage: { in: ['requested', 'completed'] },
      OR: [
        { requested_at: { gte: startDate, lte: endDate } },
        {
          AND: [
            { requested_at: null },
            { completed_at: { gte: startDate, lte: endDate } },
          ],
        },
        {
          AND: [
            { requested_at: null },
            { completed_at: null },
            { created_at: { gte: startDate, lte: endDate } },
          ],
        },
      ],
    };

    if (query.project_id) {
      where.project_id = query.project_id;
    }

    if (!query.is_admin) {
      const userFilter = [
        {
          task_assignees: {
            some: {
              employee_id: query.requesting_emp_id,
              deleted_at: null,
            },
          },
        },
        { created_by: query.requesting_emp_id },
      ];
      where.AND = [
        ...(where.AND || []),
        { OR: userFilter },
      ];
    } else if (query.employee_ids && query.employee_ids.length > 0) {
      where.task_assignees = {
        some: {
          employee_id: { in: query.employee_ids },
          deleted_at: null,
        },
      };
    }

    const tasks = await this.prisma.tasks.findMany({
      where,
      select: {
        stage: true,
        allocated_minutes: true,
      },
    });

    let tasks_submitted = 0;
    let tasks_approved = 0;
    let total_allocated_minutes = 0;

    for (const t of tasks) {
      if (t.stage === 'requested') tasks_submitted++;
      if (t.stage === 'completed') tasks_approved++;
      total_allocated_minutes += t.allocated_minutes || 0;
    }

    return {
      tasks_done: tasks_approved,
      tasks_submitted,
      tasks_approved,
      total_allocated_minutes,
    };
  }

  async getHolidays(startDate: string, endDate: string): Promise<CalendarHolidayItem[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const holidays = await this.prisma.company_holidays.findMany({
      where: {
        deleted_at: null,
        holiday_date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { holiday_date: 'asc' },
    });

    return holidays.map((h) => ({
      holiday_id: h.holiday_id,
      holiday_date: typeof h.holiday_date === 'string'
        ? (h.holiday_date as string).slice(0, 10)
        : (h.holiday_date as Date).toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
    }));
  }
}

