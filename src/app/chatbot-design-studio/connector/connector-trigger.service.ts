// src/app/chatbot-design-studio/connector/connector-trigger.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConnectorTriggerService {
  constructor(private http: HttpClient) {}

  private opts(apiKey?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (apiKey) { headers['Authorization'] = `Bearer ${apiKey}`; }
    return { headers: new HttpHeaders(headers) };
  }

  subscribe(baseUrl: string, apiKey: string, body: { id: string; external_id: string; webhook: string; inputs: { [k: string]: any } }): Observable<any> {
    return this.http.post(`${baseUrl}/api/triggers`, body, this.opts(apiKey));
  }

  unsubscribe(baseUrl: string, apiKey: string, body: { id: string; external_id: string; webhook: string }): Observable<any> {
    return this.http.request('delete', `${baseUrl}/api/triggers`, { body, ...this.opts(apiKey) });
  }

  armDebug(baseUrl: string, apiKey: string, webhookId: string, ttl = 600): Observable<any> {
    return this.http.post(`${baseUrl}/api/triggers/debug`, { webhook_id: webhookId, ttl }, this.opts(apiKey));
  }

  disarmDebug(baseUrl: string, apiKey: string, webhookId: string): Observable<any> {
    return this.http.request('delete', `${baseUrl}/api/triggers/debug`, { body: { webhook_id: webhookId }, ...this.opts(apiKey) });
  }
}
