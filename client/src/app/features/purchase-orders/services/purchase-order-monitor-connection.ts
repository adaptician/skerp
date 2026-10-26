import { Injectable } from '@angular/core';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MonitorEvent, PurchaseOrderChange } from '../models/purchase-order-monitor';

/** The hub's path under the API base (`/api/v1/hubs/purchase-orders`), proxied like every API call. */
export const MONITOR_HUB_PATH = '/hubs/purchase-orders';

/**
 * Monitor Mode's live connection to the purchase-order hub. Subscribing opens it and unsubscribing
 * closes it. It reports `connecting`, then `live`, then `disconnected` if the connection fails or
 * drops; it never reconnects on its own (automatic reconnection is a planned follow-up).
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderMonitorConnection {
  connect(): Observable<MonitorEvent> {
    return new Observable<MonitorEvent>((subscriber) => {
      const connection = new HubConnectionBuilder()
        .withUrl(environment.apiBaseUrl + MONITOR_HUB_PATH)
        .configureLogging(LogLevel.Warning)
        .build();
      // Closing on unsubscribe is not a drop, so it reports nothing.
      let stopping = false;
      const disconnected = () => {
        if (!stopping) {
          subscriber.next({ kind: 'state', state: 'disconnected' });
        }
      };

      connection.on('PurchaseOrderChanged', (change: PurchaseOrderChange) =>
        subscriber.next({ kind: 'change', change }),
      );
      connection.onclose(disconnected);

      subscriber.next({ kind: 'state', state: 'connecting' });
      connection.start().then(() => {
        if (!stopping) {
          subscriber.next({ kind: 'state', state: 'live' });
        }
      }, disconnected);

      return () => {
        stopping = true;
        void connection.stop();
      };
    });
  }
}
