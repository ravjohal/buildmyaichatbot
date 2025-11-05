import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from './db';
import { agentMessages, liveAgentHandoffs, conversationMessages } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface WebSocketClient extends WebSocket {
  sessionId?: string;
  conversationId?: string;
  handoffId?: string;
  userId?: string; // for agents
  isAgent?: boolean;
}

interface WSMessage {
  type: 'message' | 'visitor_message' | 'agent_message' | 'agent_joined' | 'agent_left' | 'handoff_request' | 'typing' | 'error' | 'join';
  role?: 'visitor' | 'agent';
  content?: string;
  sessionId?: string;
  conversationId?: string;
  handoffId?: string;
  agentName?: string;
  timestamp?: number;
}

export class LiveChatWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/live-chat'
    });

    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('[WebSocket] New connection');

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('[WebSocket] Error handling message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            content: 'Failed to process message' 
          }));
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('[WebSocket] Connection closed');
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.removeClient(ws);
      });
    });

    console.log('[WebSocket] Server initialized on path /ws/live-chat');
  }

  private async handleMessage(ws: WebSocketClient, message: WSMessage) {
    switch (message.type) {
      case 'join':
        await this.handleJoin(ws, message);
        break;
      case 'visitor_message':
        await this.handleVisitorMessage(ws, message);
        break;
      case 'agent_message':
        await this.handleAgentMessage(ws, message);
        break;
      case 'handoff_request':
        await this.handleHandoffRequest(ws, message);
        break;
      case 'typing':
        this.broadcastToConversation(message.conversationId!, message, ws);
        break;
      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
    }
  }

  private async handleJoin(ws: WebSocketClient, message: WSMessage) {
    if (!message.conversationId) {
      ws.send(JSON.stringify({ type: 'error', content: 'Missing conversation ID' }));
      return;
    }

    ws.conversationId = message.conversationId;
    ws.isAgent = message.role === 'agent';

    this.addClient(message.conversationId, ws);
    console.log(`[WebSocket] ${message.role} joined conversation:`, message.conversationId);
  }

  private async handleVisitorMessage(ws: WebSocketClient, message: WSMessage) {
    if (!message.sessionId || !message.conversationId) {
      ws.send(JSON.stringify({ type: 'error', content: 'Missing session or conversation ID' }));
      return;
    }

    ws.sessionId = message.sessionId;
    ws.conversationId = message.conversationId;
    ws.isAgent = false;

    this.addClient(message.conversationId, ws);

    try {
      await db.insert(conversationMessages).values({
        conversationId: message.conversationId,
        role: 'user',
        content: message.content!,
        wasEscalated: "false",
      });

      this.broadcastToConversation(message.conversationId, {
        type: 'message',
        role: 'visitor',
        content: message.content,
        timestamp: Date.now(),
      }, ws);
    } catch (error) {
      console.error('[WebSocket] Error saving visitor message:', error);
      ws.send(JSON.stringify({ type: 'error', content: 'Failed to save message' }));
    }
  }

  private async handleAgentMessage(ws: WebSocketClient, message: WSMessage) {
    if (!message.handoffId || !message.conversationId) {
      ws.send(JSON.stringify({ type: 'error', content: 'Missing required fields' }));
      return;
    }

    ws.handoffId = message.handoffId;
    ws.conversationId = message.conversationId;
    ws.isAgent = true;

    this.addClient(message.conversationId, ws);

    try {
      // Get the agent ID from the handoff record
      const handoff = await db.select().from(liveAgentHandoffs)
        .where(eq(liveAgentHandoffs.id, message.handoffId))
        .limit(1);
      
      if (!handoff[0] || !handoff[0].agentId) {
        ws.send(JSON.stringify({ type: 'error', content: 'Handoff not found or not accepted by an agent' }));
        return;
      }

      const agentId = handoff[0].agentId;

      await db.insert(agentMessages).values({
        handoffId: message.handoffId,
        conversationId: message.conversationId,
        agentId,
        content: message.content!,
      });

      await db.insert(conversationMessages).values({
        conversationId: message.conversationId,
        role: 'assistant',
        content: message.content!,
        wasEscalated: "true",
      });

      this.broadcastToConversation(message.conversationId, {
        type: 'message',
        role: 'agent',
        content: message.content,
        agentName: message.agentName,
        timestamp: Date.now(),
      }, ws);
    } catch (error) {
      console.error('[WebSocket] Error saving agent message:', error);
      ws.send(JSON.stringify({ type: 'error', content: 'Failed to save message' }));
    }
  }

  private async handleHandoffRequest(ws: WebSocketClient, message: WSMessage) {
    if (!message.sessionId || !message.conversationId) {
      ws.send(JSON.stringify({ type: 'error', content: 'Missing session or conversation ID' }));
      return;
    }

    ws.sessionId = message.sessionId;
    ws.conversationId = message.conversationId;
    
    this.addClient(message.conversationId, ws);

    console.log('[WebSocket] Handoff request received for conversation:', message.conversationId);
  }

  private addClient(conversationId: string, client: WebSocketClient) {
    if (!this.clients.has(conversationId)) {
      this.clients.set(conversationId, new Set());
    }
    this.clients.get(conversationId)!.add(client);
  }

  private removeClient(client: WebSocketClient) {
    if (client.conversationId) {
      const conversationClients = this.clients.get(client.conversationId);
      if (conversationClients) {
        conversationClients.delete(client);
        if (conversationClients.size === 0) {
          this.clients.delete(client.conversationId);
        }
      }
    }
  }

  private broadcastToConversation(conversationId: string, message: WSMessage, exclude?: WebSocketClient) {
    const conversationClients = this.clients.get(conversationId);
    if (!conversationClients) return;

    const messageStr = JSON.stringify(message);
    conversationClients.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  public notifyAgents(chatbotId: string, handoffData: any) {
    const message: WSMessage = {
      type: 'handoff_request',
      conversationId: handoffData.conversationId,
      handoffId: handoffData.id,
      timestamp: Date.now(),
    };

    this.wss.clients.forEach((client: WebSocket) => {
      const wsClient = client as WebSocketClient;
      if (wsClient.isAgent && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify(message));
      }
    });
  }

  public registerAgent(ws: WebSocketClient, userId: string) {
    ws.userId = userId;
    ws.isAgent = true;
  }
}

let liveChatWS: LiveChatWebSocket;

export function setupWebSocket(server: Server) {
  liveChatWS = new LiveChatWebSocket(server);
  return liveChatWS;
}

export function getLiveChatWS() {
  return liveChatWS;
}
