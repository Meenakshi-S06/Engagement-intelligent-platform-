// src/services/interventions.service.ts
import api from './api';
import { Intervention } from '../types';

export interface CreateInterventionPayload {
  studentId: string;
  riskScoreId?: string;
  title: string;
  description: string;
  deadline?: string;
}

export async function getInterventions(): Promise<Intervention[]> {
  const res = await api.get('/api/interventions');
  return res.data.data;
}

export async function getIntervention(id: string): Promise<Intervention> {
  const res = await api.get(`/api/interventions/${id}`);
  return res.data.data;
}

export async function createIntervention(payload: CreateInterventionPayload): Promise<Intervention> {
  const res = await api.post('/api/interventions', payload);
  return res.data.data;
}

export async function updateIntervention(id: string, payload: Partial<Intervention>): Promise<Intervention> {
  const res = await api.put(`/api/interventions/${id}`, payload);
  return res.data.data;
}

export async function addInterventionUpdate(id: string, note: string): Promise<{ id: string; note: string; createdAt: string }> {
  const res = await api.post(`/api/interventions/${id}/updates`, { note });
  return res.data.data;
}

export async function logInterventionOutcome(id: string, outcome: 'IMPROVED' | 'NO_CHANGE' | 'DECLINED', remarks?: string) {
  const res = await api.post(`/api/interventions/${id}/outcome`, { outcome, remarks });
  return res.data.data;
}
