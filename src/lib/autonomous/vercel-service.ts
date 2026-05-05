/**
 * HOLLY Vercel Service
 * Enables Holly to trigger her own deployments via the Vercel API
 */

export interface DeploymentResult {
    success: boolean;
    id?: string;
    url?: string;
    error?: string;
}

export class VercelService {
    private static API_TOKEN = process.env.VERCEL_API_TOKEN;
    private static TEAM_ID = process.env.VERCEL_TEAM_ID;

    /**
     * Trigger a new deployment for a specific repository
     */
    static async triggerDeployment(owner: string, repo: string, branch: string = 'main'): Promise<DeploymentResult> {
        try {
            if (!this.API_TOKEN) {
                throw new Error('VERCEL_API_TOKEN not configured');
            }

            const vercelUrl = this.TEAM_ID
                ? `https://api.vercel.com/v13/deployments?teamId=${this.TEAM_ID}`
                : 'https://api.vercel.com/v13/deployments';

            console.log(`[VercelService] Triggering deployment for ${owner}/${repo} on branch ${branch}...`);

            const response = await fetch(vercelUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repo,
                    gitSource: {
                        type: 'github',
                        repo: `${owner}/${repo}`,
                        ref: branch,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error?.message || 'Failed to trigger deployment',
                };
            }

            return {
                success: true,
                id: data.id,
                url: data.url,
            };
        } catch (error: any) {
            console.error('[VercelService] Deployment error:', error);
            return {
                success: false,
                error: error.message || 'Internal server error',
            };
        }
    }

    /**
     * Check status of a deployment
     */
    static async getDeploymentStatus(deploymentId: string): Promise<any> {
        try {
            if (!this.API_TOKEN) {
                throw new Error('VERCEL_API_TOKEN not configured');
            }

            const vercelUrl = this.TEAM_ID
                ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${this.TEAM_ID}`
                : `https://api.vercel.com/v13/deployments/${deploymentId}`;

            const response = await fetch(vercelUrl, {
                headers: {
                    'Authorization': `Bearer ${this.API_TOKEN}`,
                },
            });

            return await response.json();
        } catch (error) {
            console.error('[VercelService] Status check error:', error);
            throw error;
        }
    }
}
