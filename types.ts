export type ONTStatus = 'active' | 'operational' | 'isolated' | 'critical' | 'validated' | 'repeated';

export interface ONTRecord {
  id: string;
  msan: string;
  location: string;
  sn: string;
  version: string;
  vendorId: string; // Added field for Vendor ID
  status: ONTStatus; // Derived or simulated for the KPI cards
}

export interface KPIStats {
  searched: number;
  total: number;
  isolated: number;
  critical: number;
  repeated: number;
  huaweiCount?: number;
  nokiaCount?: number;
  connectedUsersCount?: number;
}

export interface FilterState {
  sn: string;
  location: string;
  msan: string;
  status?: ONTStatus | null;
  showRepeated?: boolean;
  massiveSns?: string[]; // Array of SNs for Massive Search
  waitingSns?: string[]; // Cumulative isolated SNs for File d'attente
  vendor?: 'nokia' | 'huawei' | null;
}

export interface User {
  id?: number;
  username: string;
  role?: string;
  password?: string;
  status?: 'pending' | 'active' | 'blocked';
  sessionId?: string;
  createdAt?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface HuaweiRecord {
  id?: number;
  deviceName: string;
  location: string;
  sn: string;
  createdAt?: string;
}

export interface NokiaRecord {
  id?: number;
  objectName: string;
  ne: string;
  serialNumber: string;
  createdAt?: string;
}
