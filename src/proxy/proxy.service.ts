import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ProxyRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  teamId: string;
  apiKeyId: string;
}

interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  tokensUsed: number;
}

@Injectable()
export class ProxyService {
  private spectreUrl: string;
  private gatewaySecret: string;

  constructor(private readonly config: ConfigService) {
    this.spectreUrl = this.config.get<string>('SPECTRE_INTERNAL_URL')!;
    this.gatewaySecret = this.config.get<string>('GATEWAY_SPECTRE_SECRET')!;
  }

  async forward(req: ProxyRequest): Promise<ProxyResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Gateway-Secret': this.gatewaySecret,
      'X-Team-Id': req.teamId,
      'X-Api-Key-Id': req.apiKeyId,
    };

    if (req.headers['x-ai-provider']) {
      headers['X-AI-Provider'] = req.headers['x-ai-provider'];
    }
    if (req.headers['x-ai-key']) {
      headers['X-AI-Key'] = req.headers['x-ai-key'];
    }

    const url = `${this.spectreUrl}${req.path}`;
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const tokensUsed = parseInt(response.headers.get('X-Tokens-Used') || '0', 10);

    let body: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'x-gateway-secret'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body,
      tokensUsed,
    };
  }
}
