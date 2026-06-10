import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { AppConfigService } from './app-config';

export interface ApiRootHealthResult {
  url: string;
  ok: boolean;
  status?: number;
  elapsedMs: number;
  error?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AppResumeHealthService {
  constructor(
    private readonly http: HttpClient,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Lightweight health-check used on tab resume (Chrome background throttling).
   * Requirement: GET {apiUrl}/ should return 200.
   */
  checkApiRoot(timeoutMs: number = 3000): Observable<ApiRootHealthResult> {
    const apiUrl = (this.appConfig.getConfig()?.apiUrl ?? '').toString();
    const url = apiUrl.replace(/\/+$/, '') + '/';
    const startedAt = Date.now();

    return this.http.get(url, { observe: 'response', responseType: 'text' }).pipe(
      timeout(timeoutMs),
      map((resp: HttpResponse<string>) => {
        const elapsedMs = Date.now() - startedAt;
        const result: ApiRootHealthResult = {
          url,
          ok: resp.status === 200,
          status: resp.status,
          elapsedMs,
        };
        return result;
      }),
      catchError((error: unknown) => {
        const elapsedMs = Date.now() - startedAt;
        const result: ApiRootHealthResult = {
          url,
          ok: false,
          elapsedMs,
          error,
        };
        return of(result);
      }),
    );
  }
}

