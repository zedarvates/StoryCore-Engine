import * as os from 'os';
import * as net from 'net';

export interface DiscoveredServer {
  url: string;
  type: 'comfyui' | 'mcp';
  name?: string;
  status: 'online';
}

export class NetworkDiscoveryService {
  private commonComfyPorts = [8188, 8189, 8000, 8080];
  private commonMcpPorts = [3000, 3001, 8000, 8080];
  private scanTimeout = 1000;

  /**
   * Scans the local network for ComfyUI and MCP servers
   */
  async discoverServers(): Promise<DiscoveredServer[]> {
    const results: DiscoveredServer[] = [];
    const localIPs = this.getLocalIPs();
    
    // We'll primarily scan localhost and the local subnet of the main interface
    const targets = ['127.0.0.1', ...localIPs];
    
    const scanPromises: Promise<void>[] = [];
    
    for (const ip of targets) {
      // Scan ComfyUI ports
      for (const port of this.commonComfyPorts) {
        scanPromises.push(this.checkPort(ip, port).then(isAlive => {
          if (isAlive) {
            results.push({
              url: `http://${ip}:${port}`,
              type: 'comfyui',
              name: `ComfyUI on ${ip}:${port}`,
              status: 'online'
            });
          }
        }));
      }
      
      // Scan MCP ports
      for (const port of this.commonMcpPorts) {
        scanPromises.push(this.checkPort(ip, port).then(isAlive => {
          if (isAlive) {
            // Check if it's already added as comfyui (some servers might be both)
            const exists = results.find(r => r.url === `http://${ip}:${port}`);
            if (!exists) {
              results.push({
                url: `http://${ip}:${port}`,
                type: 'mcp',
                name: `MCP Server on ${ip}:${port}`,
                status: 'online'
              });
            }
          }
        }));
      }
    }
    
    await Promise.all(scanPromises);
    
    // Deduplicate and filter (standard fetch to confirm ComfyUI)
    return this.validateResults(results);
  }

  private async checkPort(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = false;

      socket.setTimeout(this.scanTimeout);
      
      socket.on('connect', () => {
        status = true;
        socket.destroy();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
      });
      
      socket.on('error', () => {
        socket.destroy();
      });
      
      socket.on('close', () => {
        resolve(status);
      });

      socket.connect(port, host);
    });
  }

  private async validateResults(servers: DiscoveredServer[]): Promise<DiscoveredServer[]> {
    const validated: DiscoveredServer[] = [];
    
    for (const server of servers) {
      try {
        // Simple fetch check
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1000);
        
        const endpoint = server.type === 'comfyui' ? `${server.url}/system_stats` : server.url;
        const response = await fetch(endpoint, { signal: controller.signal }).catch(() => null);
        clearTimeout(id);
        
        if (response && response.ok) {
          validated.push(server);
        } else if (server.type === 'mcp' && response) {
          // MCP might return 404 on root but 200 on SSE endpoint, but usually root should respond
          validated.push(server);
        }
      } catch {
        // Ignore errors, keep as-is if port was open but fetch failed
        validated.push(server);
      }
    }
    
    return validated;
  }

  private getLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
          
          // Also try to guess the subnet (last octet 1 to 254) is too slow
          // We just return the main interface IP for now
        }
      }
    }
    
    return ips;
  }
}
