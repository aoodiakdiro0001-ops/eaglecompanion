export type Role = "owner" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: number;
  role?: Role;
}

export interface Membership {
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: number;
}

export interface Device {
  id: string;
  workspace_id: string;
  name: string;
  platform: string | null;
  model: string | null;
  battery_level: number | null;
  battery_charging: number | null;
  network_type: string | null;
  screen_w: number | null;
  screen_h: number | null;
  user_agent: string | null;
  paired_at: number;
  last_seen_at: number | null;
  revoked_at: number | null;
}

export interface DeviceView extends Device {
  online: boolean;
  sharing: boolean;
}

export interface ShareSession {
  id: string;
  device_id: string;
  started_at: number;
  expires_at: number;
  ended_at: number | null;
  last_frame_at: number | null;
  frames_count: number;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  device_id: string | null;
  action: string;
  metadata: string | null;
  ip: string | null;
  created_at: number;
  actor_name?: string | null;
  device_name?: string | null;
}

export interface MemberRow {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  created_at: number;
}
