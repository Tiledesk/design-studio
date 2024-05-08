import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Observer, Subscription, fromEvent, merge, of } from 'rxjs';
import { map, mapTo } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  networkStatus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  
  constructor() { 
    this.checkNetworkStatus()
  }

  checkNetworkStatus() {
    // this.networkStatus = navigator.onLine;
    merge(
      of(null),
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).pipe(map(() => navigator.onLine))
      .subscribe(status => {
        // this.networkStatus = status;
        this.networkStatus$.next(status)
      });
  }

}