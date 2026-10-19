export interface NotificationEntity {
  notification_id: number;
  recipient_id: number;
  kind: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: number | null;
  read_at: Date | null;
  created_at: Date;
  created_by: number | null;
}
