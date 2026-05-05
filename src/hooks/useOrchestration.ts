// React Hooks for Orchestration API
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as orchestrationApi from '@/lib/api/orchestration';

// Hook for agents
export function useAgents() {
  const [agents, setAgents] = useState<orchestrationApi.Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async (filters?: {
    status?: string;
    type?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await orchestrationApi.listAgents(filters);
      setAgents(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (data: {
    name: string;
    type: string;
    capabilities: string[];
    config?: any;
  }) => {
    try {
      const newAgent = await orchestrationApi.createAgent(data);
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { agents, loading, error, fetchAgents, createAgent };
}

// Hook for workflows
export function useWorkflows() {
  const [workflows, setWorkflows] = useState<orchestrationApi.Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async (filters?: {
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await orchestrationApi.listWorkflows(filters);
      setWorkflows(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (data: {
    name: string;
    description?: string;
    steps: Array<{ name: string; type: string; config: any }>;
  }) => {
    try {
      const newWorkflow = await orchestrationApi.createWorkflow(data);
      setWorkflows(prev => [...prev, newWorkflow]);
      return newWorkflow;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const executeWorkflow = useCallback(async (workflowId: string) => {
    try {
      const updated = await orchestrationApi.executeWorkflow(workflowId);
      setWorkflows(prev => prev.map(w => w.id === workflowId ? updated : w));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const pauseWorkflow = useCallback(async (workflowId: string) => {
    try {
      const updated = await orchestrationApi.pauseWorkflow(workflowId);
      setWorkflows(prev => prev.map(w => w.id === workflowId ? updated : w));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const resumeWorkflow = useCallback(async (workflowId: string) => {
    try {
      const updated = await orchestrationApi.resumeWorkflow(workflowId);
      setWorkflows(prev => prev.map(w => w.id === workflowId ? updated : w));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return { 
    workflows, 
    loading, 
    error, 
    fetchWorkflows, 
    createWorkflow, 
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow 
  };
}

// Hook for tasks
export function useTasks() {
  const [tasks, setTasks] = useState<orchestrationApi.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (filters?: {
    status?: string;
    priority?: string;
    workflowId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await orchestrationApi.listTasks(filters);
      setTasks(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleTask = useCallback(async (data: {
    title: string;
    description?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    agentId?: string;
    workflowId?: string;
    estimatedTime?: number;
  }) => {
    try {
      const newTask = await orchestrationApi.scheduleTask(data);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, fetchTasks, scheduleTask };
}

// Hook for resource utilization
export function useResourceUtilization() {
  const [resources, setResources] = useState<orchestrationApi.ResourceUtilization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orchestrationApi.getResourceUtilization();
      setResources(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchResources]);

  return { resources, loading, error, fetchResources };
}
