import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';
import {
  TaskEntity,
  TaskHistoryEntity,
  TaskSource,
  TaskStage,
} from '../../domain/entities/task.entity';
import {
  CreateTaskRepoInput,
  MoveStageRepoInput,
  TaskBoardCard,
  TaskBoardFilters,
  TaskBoardResult,
  TaskRepositoryPort,
  TaskSummaryResult,
  TrackWorkSessionRepoInput,
  UpdateTaskRepoInput,
} from '../../domain/ports/task.repository.port';

@Injectable()
export class PrismaTaskRepository implements TaskRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage?: FileStoragePort,
  ) {}

  async getNextTaskCode(year: number): Promise<string> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO task_counters (counter_year, last_number)
       VALUES ($1, 1)
       ON CONFLICT (counter_year)
       DO UPDATE SET last_number = task_counters.last_number + 1
       RETURNING last_number;`,
      year,
    );
    const seq = rows[0]?.last_number ?? 1;
    return `TSK-${year}-${seq.toString().padStart(4, '0')}`;
  }

  async createTask(input: CreateTaskRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.tasks.create({
        data: {
          task_code: input.task_code,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          task_type_id: input.task_type_id ?? null,
          due_date: input.due_date ? new Date(input.due_date) : null,
          allocated_minutes: input.allocated_minutes ?? null,
          created_by: input.created_by,
          source: input.source || 'personal',
          parent_task_id: input.parent_task_id ?? null,
          lead_employee_id: input.lead_employee_id ?? null,
          has_sub_tasks: Boolean(input.has_sub_tasks),
          other_task_type: input.other_task_type ?? null,
        },
      });

      await tx.task_assignees.createMany({
        data: input.assignee_ids.map((empId) => ({
          task_id: created.task_id,
          employee_id: empId,
          created_by: input.created_by,
        })),
      });

      await tx.task_history.create({
        data: {
          task_id: created.task_id,
          event_type: 'created',
          actor_id: input.created_by,
          to_stage: 'assigned',
          note: 'Task created',
        },
      });

      // Automatically place task on assigned employees' calendars
      await this.syncTaskCalendarEvent(
        tx,
        created.task_id,
        created.task_code,
        created.title,
        created.description,
        input.due_date,
        input.allocated_minutes,
        input.assignee_ids,
        input.lead_employee_id,
        input.created_by,
        false,
      );

      // Handle child sub tasks if provided
      if (input.has_sub_tasks && input.sub_tasks && input.sub_tasks.length > 0) {
        for (let idx = 0; idx < input.sub_tasks.length; idx++) {
          const st = input.sub_tasks[idx]!;
          const subCode = `${input.task_code}-${String(idx + 1).padStart(2, '0')}`;
          const subTask = await tx.tasks.create({
            data: {
              task_code: subCode,
              title: st.title,
              priority: input.priority ?? 'medium',
              task_type_id: input.task_type_id ?? null,
              allocated_minutes: st.allocated_minutes ?? null,
              created_by: input.created_by,
              source: input.source || 'personal',
              parent_task_id: created.task_id,
              stage: 'assigned',
            },
          });

          await tx.task_assignees.createMany({
            data: st.assignee_ids.map((empId) => ({
              task_id: subTask.task_id,
              employee_id: empId,
              created_by: input.created_by,
            })),
          });

          await tx.task_history.create({
            data: {
              task_id: subTask.task_id,
              event_type: 'created',
              actor_id: input.created_by,
              to_stage: 'assigned',
              note: `Sub task created under ${input.task_code}`,
            },
          });

          // Place subtask on assigned employees' calendars
          await this.syncTaskCalendarEvent(
            tx,
            subTask.task_id,
            subCode,
            st.title,
            null,
            input.due_date,
            st.allocated_minutes,
            st.assignee_ids,
            null,
            input.created_by,
            false,
          );
        }
      }

      return this.fetchTaskEntity(created.task_id, tx);
    });
  }

  async findById(taskId: number): Promise<TaskEntity | null> {
    return this.fetchTaskEntity(taskId, this.prisma);
  }

  async findByCode(taskCode: string): Promise<TaskEntity | null> {
    const task = await this.prisma.tasks.findFirst({
      where: { task_code: taskCode, deleted_at: null },
      select: { task_id: true },
    });
    if (!task) return null;
    return this.fetchTaskEntity(task.task_id, this.prisma);
  }

  async updateTask(taskId: number, input: UpdateTaskRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const data: any = {
        updated_by: input.updated_by,
        updated_at: new Date(),
      };
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.priority !== undefined) data.priority = input.priority;
      if (input.task_type_id !== undefined) data.task_type_id = input.task_type_id;
      if (input.due_date !== undefined) {
        data.due_date = input.due_date ? new Date(input.due_date) : null;
      }
      if (input.allocated_minutes !== undefined) data.allocated_minutes = input.allocated_minutes;
      if (input.lead_employee_id !== undefined) data.lead_employee_id = input.lead_employee_id;
      if (input.other_task_type !== undefined) data.other_task_type = input.other_task_type;

      await tx.tasks.update({
        where: { task_id: taskId },
        data,
      });

      if (input.assignee_ids !== undefined) {
        const currentAssignees = await tx.task_assignees.findMany({
          where: { task_id: taskId, deleted_at: null },
        });
        const currentIds = currentAssignees.map((a: any) => a.employee_id);
        const newIds = input.assignee_ids;

        const toRemove = currentIds.filter((id: number) => !newIds.includes(id));
        const toAdd = newIds.filter((id: number) => !currentIds.includes(id));

        if (toRemove.length > 0) {
          await tx.task_assignees.updateMany({
            where: {
              task_id: taskId,
              employee_id: { in: toRemove },
              deleted_at: null,
            },
            data: {
              deleted_at: new Date(),
              deleted_by: input.updated_by,
            },
          });
        }

        if (toAdd.length > 0) {
          await tx.task_assignees.createMany({
            data: toAdd.map((empId) => ({
              task_id: taskId,
              employee_id: empId,
              created_by: input.updated_by,
            })),
          });
        }
      }

      await tx.task_history.create({
        data: {
          task_id: taskId,
          event_type: 'edited',
          actor_id: input.updated_by,
          note: 'Task details updated',
        },
      });

      // Keep calendar event in sync with updated task details & assignees
      const updatedTask = await tx.tasks.findUnique({
        where: { task_id: taskId },
        select: {
          task_id: true,
          task_code: true,
          title: true,
          description: true,
          due_date: true,
          allocated_minutes: true,
          lead_employee_id: true,
          stage: true,
        },
      });

      if (updatedTask) {
        const currentAssignees = await tx.task_assignees.findMany({
          where: { task_id: taskId, deleted_at: null },
          select: { employee_id: true },
        });
        const currentAssigneeIds = currentAssignees.map((a: any) => a.employee_id);

        await this.syncTaskCalendarEvent(
          tx,
          taskId,
          updatedTask.task_code,
          updatedTask.title,
          updatedTask.description,
          updatedTask.due_date,
          updatedTask.allocated_minutes,
          currentAssigneeIds,
          updatedTask.lead_employee_id,
          input.updated_by,
          updatedTask.stage === 'completed',
        );
      }

      return this.fetchTaskEntity(taskId, tx);
    });
  }

  async moveStage(taskId: number, input: MoveStageRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tasks.findUnique({
        where: { task_id: taskId },
        select: { stage: true, parent_task_id: true, task_code: true },
      });
      if (!existing) throw new Error(`Task #${taskId} not found`);

      const fromStage = existing.stage as TaskStage;
      const toStage = input.target_stage;

      let eventType: any = 'stage_changed';
      if (toStage === 'hold') {
        eventType = 'hold';
      } else if (toStage === 'requested') {
        eventType = 'requested';
      } else if (fromStage === 'requested' && toStage === 'in_progress') {
        eventType = input.note ? 'rejected' : 'withdrawn';
      } else if (toStage === 'completed') {
        eventType = 'approved';
      }

      const updateData: any = {
        stage: toStage,
        updated_by: input.actor_emp_id,
        updated_at: new Date(),
      };

      if (toStage === 'in_progress') {
        const now = new Date();
        const otherRunningTasks = await tx.tasks.findMany({
          where: {
            task_id: { not: taskId },
            deleted_at: null,
            is_timer_running: true,
            task_assignees: {
              some: { employee_id: input.actor_emp_id, deleted_at: null },
            },
          },
          select: {
            task_id: true,
            timer_started_at: true,
            actual_minutes: true,
            work_logs: true,
          },
        });

        for (const other of otherRunningTasks) {
          let elapsedSeconds = 0;
          if (other.timer_started_at) {
            elapsedSeconds = Math.max(
              0,
              Math.floor((now.getTime() - new Date(other.timer_started_at).getTime()) / 1000),
            );
          }
          const addMins = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
          const otherLogs = Array.isArray(other.work_logs) ? [...other.work_logs] : [];
          otherLogs.push({
            log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            employee_id: input.actor_emp_id,
            employee_name: 'Employee',
            action: 'pause',
            timestamp: now.toISOString(),
            duration_seconds: elapsedSeconds,
            note: 'Automatically paused because another task was moved to In Progress (Section 3.4)',
          });

          await tx.tasks.update({
            where: { task_id: other.task_id },
            data: {
              actual_minutes: (other.actual_minutes || 0) + addMins,
              is_timer_running: false,
              timer_started_at: null,
              work_logs: otherLogs,
              updated_by: input.actor_emp_id,
              updated_at: now,
            },
          });
        }
      }

      if (toStage === 'hold') {
        updateData.hold_reason = input.hold_reason || input.note || null;
      }

      if (toStage === 'requested') {
        updateData.requested_at = new Date();
      } else if (toStage === 'completed') {
        updateData.completed_at = new Date();
        updateData.completed_by = input.actor_emp_id;
        if (input.self_approved) {
          updateData.self_approved = true;
        }
      }

      if (input.note) {
        updateData.review_note = input.note;
      }

      await tx.tasks.update({
        where: { task_id: taskId },
        data: updateData,
      });

      await tx.task_history.create({
        data: {
          task_id: taskId,
          event_type: eventType,
          actor_id: input.actor_emp_id,
          from_stage: fromStage,
          to_stage: toStage,
          note: input.hold_reason || input.note || null,
        },
      });

      // Update calendar event completion status
      await tx.calendar_events.updateMany({
        where: { task_id: taskId, deleted_at: null },
        data: {
          status: toStage === 'completed' ? 'completed' : 'scheduled',
          updated_by: input.actor_emp_id,
          updated_at: new Date(),
        },
      });

      // Section 3.6: Sub-task stage sync with parent task
      if (existing.parent_task_id) {
        const parent = await tx.tasks.findUnique({
          where: { task_id: existing.parent_task_id },
          select: { task_id: true, stage: true, task_code: true },
        });

        if (parent && parent.stage !== 'completed') {
          // 1. If subtask is completed, check if all siblings are completed -> auto approve parent
          if (toStage === 'completed') {
            const siblings: any[] = await tx.tasks.findMany({
              where: { parent_task_id: existing.parent_task_id, deleted_at: null },
              select: { task_id: true, stage: true },
            });
            const allCompleted = siblings.every((s) => s.task_id === taskId || s.stage === 'completed');
            if (allCompleted) {
              await tx.tasks.update({
                where: { task_id: existing.parent_task_id },
                data: {
                  stage: 'completed',
                  completed_at: new Date(),
                  completed_by: input.actor_emp_id,
                  self_approved: true,
                  updated_by: input.actor_emp_id,
                  updated_at: new Date(),
                },
              });
              await tx.task_history.create({
                data: {
                  task_id: existing.parent_task_id,
                  event_type: 'approved',
                  actor_id: input.actor_emp_id,
                  from_stage: parent.stage,
                  to_stage: 'completed',
                  note: 'All sub tasks approved. Main task approved automatically.',
                },
              });

              await tx.calendar_events.updateMany({
                where: { task_id: existing.parent_task_id, deleted_at: null },
                data: {
                  status: 'completed',
                  updated_by: input.actor_emp_id,
                  updated_at: new Date(),
                },
              });
            }
          }
          // 2. If subtask is placed on hold -> place parent on hold if currently assigned or in_progress
          else if (toStage === 'hold') {
            if (parent.stage === 'assigned' || parent.stage === 'in_progress') {
              const holdReason = `Sub-task ${existing.task_code || `#${taskId}`} on hold: ${input.hold_reason || 'Sub-task paused'}`;
              await tx.tasks.update({
                where: { task_id: existing.parent_task_id },
                data: {
                  stage: 'hold',
                  hold_reason: holdReason,
                  updated_by: input.actor_emp_id,
                  updated_at: new Date(),
                },
              });
              await tx.task_history.create({
                data: {
                  task_id: existing.parent_task_id,
                  event_type: 'stage_changed',
                  actor_id: input.actor_emp_id,
                  from_stage: parent.stage,
                  to_stage: 'hold',
                  note: holdReason,
                },
              });
            }
          }
          // 3. If subtask moved to in_progress -> ensure parent is in_progress
          else if (toStage === 'in_progress') {
            if (parent.stage === 'assigned') {
              await tx.tasks.update({
                where: { task_id: existing.parent_task_id },
                data: {
                  stage: 'in_progress',
                  updated_by: input.actor_emp_id,
                  updated_at: new Date(),
                },
              });
              await tx.task_history.create({
                data: {
                  task_id: existing.parent_task_id,
                  event_type: 'stage_changed',
                  actor_id: input.actor_emp_id,
                  from_stage: 'assigned',
                  to_stage: 'in_progress',
                  note: `Sub-task ${existing.task_code || `#${taskId}`} started.`,
                },
              });
            } else if (parent.stage === 'hold') {
              // Check if any other subtask is still on hold
              const otherHold = await tx.tasks.findFirst({
                where: {
                  parent_task_id: existing.parent_task_id,
                  task_id: { not: taskId },
                  stage: 'hold',
                  deleted_at: null,
                },
              });
              if (!otherHold) {
                await tx.tasks.update({
                  where: { task_id: existing.parent_task_id },
                  data: {
                    stage: 'in_progress',
                    hold_reason: null,
                    updated_by: input.actor_emp_id,
                    updated_at: new Date(),
                  },
                });
                await tx.task_history.create({
                  data: {
                    task_id: existing.parent_task_id,
                    event_type: 'stage_changed',
                    actor_id: input.actor_emp_id,
                    from_stage: 'hold',
                    to_stage: 'in_progress',
                    note: `Sub-task ${existing.task_code || `#${taskId}`} resumed.`,
                  },
                });
              }
            }
          }
          // 4. If subtask submitted (requested) -> if all siblings submitted or completed, move parent to requested
          else if (toStage === 'requested' && parent.stage === 'in_progress') {
            const siblings: any[] = await tx.tasks.findMany({
              where: { parent_task_id: existing.parent_task_id, deleted_at: null },
              select: { task_id: true, stage: true },
            });
            const allSubmittedOrDone = siblings.every(
              (s) => s.task_id === taskId || s.stage === 'requested' || s.stage === 'completed',
            );
            if (allSubmittedOrDone) {
              await tx.tasks.update({
                where: { task_id: existing.parent_task_id },
                data: {
                  stage: 'requested',
                  requested_at: new Date(),
                  updated_by: input.actor_emp_id,
                  updated_at: new Date(),
                },
              });
              await tx.task_history.create({
                data: {
                  task_id: existing.parent_task_id,
                  event_type: 'requested',
                  actor_id: input.actor_emp_id,
                  from_stage: 'in_progress',
                  to_stage: 'requested',
                  note: 'All sub-tasks submitted for approval.',
                },
              });
            }
          }
        }
      }

      return this.fetchTaskEntity(taskId, tx);
    });
  }

  async trackWorkSession(taskId: number, input: TrackWorkSessionRepoInput): Promise<TaskEntity> {
    return this.prisma.$transaction(async (tx) => {
      let existing = await tx.tasks.findUnique({
        where: { task_id: taskId },
        select: {
          task_id: true,
          task_code: true,
          title: true,
          stage: true,
          parent_task_id: true,
          has_sub_tasks: true,
          started_at: true,
          actual_minutes: true,
          is_timer_running: true,
          timer_started_at: true,
          work_logs: true,
        },
      });
      if (!existing) throw new Error(`Task #${taskId} not found`);

      // If called on parent task with sub-tasks, redirect action to the caller's assigned subtask
      if (existing.has_sub_tasks) {
        const callerSubTask = await tx.tasks.findFirst({
          where: {
            parent_task_id: taskId,
            deleted_at: null,
            task_assignees: {
              some: { employee_id: input.actor_emp_id, deleted_at: null },
            },
          },
          select: {
            task_id: true,
            task_code: true,
            title: true,
            stage: true,
            parent_task_id: true,
            has_sub_tasks: true,
            started_at: true,
            actual_minutes: true,
            is_timer_running: true,
            timer_started_at: true,
            work_logs: true,
          },
        });

        if (callerSubTask) {
          taskId = callerSubTask.task_id;
          existing = callerSubTask;
        } else {
          throw new Error('This task has sub-tasks. Please track time on individual sub-tasks.');
        }
      }

      const now = new Date();
      const existingLogs = Array.isArray(existing.work_logs) ? [...existing.work_logs] : [];
      const updateData: any = {
        updated_by: input.actor_emp_id,
        updated_at: now,
      };

      if (input.action === 'start') {
        // Enforce Section 3.4 Task Working Rules: Only one task can be running (In Progress) at a time.
        // If employee has any other task currently running with active timer, pause it.
        const otherRunningTasks = await tx.tasks.findMany({
          where: {
            task_id: { not: taskId },
            deleted_at: null,
            is_timer_running: true,
            task_assignees: {
              some: { employee_id: input.actor_emp_id, deleted_at: null },
            },
          },
          select: {
            task_id: true,
            timer_started_at: true,
            actual_minutes: true,
            work_logs: true,
          },
        });

        for (const other of otherRunningTasks) {
          let elapsedSeconds = 0;
          if (other.timer_started_at) {
            elapsedSeconds = Math.max(
              0,
              Math.floor((now.getTime() - new Date(other.timer_started_at).getTime()) / 1000),
            );
          }
          const addMins = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
          const otherLogs = Array.isArray(other.work_logs) ? [...other.work_logs] : [];
          otherLogs.push({
            log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            employee_id: input.actor_emp_id,
            employee_name: input.actor_name,
            action: 'pause',
            timestamp: now.toISOString(),
            duration_seconds: elapsedSeconds,
            note: 'Automatically paused because another task was started (Section 3.4)',
          });

          await tx.tasks.update({
            where: { task_id: other.task_id },
            data: {
              actual_minutes: (other.actual_minutes || 0) + addMins,
              is_timer_running: false,
              timer_started_at: null,
              work_logs: otherLogs,
              updated_by: input.actor_emp_id,
              updated_at: now,
            },
          });
        }

        if (existing.stage === 'assigned') {
          updateData.stage = 'in_progress';
        }
        updateData.is_timer_running = true;
        updateData.timer_started_at = now;
        if (!existing.started_at) {
          updateData.started_at = now;
        }

        existingLogs.push({
          log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          employee_id: input.actor_emp_id,
          employee_name: input.actor_name,
          action: existing.started_at ? 'resume' : 'start',
          timestamp: now.toISOString(),
          note: input.note || null,
        });
        updateData.work_logs = existingLogs;

        await tx.tasks.update({
          where: { task_id: taskId },
          data: updateData,
        });

        await tx.task_history.create({
          data: {
            task_id: taskId,
            event_type: existing.stage === 'assigned' ? 'stage_changed' : 'edited',
            actor_id: input.actor_emp_id,
            from_stage: existing.stage,
            to_stage: existing.stage === 'assigned' ? 'in_progress' : existing.stage,
            note: existing.started_at ? 'Work session resumed' : 'Work started',
          },
        });

        if (existing.parent_task_id) {
          const parent = await tx.tasks.findUnique({
            where: { task_id: existing.parent_task_id },
            select: { task_id: true, stage: true, task_code: true },
          });
          if (parent && parent.stage === 'assigned') {
            await tx.tasks.update({
              where: { task_id: existing.parent_task_id },
              data: {
                stage: 'in_progress',
                updated_by: input.actor_emp_id,
                updated_at: now,
              },
            });
            await tx.task_history.create({
              data: {
                task_id: existing.parent_task_id,
                event_type: 'stage_changed',
                actor_id: input.actor_emp_id,
                from_stage: 'assigned',
                to_stage: 'in_progress',
                note: `Sub-task ${existing.task_code || `#${taskId}`} started work.`,
              },
            });
          }
        }
      } else if (input.action === 'pause') {
        let elapsedSeconds = 0;
        if (existing.is_timer_running && existing.timer_started_at) {
          elapsedSeconds = Math.max(
            0,
            Math.floor((now.getTime() - new Date(existing.timer_started_at).getTime()) / 1000),
          );
        }
        const addMins = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
        updateData.actual_minutes = (existing.actual_minutes || 0) + addMins;
        updateData.is_timer_running = false;
        updateData.timer_started_at = null;

        existingLogs.push({
          log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          employee_id: input.actor_emp_id,
          employee_name: input.actor_name,
          action: 'pause',
          timestamp: now.toISOString(),
          duration_seconds: elapsedSeconds,
          note: input.note || null,
        });
        updateData.work_logs = existingLogs;

        await tx.tasks.update({
          where: { task_id: taskId },
          data: updateData,
        });

        await tx.task_history.create({
          data: {
            task_id: taskId,
            event_type: 'edited',
            actor_id: input.actor_emp_id,
            note: `Work session paused (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s elapsed)`,
          },
        });
      } else if (input.action === 'finish') {
        let elapsedSeconds = 0;
        if (existing.is_timer_running && existing.timer_started_at) {
          elapsedSeconds = Math.max(
            0,
            Math.floor((now.getTime() - new Date(existing.timer_started_at).getTime()) / 1000),
          );
        }
        const addMins = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
        updateData.actual_minutes = (existing.actual_minutes || 0) + addMins;
        updateData.is_timer_running = false;
        updateData.timer_started_at = null;
        updateData.stage = 'requested';
        updateData.requested_at = now;

        existingLogs.push({
          log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          employee_id: input.actor_emp_id,
          employee_name: input.actor_name,
          action: 'finish',
          timestamp: now.toISOString(),
          duration_seconds: elapsedSeconds,
          note: input.note || null,
        });
        updateData.work_logs = existingLogs;

        await tx.tasks.update({
          where: { task_id: taskId },
          data: updateData,
        });

        await tx.task_history.create({
          data: {
            task_id: taskId,
            event_type: 'requested',
            actor_id: input.actor_emp_id,
            from_stage: existing.stage,
            to_stage: 'requested',
            note: input.note || 'Work finished and submitted for approval',
          },
        });

        if (existing.parent_task_id) {
          const siblings: any[] = await tx.tasks.findMany({
            where: { parent_task_id: existing.parent_task_id, deleted_at: null },
            select: { task_id: true, stage: true },
          });
          const allSubmittedOrDone = siblings.every(
            (s) => s.task_id === taskId || s.stage === 'requested' || s.stage === 'completed',
          );
          if (allSubmittedOrDone) {
            await tx.tasks.update({
              where: { task_id: existing.parent_task_id },
              data: {
                stage: 'requested',
                requested_at: now,
                updated_by: input.actor_emp_id,
                updated_at: now,
              },
            });
            await tx.task_history.create({
              data: {
                task_id: existing.parent_task_id,
                event_type: 'requested',
                actor_id: input.actor_emp_id,
                from_stage: 'in_progress',
                to_stage: 'requested',
                note: 'All sub-tasks finished and submitted for approval.',
              },
            });
          }
        }
      }

      return this.fetchTaskEntity(taskId, tx);
    });
  }

  async getBoard(filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    const cards = await this.queryBoardCards(undefined, filters);
    return this.groupCardsByStage(cards);
  }

  async getAdminBoard(filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    return this.getBoard(filters);
  }

  async getMyBoard(empId: number, filters?: TaskBoardFilters): Promise<TaskBoardResult> {
    const cards = await this.queryBoardCards(empId, filters);
    return this.groupCardsByStage(cards);
  }

  async getSummary(): Promise<TaskSummaryResult> {
    return this.querySummary(undefined);
  }

  async getAdminSummary(): Promise<TaskSummaryResult> {
    return this.getSummary();
  }

  async getMySummary(empId: number): Promise<TaskSummaryResult> {
    return this.querySummary(empId);
  }

  async getPendingReviewCount(): Promise<number> {
    return this.prisma.tasks.count({
      where: {
        stage: 'requested',
        deleted_at: null,
      },
    });
  }

  async getPendingRequestsCount(): Promise<number> {
    return this.getPendingReviewCount();
  }

  async getHistory(taskId: number): Promise<TaskHistoryEntity[]> {
    const rows = await this.prisma.task_history.findMany({
      where: { task_id: taskId },
      include: { employees: true },
      orderBy: { history_id: 'desc' },
    });

    return rows.map((r: any) => ({
      history_id: r.history_id.toString(),
      task_id: r.task_id,
      event_type: r.event_type as any,
      actor_id: r.actor_id,
      actor_name: r.employees?.name ?? null,
      from_stage: r.from_stage as any,
      to_stage: r.to_stage as any,
      note: r.note,
      changes: r.changes as any,
      created_at: r.created_at,
    }));
  }

  async getTaskHistory(taskId: number): Promise<TaskHistoryEntity[]> {
    return this.getHistory(taskId);
  }

  async getSubTasks(parentTaskId: number): Promise<TaskEntity[]> {
    const rows = await this.prisma.tasks.findMany({
      where: { parent_task_id: parentTaskId, deleted_at: null },
      orderBy: { task_id: 'asc' },
      select: { task_id: true },
    });
    return Promise.all(rows.map((r: any) => this.fetchTaskEntity(r.task_id, this.prisma)));
  }

  private async queryBoardCards(
    forEmpId?: number,
    filters?: TaskBoardFilters,
  ): Promise<TaskBoardCard[]> {
    const params: any[] = [];
    let pIdx = 1;

    let whereClause = 't.deleted_at IS NULL';

    if (forEmpId !== undefined) {
      // BFD Section 3.6: For a task with sub tasks, each employee sees their own sub task.
      whereClause += ` AND (
        (t.parent_task_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM task_assignees ta_st
          WHERE ta_st.task_id = t.task_id
            AND ta_st.employee_id = $${pIdx}
            AND ta_st.deleted_at IS NULL
        ))
        OR (t.parent_task_id IS NULL AND t.has_sub_tasks = false AND EXISTS (
          SELECT 1 FROM task_assignees ta_main
          WHERE ta_main.task_id = t.task_id
            AND ta_main.employee_id = $${pIdx}
            AND ta_main.deleted_at IS NULL
        ))
        OR (t.parent_task_id IS NULL AND t.has_sub_tasks = true AND t.lead_employee_id = $${pIdx} AND NOT EXISTS (
          SELECT 1 FROM tasks st_chk
          JOIN task_assignees ta_chk ON ta_chk.task_id = st_chk.task_id AND ta_chk.deleted_at IS NULL
          WHERE st_chk.parent_task_id = t.task_id AND ta_chk.employee_id = $${pIdx}
        ))
        OR (t.source = 'quick' AND t.created_by = $${pIdx})
      )`;
      params.push(forEmpId);
      pIdx++;
    } else {
      whereClause += ' AND t.parent_task_id IS NULL';
    }

    if (filters?.assignee_id) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM task_assignees ta_f
        WHERE ta_f.task_id = t.task_id
          AND ta_f.employee_id = $${pIdx++}
          AND ta_f.deleted_at IS NULL
      )`;
      params.push(filters.assignee_id);
    }

    if (filters?.search) {
      whereClause += ` AND (t.title ILIKE $${pIdx} OR t.task_code ILIKE $${pIdx})`;
      params.push(`%${filters.search}%`);
      pIdx++;
    }

    if (filters?.priority) {
      whereClause += ` AND t.priority = $${pIdx++}`;
      params.push(filters.priority);
    }

    if (filters?.task_type_id) {
      whereClause += ` AND t.task_type_id = $${pIdx++}`;
      params.push(filters.task_type_id);
    }

    if (filters?.stage) {
      whereClause += ` AND t.stage = $${pIdx++}`;
      params.push(filters.stage);
    }

    if (filters?.source) {
      whereClause += ` AND t.source = $${pIdx++}`;
      params.push(filters.source);
    }

    if (filters?.overdue_only) {
      whereClause += ` AND t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE`;
    }

    const sql = `
      SELECT
        t.task_id,
        t.task_code,
        t.title,
        t.description,
        t.priority,
        t.task_type_id,
        ml.label AS task_type_label,
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS due_date,
        t.allocated_minutes,
        t.stage,
        t.source,
        t.hold_reason,
        t.has_sub_tasks,
        t.lead_employee_id,
        e_lead.name AS lead_employee_name,
        t.other_task_type,
        t.parent_task_id,
        t_p.task_code AS parent_task_code,
        t_p.title AS parent_task_title,
        (t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS is_overdue,
        t.started_at,
        CASE
          WHEN t.has_sub_tasks = true THEN COALESCE(
            (SELECT SUM(st.actual_minutes)::int FROM tasks st WHERE st.parent_task_id = t.task_id AND st.deleted_at IS NULL),
            0
          )
          ELSE COALESCE(t.actual_minutes, 0)
        END AS actual_minutes,
        CASE
          WHEN t.has_sub_tasks = true THEN EXISTS(
            SELECT 1 FROM tasks st WHERE st.parent_task_id = t.task_id AND st.deleted_at IS NULL AND st.is_timer_running = true
          )
          ELSE COALESCE(t.is_timer_running, false)
        END AS is_timer_running,
        t.timer_started_at,
        t.requested_at,
        t.completed_at,
        t.created_at,
        (
          SELECT COUNT(*)::int
          FROM tasks st
          WHERE st.parent_task_id = t.task_id AND st.deleted_at IS NULL
        ) AS sub_tasks_count,
        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'employee_id', e.emp_id,
                'name', e.name,
                'email', e.email,
                'profile_picture_url', e.profile_picture
              )
            )
            FROM task_assignees ta
            JOIN employees e ON ta.employee_id = e.emp_id AND e.deleted_at IS NULL
            WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL
          ),
          '[]'::json
        ) AS assignees
      FROM tasks t
      LEFT JOIN tasks t_p ON t.parent_task_id = t_p.task_id AND t_p.deleted_at IS NULL
      LEFT JOIN master_lookup ml ON t.task_type_id = ml.lookup_id AND ml.deleted_at IS NULL
      LEFT JOIN employees e_lead ON t.lead_employee_id = e_lead.emp_id AND e_lead.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY t.created_at DESC, t.task_id DESC;
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    return rows.map((r) => ({
      task_id: r.task_id,
      task_code: r.task_code,
      title: r.title,
      description: r.description,
      priority: r.priority,
      task_type_id: r.task_type_id,
      task_type_label: r.task_type_label,
      due_date: r.due_date,
      allocated_minutes: r.allocated_minutes,
      stage: r.stage,
      source: r.source || 'personal',
      hold_reason: r.hold_reason,
      has_sub_tasks: Boolean(r.has_sub_tasks),
      sub_tasks_count: r.sub_tasks_count ?? 0,
      lead_employee_id: r.lead_employee_id,
      lead_employee_name: r.lead_employee_name,
      other_task_type: r.other_task_type,
      parent_task_id: r.parent_task_id,
      parent_task_code: r.parent_task_code ?? null,
      parent_task_title: r.parent_task_title ?? null,
      is_overdue: Boolean(r.is_overdue),
      started_at: r.started_at ? new Date(r.started_at) : null,
      actual_minutes: r.actual_minutes ?? 0,
      is_timer_running: Boolean(r.is_timer_running),
      timer_started_at: r.timer_started_at ? new Date(r.timer_started_at) : null,
      requested_at: r.requested_at ? new Date(r.requested_at) : null,
      completed_at: r.completed_at ? new Date(r.completed_at) : null,
      created_at: new Date(r.created_at),
      assignees: (r.assignees || []).map((a: any) => ({
        employee_id: a.employee_id,
        name: a.name,
        email: a.email,
        avatar_url: this.signPhotoUrl(a.profile_picture_url),
      })),
    }));
  }

  private groupCardsByStage(cards: TaskBoardCard[]): TaskBoardResult {
    const columns: TaskBoardResult['columns'] = {
      assigned: [],
      in_progress: [],
      hold: [],
      requested: [],
      completed: [],
    };

    for (const card of cards) {
      if (columns[card.stage]) {
        columns[card.stage].push(card);
      }
    }

    return {
      columns,
      counts: {
        assigned: columns.assigned.length,
        in_progress: columns.in_progress.length,
        hold: columns.hold.length,
        requested: columns.requested.length,
        completed: columns.completed.length,
        total: cards.length,
      },
    };
  }

  private async querySummary(forEmpId?: number): Promise<TaskSummaryResult> {
    const params: any[] = [];
    let pIdx = 1;
    let whereClause = 't.deleted_at IS NULL';

    if (forEmpId !== undefined) {
      whereClause += ` AND (
        (t.parent_task_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM task_assignees ta_st
          WHERE ta_st.task_id = t.task_id
            AND ta_st.employee_id = $${pIdx}
            AND ta_st.deleted_at IS NULL
        ))
        OR (t.parent_task_id IS NULL AND t.has_sub_tasks = false AND EXISTS (
          SELECT 1 FROM task_assignees ta_main
          WHERE ta_main.task_id = t.task_id
            AND ta_main.employee_id = $${pIdx}
            AND ta_main.deleted_at IS NULL
        ))
        OR (t.parent_task_id IS NULL AND t.has_sub_tasks = true AND t.lead_employee_id = $${pIdx} AND NOT EXISTS (
          SELECT 1 FROM tasks st_chk
          JOIN task_assignees ta_chk ON ta_chk.task_id = st_chk.task_id AND ta_chk.deleted_at IS NULL
          WHERE st_chk.parent_task_id = t.task_id AND ta_chk.employee_id = $${pIdx}
        ))
        OR (t.source = 'quick' AND t.created_by = $${pIdx})
      )`;
      params.push(forEmpId);
    } else {
      whereClause += ' AND t.parent_task_id IS NULL';
    }

    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.stage IN ('assigned', 'in_progress'))::int AS todo_or_in_progress,
        COUNT(*) FILTER (WHERE t.stage = 'hold')::int AS on_hold,
        COUNT(*) FILTER (WHERE t.stage = 'requested')::int AS submitted,
        COUNT(*) FILTER (WHERE t.stage = 'completed')::int AS approved,
        COUNT(*) FILTER (WHERE t.stage = 'assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE t.stage = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE t.stage = 'requested')::int AS requested,
        COUNT(*) FILTER (WHERE t.stage <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE)::int AS overdue,
        COUNT(*) FILTER (WHERE t.stage = 'completed' AND DATE(t.completed_at) = CURRENT_DATE)::int AS completed_today,
        COUNT(*) FILTER (WHERE t.stage = 'completed' AND DATE_TRUNC('month', t.completed_at) = DATE_TRUNC('month', CURRENT_DATE))::int AS completed_this_month
      FROM tasks t
      WHERE ${whereClause};
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);
    const row = rows[0] || {};

    return {
      total: row.total ?? 0,
      todo_or_in_progress: row.todo_or_in_progress ?? 0,
      on_hold: row.on_hold ?? 0,
      submitted: row.submitted ?? 0,
      approved: row.approved ?? 0,
      assigned: row.assigned ?? 0,
      in_progress: row.in_progress ?? 0,
      requested: row.requested ?? 0,
      overdue: row.overdue ?? 0,
      completed_today: row.completed_today ?? 0,
      completed_this_month: row.completed_this_month ?? 0,
    };
  }

  private async fetchTaskEntity(taskId: number, tx: any): Promise<TaskEntity> {
    const row = await tx.tasks.findUnique({
      where: { task_id: taskId },
      include: {
        master_lookup: true,
        employees_tasks_completed_byToemployees: true,
        employees_tasks_created_byToemployees: true,
        employees_tasks_lead_employee_idToemployees: true,
        task_assignees: {
          where: { deleted_at: null },
          include: {
            employees_task_assignees_employee_idToemployees: true,
          },
        },
      },
    });

    if (!row) throw new Error(`Task #${taskId} not found`);

    // Fetch child sub tasks if parent
    let subTasks: TaskEntity[] | undefined = undefined;
    let subTasksCount = 0;
    if (row.has_sub_tasks) {
      const childRows = await tx.tasks.findMany({
        where: { parent_task_id: taskId, deleted_at: null },
        orderBy: { task_id: 'asc' },
        include: {
          master_lookup: true,
          employees_tasks_completed_byToemployees: true,
          employees_tasks_created_byToemployees: true,
          employees_tasks_lead_employee_idToemployees: true,
          task_assignees: {
            where: { deleted_at: null },
            include: {
              employees_task_assignees_employee_idToemployees: true,
            },
          },
        },
      });
      subTasksCount = childRows.length;
      subTasks = childRows.map((cr: any) => ({
        task_id: cr.task_id,
        task_code: cr.task_code,
        title: cr.title,
        description: cr.description,
        priority: cr.priority,
        task_type_id: cr.task_type_id,
        task_type_label: cr.master_lookup?.label ?? null,
        due_date: cr.due_date ? cr.due_date.toISOString().slice(0, 10) : null,
        allocated_minutes: cr.allocated_minutes,
        stage: cr.stage,
        review_note: cr.review_note,
        hold_reason: cr.hold_reason,
        source: (cr.source as TaskSource) || 'personal',
        parent_task_id: cr.parent_task_id,
        parent_task_code: row.task_code,
        parent_task_title: row.title,
        lead_employee_id: cr.lead_employee_id,
        lead_employee_name: cr.employees_tasks_lead_employee_idToemployees?.name ?? null,
        has_sub_tasks: false,
        other_task_type: cr.other_task_type,
        sub_tasks_count: 0,
        sub_tasks: [],
        started_at: cr.started_at,
        actual_minutes: cr.actual_minutes ?? 0,
        is_timer_running: Boolean(cr.is_timer_running),
        timer_started_at: cr.timer_started_at,
        work_logs: (cr.work_logs as any) || [],
        requested_at: cr.requested_at,
        completed_at: cr.completed_at,
        completed_by: cr.completed_by,
        completed_by_name: cr.employees_tasks_completed_byToemployees?.name ?? null,
        self_approved: cr.self_approved,
        row_version: cr.row_version,
        created_at: cr.created_at,
        created_by: cr.created_by,
        created_by_name: cr.employees_tasks_created_byToemployees?.name ?? null,
        assignees: cr.task_assignees.map((a: any) => ({
          task_assignee_id: a.task_assignee_id,
          task_id: a.task_id,
          employee_id: a.employee_id,
          name: a.employees_task_assignees_employee_idToemployees?.name ?? '',
          email: a.employees_task_assignees_employee_idToemployees?.email ?? '',
          avatar_url: this.signPhotoUrl(
            a.employees_task_assignees_employee_idToemployees?.profile_picture,
          ),
        })),
      }));
    }

    let parentTaskCode: string | null = null;
    let parentTaskTitle: string | null = null;
    if (row.parent_task_id) {
      const p = await tx.tasks.findUnique({
        where: { task_id: row.parent_task_id },
        select: { task_code: true, title: true },
      });
      if (p) {
        parentTaskCode = p.task_code;
        parentTaskTitle = p.title;
      }
    }

    return {
      task_id: row.task_id,
      task_code: row.task_code,
      title: row.title,
      description: row.description,
      priority: row.priority,
      task_type_id: row.task_type_id,
      task_type_label: row.master_lookup?.label ?? null,
      due_date: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
      allocated_minutes: row.allocated_minutes,
      stage: row.stage,
      review_note: row.review_note,
      hold_reason: row.hold_reason,
      source: (row.source as TaskSource) || 'personal',
      parent_task_id: row.parent_task_id,
      parent_task_code: parentTaskCode,
      parent_task_title: parentTaskTitle,
      lead_employee_id: row.lead_employee_id,
      lead_employee_name: row.employees_tasks_lead_employee_idToemployees?.name ?? null,
      has_sub_tasks: Boolean(row.has_sub_tasks),
      other_task_type: row.other_task_type,
      sub_tasks_count: subTasksCount,
      sub_tasks: subTasks,
      started_at: row.started_at,
      actual_minutes:
        row.has_sub_tasks && subTasks && subTasks.length > 0
          ? subTasks.reduce((sum: number, st: any) => sum + (st.actual_minutes || 0), 0)
          : (row.actual_minutes ?? 0),
      is_timer_running:
        row.has_sub_tasks && subTasks && subTasks.length > 0
          ? subTasks.some((st: any) => st.is_timer_running)
          : Boolean(row.is_timer_running),
      timer_started_at:
        row.has_sub_tasks && subTasks && subTasks.length > 0
          ? subTasks.find((st: any) => st.is_timer_running)?.timer_started_at ?? null
          : row.timer_started_at,
      work_logs: (row.work_logs as any) || [],
      requested_at: row.requested_at,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      completed_by_name: row.employees_tasks_completed_byToemployees?.name ?? null,
      self_approved: row.self_approved,
      row_version: row.row_version,
      created_at: row.created_at,
      created_by: row.created_by,
      created_by_name: row.employees_tasks_created_byToemployees?.name ?? null,
      assignees: row.task_assignees.map((a: any) => ({
        task_assignee_id: a.task_assignee_id,
        task_id: a.task_id,
        employee_id: a.employee_id,
        name: a.employees_task_assignees_employee_idToemployees?.name ?? '',
        email: a.employees_task_assignees_employee_idToemployees?.email ?? '',
        avatar_url: this.signPhotoUrl(
          a.employees_task_assignees_employee_idToemployees?.profile_picture,
        ),
      })),
    };
  }

  private signPhotoUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    if (key.startsWith('http')) return key;
    if (this.fileStorage) {
      try {
        return this.fileStorage.getSignedUrl(key);
      } catch {
        return key;
      }
    }
    return key;
  }

  private async syncTaskCalendarEvent(
    tx: any,
    taskId: number,
    taskCode: string,
    title: string,
    description: string | null | undefined,
    dueDate: Date | string | null | undefined,
    allocatedMinutes: number | null | undefined,
    assigneeIds: number[],
    leadEmployeeId: number | null | undefined,
    actorEmpId: number,
    isCompleted = false,
  ): Promise<void> {
    if (!assigneeIds || assigneeIds.length === 0) {
      return;
    }

    let eventDate: Date;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        const parts = dueDate.slice(0, 10).split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          eventDate = new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0);
        } else {
          eventDate = new Date(dueDate);
        }
      } else {
        eventDate = new Date(dueDate);
      }
    } else {
      eventDate = new Date();
    }

    const year = eventDate.getFullYear();
    const month = eventDate.getMonth() + 1;
    const day = eventDate.getDate();

    const durationMins = allocatedMinutes && allocatedMinutes > 0 ? allocatedMinutes : 60;
    const durationMs = durationMins * 60 * 1000;

    const distinctEmployees = Array.from(
      new Set([...assigneeIds, ...(leadEmployeeId ? [leadEmployeeId] : [])]),
    );
    const organizerId = leadEmployeeId || distinctEmployees[0] || actorEmpId;
    const attendeeIds = distinctEmployees.filter((id) => id !== organizerId);

    const dayStart = new Date(year, month - 1, day, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

    const existingOnDay = await tx.calendar_events.findMany({
      where: {
        deleted_at: null,
        task_id: { not: taskId },
        start_time: { gte: dayStart, lte: dayEnd },
        OR: [
          { organizer_id: organizerId },
          { calendar_event_attendees: { some: { employee_id: organizerId, deleted_at: null } } },
        ],
      },
      orderBy: { start_time: 'asc' },
      select: { start_time: true, end_time: true },
    });

    let chosenStart = new Date(year, month - 1, day, 9, 0, 0);
    for (let h = 9; h <= 17; h++) {
      const candStart = new Date(year, month - 1, day, h, 0, 0);
      const candEnd = new Date(candStart.getTime() + durationMs);

      const hasConflict = existingOnDay.some((ev: any) => {
        const evS = new Date(ev.start_time).getTime();
        const evE = new Date(ev.end_time).getTime();
        return candStart.getTime() < evE && candEnd.getTime() > evS;
      });

      if (!hasConflict) {
        chosenStart = candStart;
        break;
      }
    }

    const chosenEnd = new Date(chosenStart.getTime() + durationMs);

    const existing = await tx.calendar_events.findFirst({
      where: { task_id: taskId, deleted_at: null },
      select: { event_id: true },
    });

    if (existing) {
      await tx.calendar_events.update({
        where: { event_id: existing.event_id },
        data: {
          title: `[${taskCode}] ${title}`,
          description: description ?? null,
          start_time: chosenStart,
          end_time: chosenEnd,
          status: isCompleted ? 'completed' : 'scheduled',
          organizer_id: organizerId,
          updated_by: actorEmpId,
          updated_at: new Date(),
        },
      });

      await tx.calendar_event_attendees.updateMany({
        where: { event_id: existing.event_id, deleted_at: null },
        data: { deleted_at: new Date(), deleted_by: actorEmpId },
      });

      if (attendeeIds.length > 0) {
        await tx.calendar_event_attendees.createMany({
          data: attendeeIds.map((empId) => ({
            event_id: existing.event_id,
            employee_id: empId,
            response_status: 'accepted',
            created_by: actorEmpId,
          })),
        });
      }
    } else {
      const createdEvent = await tx.calendar_events.create({
        data: {
          event_type: 'task_block',
          title: `[${taskCode}] ${title}`,
          description: description ?? null,
          start_time: chosenStart,
          end_time: chosenEnd,
          is_all_day: false,
          status: isCompleted ? 'completed' : 'scheduled',
          task_id: taskId,
          organizer_id: organizerId,
          created_by: actorEmpId,
        },
      });

      if (attendeeIds.length > 0) {
        await tx.calendar_event_attendees.createMany({
          data: attendeeIds.map((empId) => ({
            event_id: createdEvent.event_id,
            employee_id: empId,
            response_status: 'accepted',
            created_by: actorEmpId,
          })),
        });
      }
    }
  }
}

