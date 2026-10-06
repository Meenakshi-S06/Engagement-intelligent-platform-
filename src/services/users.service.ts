// src/services/users.service.ts
import api from './api';
import { User, RoleName } from '../types';

export async function getMe(): Promise<User> {
  const res = await api.get('/users/me');
  const d = res.data.data;
  return {
    ...d,
    role: (d.role?.name ?? d.role) as RoleName,
  };
}

export async function updateMe(payload: Partial<User>): Promise<User> {
  const res = await api.patch('/users/me', payload);
  const d = res.data.data;
  return {
    ...d,
    role: (d.role?.name ?? d.role) as RoleName,
  };
}

export async function getUsers(params?: { role?: string; search?: string }): Promise<User[]> {
  const res = await api.get('/users', { params });
  return (res.data.data || []).map((d: any) => ({
    ...d,
    role: (d.role?.name ?? d.role) as RoleName,
  }));
}

export async function getUser(id: string): Promise<User> {
  const res = await api.get(`/users/${id}`);
  const d = res.data.data;
  return {
    ...d,
    role: (d.role?.name ?? d.role) as RoleName,
  };
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: RoleName;
  department?: string;
  year?: number;
  phone?: string;
}): Promise<User> {
  const res = await api.post('/admin/users', payload);
  return res.data.data;
}

export async function changeUserRole(id: string, role: RoleName): Promise<User> {
  const res = await api.patch(`/admin/users/${id}/role`, { role });
  return res.data.data;
}

export async function changeUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'PENDING'): Promise<User> {
  const res = await api.patch(`/admin/users/${id}/status`, { status });
  return res.data.data;
}
