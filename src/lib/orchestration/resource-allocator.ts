/**
 * RESOURCE ALLOCATOR
 * Resource allocation, load balancing, capacity management
 */

export interface ResourceRequest {
  resourceType: string;
  amount: number;
  duration?: number; // seconds
  priority?: string;
}

export interface ResourceAllocation {
  allocationId: string;
  resourceType: string;
  amount: number;
  allocatedAt: Date;
  expiresAt?: Date;
}

export interface ResourceUtilization {
  totalCapacity: Record<string, number>;
  allocated: Record<string, number>;
  available: Record<string, number>;
  utilizationPercent: Record<string, number>;
}

// In-memory resource tracking (in production, use Redis or database)
const resourceCapacity: Record<string, number> = {
  cpu: 100,
  memory: 1000, // GB
  storage: 10000, // GB
  network: 1000, // Mbps
  gpu: 10,
};

const allocations: Map<string, ResourceAllocation> = new Map();

/**
 * Allocate resources
 */
export async function allocateResources(
  request: ResourceRequest
): Promise<{ success: boolean; allocation?: ResourceAllocation; error?: string }> {
  try {
    const available = getAvailableResources(request.resourceType);

    if (available < request.amount) {
      return { success: false, error: 'Insufficient resources' };
    }

    const allocationId = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = request.duration
      ? new Date(Date.now() + request.duration * 1000)
      : undefined;

    const allocation: ResourceAllocation = {
      allocationId,
      resourceType: request.resourceType,
      amount: request.amount,
      allocatedAt: new Date(),
      expiresAt,
    };

    allocations.set(allocationId, allocation);

    // Auto-release after duration
    if (request.duration) {
      setTimeout(() => {
        allocations.delete(allocationId);
      }, request.duration * 1000);
    }

    return { success: true, allocation };
  } catch (error) {
    console.error('Error allocating resources:', error);
    return { success: false, error: 'Failed to allocate resources' };
  }
}

/**
 * Release resources
 */
export async function releaseResources(
  allocationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const allocation = allocations.get(allocationId);

    if (!allocation) {
      return { success: false, error: 'Allocation not found' };
    }

    allocations.delete(allocationId);

    return { success: true };
  } catch (error) {
    console.error('Error releasing resources:', error);
    return { success: false, error: 'Failed to release resources' };
  }
}

/**
 * Get resource utilization
 */
export async function getResourceUtilization(): Promise<ResourceUtilization> {
  try {
    const allocated: Record<string, number> = {};
    const available: Record<string, number> = {};
    const utilizationPercent: Record<string, number> = {};

    // Calculate allocated resources
    for (const allocation of allocations.values()) {
      const type = allocation.resourceType;
      allocated[type] = (allocated[type] || 0) + allocation.amount;
    }

    // Calculate available and utilization
    for (const [type, capacity] of Object.entries(resourceCapacity)) {
      const alloc = allocated[type] || 0;
      available[type] = capacity - alloc;
      utilizationPercent[type] = (alloc / capacity) * 100;
    }

    return {
      totalCapacity: { ...resourceCapacity },
      allocated,
      available,
      utilizationPercent,
    };
  } catch (error) {
    console.error('Error getting resource utilization:', error);
    return {
      totalCapacity: {},
      allocated: {},
      available: {},
      utilizationPercent: {},
    };
  }
}

/**
 * Balance load across agents
 */
export async function balanceLoad(
  agentIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple load balancing algorithm
    // In production, this would analyze agent load and redistribute tasks

    if (agentIds.length === 0) {
      return { success: false, error: 'No agents provided' };
    }

    // Mock implementation
    return { success: true };
  } catch (error) {
    console.error('Error balancing load:', error);
    return { success: false, error: 'Failed to balance load' };
  }
}

/**
 * Check capacity for resource type
 */
export async function checkCapacity(
  resourceType: string
): Promise<{ available: boolean; capacity: number }> {
  try {
    const available = getAvailableResources(resourceType);
    const capacity = resourceCapacity[resourceType] || 0;

    return {
      available: available > 0,
      capacity: available,
    };
  } catch (error) {
    console.error('Error checking capacity:', error);
    return { available: false, capacity: 0 };
  }
}

/**
 * Helper: Get available resources
 */
function getAvailableResources(resourceType: string): number {
  const capacity = resourceCapacity[resourceType] || 0;
  let allocated = 0;

  for (const allocation of allocations.values()) {
    if (allocation.resourceType === resourceType) {
      // Check if allocation has expired
      if (!allocation.expiresAt || allocation.expiresAt > new Date()) {
        allocated += allocation.amount;
      }
    }
  }

  return capacity - allocated;
}
