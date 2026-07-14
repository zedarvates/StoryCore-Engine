import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: any;
  result?: any;
  error?: any;
  id?: string | number;
}

export interface MCPClientOptions {
  transport: 'stdio' | 'sse' | 'websockets';
  serverPath?: string;
  serverArgs?: string[];
  serverUrl?: string;
  env?: Record<string, string>;
}

export class MCPClientService extends EventEmitter {
  private activeConnections: Map<string, MCPConnection> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(serverId: string, options: MCPClientOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.activeConnections.has(serverId)) {
        return { success: true };
      }

      let connection: MCPConnection;

      if (options.transport === 'stdio') {
        if (!options.serverPath) {
          throw new Error('serverPath is required for stdio transport');
        }
        connection = new StdIOConnection(options.serverPath, options.serverArgs || [], options.env);
      } else if (options.transport === 'sse') {
        if (!options.serverUrl) {
          throw new Error('serverUrl is required for sse transport');
        }
        connection = new SSEConnection(options.serverUrl);
      } else {
        throw new Error(`Unsupported transport: ${options.transport}`);
      }

      await connection.connect();
      
      // Handle messages
      connection.on('message', (msg) => this.emit(`message:${serverId}`, msg));
      connection.on('error', (err) => {
        console.error(`MCP Connection Error (${serverId}):`, err);
        this.emit(`error:${serverId}`, err);
      });
      connection.on('close', () => {
        this.activeConnections.delete(serverId);
        this.emit(`close:${serverId}`);
      });

      // Initialize
      await this.rpcCall(connection, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'StoryCore', version: '1.0.0' },
      });

      await this.rpcNotify(connection, 'initialized', {});

      this.activeConnections.set(serverId, connection);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const connection = this.activeConnections.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return await this.rpcCall(connection, 'tools/call', {
      name: toolName,
      arguments: args,
    });
  }

  /**
   * List tools available on an MCP server
   */
  async listTools(serverId: string): Promise<any> {
    const connection = this.activeConnections.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return await this.rpcCall(connection, 'tools/list', {});
  }

  /**
   * Generic RPC call to an MCP server
   */
  async rpcCallProxy(serverId: string, method: string, params: any): Promise<any> {
    const connection = this.activeConnections.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return await this.rpcCall(connection, method, params);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.activeConnections.get(serverId);
    if (connection) {
      await connection.close();
      this.activeConnections.delete(serverId);
    }
  }

  private async rpcCall(connection: MCPConnection, method: string, params: any): Promise<any> {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const onMessage = (msg: MCPMessage) => {
        if (msg.id === id) {
          connection.removeListener('message', onMessage);
          if (msg.error) {
            reject(new Error(msg.error.message || 'Unknown RPC error'));
          } else {
            resolve(msg.result);
          }
        }
      };

      connection.on('message', onMessage);
      connection.send(message).catch((err) => {
        connection.removeListener('message', onMessage);
        reject(err);
      });
      
      // Timeout
      setTimeout(() => {
        connection.removeListener('message', onMessage);
        reject(new Error(`RPC call ${method} timed out`));
      }, 30000);
    });
  }

  private async rpcNotify(connection: MCPConnection, method: string, params: any): Promise<void> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };
    await connection.send(message);
  }
}

abstract class MCPConnection extends EventEmitter {
  abstract connect(): Promise<void>;
  abstract send(message: MCPMessage): Promise<void>;
  abstract close(): Promise<void>;
}

class StdIOConnection extends MCPConnection {
  private process: any;
  private buffer: string = '';

  constructor(private path: string, private args: string[], private env?: Record<string, string>) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.path, this.args, {
          env: { ...process.env, ...this.env },
          shell: true,
        });

        this.process.stdout.on('data', (data: Buffer) => {
          this.buffer += data.toString();
          const lines = this.buffer.split('\n');
          this.buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const msg = JSON.parse(line);
                this.emit('message', msg);
              } catch (e) {
                console.error('Failed to parse MCP StdIO line:', line, e);
              }
            }
          }
        });

        this.process.stderr.on('data', (data: Buffer) => {
          console.warn(`MCP Server (${this.path}) Error:`, data.toString());
        });

        this.process.on('close', (code: number) => {
          this.emit('close', code);
        });

        this.process.on('error', (err: Error) => {
          this.emit('error', err);
          reject(err);
        });

        // Wait a bit for the process to be ready
        setTimeout(resolve, 500);
      } catch (err) {
        reject(err);
      }
    });
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.process || !this.process.stdin.writable) {
      throw new Error('Process not writable');
    }
    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  async close(): Promise<void> {
    if (this.process) {
      this.process.kill();
    }
  }
}

class SSEConnection extends MCPConnection {
  private endpoint: string | null = null;

  constructor(private url: string) {
    super();
  }

  async connect(): Promise<void> {
    // We simulate EventSource using fetch and streams in Node.js
    // Actually, we can use 'eventsource' package if it's there
    // But for now, we'll use a basic stream
    
    return new Promise(async (resolve, reject) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second connection timeout

        const response = await fetch(this.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`SSE Connection failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get stream reader');
        }

        resolve(); // Connected to the SSE stream holder

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += new TextDecoder().decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              // Handle events like 'endpoint'
              const eventType = line.substring(6).trim();
              if (eventType === 'endpoint') {
                // Next line should be data
              }
            } else if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              if (data.startsWith('http')) {
                this.endpoint = data; // Comfy-MCP often sends the POST endpoint here
              } else {
                try {
                  const msg = JSON.parse(data);
                  this.emit('message', msg);
                } catch (e) {
                  // Not JSON, maybe endpoint?
                  if (data.includes('http')) this.endpoint = data;
                }
              }
            }
          }
        }
        
        this.emit('close');
      } catch (err) {
        this.emit('error', err);
        reject(err);
      }
    });
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.endpoint) {
      throw new Error('No SSE endpoint received yet');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send MCP message: ${response.status}`);
    }
  }

  async close(): Promise<void> {
    // SSE cleanup
  }
}
