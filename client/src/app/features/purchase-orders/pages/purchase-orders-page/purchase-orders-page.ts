import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Store } from '@ngrx/store';

import { ActionMenuItem } from '../../../../common/components/action-menu/action-menu';
import { ConfirmModal } from '../../../../common/components/confirm-modal/confirm-modal';
import { Icon } from '../../../../common/components/icon/icon';
import { Pagination } from '../../../../common/components/pagination/pagination';
import { Toggle } from '../../../../common/components/toggle/toggle';
import { NotificationService } from '../../../../common/services/notification.service';
import { ViewportService } from '../../../../common/services/viewport.service';
import { selectDemoModeEnabled } from '../../../../common/state/demo-mode';
import {
  FilterChanges,
  PurchaseOrderFilters,
} from '../../components/purchase-order-filters/purchase-order-filters';
import { MonitorHealth } from '../../components/monitor-health/monitor-health';
import { PurchaseOrderForm } from '../../components/purchase-order-form/purchase-order-form';
import {
  PurchaseOrderList,
  RowAction,
} from '../../components/purchase-order-list/purchase-order-list';
import { StatusControl } from '../../components/status-control/status-control';
import { PurchaseOrder } from '../../models/purchase-order';
import { PAGE_SIZE, PurchaseOrderListItem } from '../../models/purchase-order-list';
import { PurchaseOrdersApi } from '../../services/purchase-orders-api';
import {
  PurchaseOrdersActions,
  selectExpanded,
  selectFailed,
  selectHasFilters,
  selectItems,
  selectLineItems,
  selectLoading,
  selectMonitor,
  selectQuery,
  selectRowChanges,
  selectStatusChanging,
  selectTotalCount,
} from '../../state';

/** Every row offers View; Edit and Delete are shown disabled once the server says the order is locked. */
const VIEW_ACTION: ActionMenuItem = { id: 'view', label: 'View', icon: 'view' };
const EDIT_ACTION_ID = 'edit';
const DELETE_ACTION_ID = 'delete';

/**
 * The Purchase Orders screen: the title row with "New purchase order", the order list with its
 * pagination, the status controls, the create and edit modals, and the delete confirmation. It owns the wiring between the list and the store.
 */
@Component({
  selector: 'adapt-purchase-orders-page',
  imports: [
    ConfirmModal,
    Icon,
    MonitorHealth,
    Pagination,
    PurchaseOrderFilters,
    PurchaseOrderForm,
    PurchaseOrderList,
    StatusControl,
    Toggle,
  ],
  templateUrl: './purchase-orders-page.html',
  styleUrl: './purchase-orders-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrdersPage {
  private readonly store = inject(Store);
  private readonly api = inject(PurchaseOrdersApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  private readonly document = inject(DOCUMENT);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly wide = inject(ViewportService).isWide;
  protected readonly demoMode = this.store.selectSignal(selectDemoModeEnabled);
  protected readonly query = this.store.selectSignal(selectQuery);
  protected readonly items = this.store.selectSignal(selectItems);
  protected readonly totalCount = this.store.selectSignal(selectTotalCount);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly failed = this.store.selectSignal(selectFailed);
  protected readonly expanded = this.store.selectSignal(selectExpanded);
  protected readonly lineItems = this.store.selectSignal(selectLineItems);
  protected readonly hasFilters = this.store.selectSignal(selectHasFilters);
  protected readonly statusChanging = this.store.selectSignal(selectStatusChanging);
  protected readonly monitor = this.store.selectSignal(selectMonitor);
  protected readonly monitorMode = computed(() => this.monitor().enabled);
  protected readonly rowChanges = this.store.selectSignal(selectRowChanges);
  protected readonly creating = signal(false);
  /** The order in the edit modal, loaded with every line. */
  protected readonly editingOrder = signal<PurchaseOrder | null>(null);
  /** True while an order is loading for the edit modal; further Edits wait. */
  private loadingEdit = false;
  /** The order awaiting delete confirmation, and whether the delete is with the server. */
  protected readonly deleting = signal<PurchaseOrderListItem | null>(null);
  protected readonly deleteBusy = signal(false);

  protected readonly rowActions = (order: PurchaseOrderListItem): readonly ActionMenuItem[] => [
    VIEW_ACTION,
    {
      id: EDIT_ACTION_ID,
      label: 'Edit',
      icon: 'edit',
      disabled: !order.isEditable,
      disabledReason: 'Only Pending purchase orders can be edited.',
    },
    {
      id: DELETE_ACTION_ID,
      label: 'Delete',
      icon: 'trash',
      danger: true,
      disabled: !order.isDeletable,
      disabledReason: 'Only Pending purchase orders can be deleted.',
    },
  ];

  constructor() {
    this.store.dispatch(PurchaseOrdersActions.opened());
    // Leaving the screen closes Monitor Mode's connection; the choice itself is remembered.
    this.destroyRef.onDestroy(() => this.store.dispatch(PurchaseOrdersActions.closed()));
  }

  protected toggleMonitorMode(enabled: boolean): void {
    this.store.dispatch(PurchaseOrdersActions.monitorModeToggled({ enabled }));
  }

  /** The disconnected indicator's Refresh: a reload opens a new connection, back in Monitor Mode. */
  protected reload(): void {
    this.document.location.reload();
  }

  protected openCreate(): void {
    this.creating.set(true);
  }

  protected closeCreate(): void {
    this.creating.set(false);
  }

  protected onCreated(order: PurchaseOrder): void {
    this.creating.set(false);
    this.store.dispatch(PurchaseOrdersActions.orderCreated({ order }));
  }

  protected toggleRow(id: string): void {
    this.store.dispatch(PurchaseOrdersActions.rowToggled({ id }));
  }

  protected loadMoreLines(request: { id: string; skip: number }): void {
    this.store.dispatch(PurchaseOrdersActions.lineItemsRequested(request));
  }

  protected toggleSort(): void {
    this.store.dispatch(PurchaseOrdersActions.sortToggled());
  }

  protected changePage(page: number): void {
    this.store.dispatch(PurchaseOrdersActions.pageChanged({ page }));
  }

  protected retry(): void {
    this.store.dispatch(PurchaseOrdersActions.retried());
  }

  protected changeFilters(changes: FilterChanges): void {
    this.store.dispatch(PurchaseOrdersActions.queryChanged({ changes }));
  }

  protected clearFilters(): void {
    this.store.dispatch(PurchaseOrdersActions.filtersCleared());
  }

  protected changeStatus(id: string, statusId: number): void {
    this.store.dispatch(PurchaseOrdersActions.statusChangeRequested({ id, statusId }));
  }

  protected onAction({ action, order }: RowAction): void {
    if (action === VIEW_ACTION.id && !this.expanded().includes(order.id)) {
      this.toggleRow(order.id);
    } else if (action === DELETE_ACTION_ID && order.isDeletable) {
      this.deleting.set(order);
    } else if (
      action === EDIT_ACTION_ID &&
      order.isEditable &&
      !this.loadingEdit &&
      this.editingOrder() === null
    ) {
      // The modal needs every line, not the list's first page; a failure shows the error popup.
      // One load at a time, so a second Edit cannot swap the order under an open form.
      this.loadingEdit = true;
      this.api
        .getForEdit(order.id)
        .pipe(
          finalize(() => (this.loadingEdit = false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({ next: (full) => this.editingOrder.set(full), error: () => undefined });
    }
  }

  protected deleteMessage(order: PurchaseOrderListItem): string {
    return `${order.reference} for ${order.customer.name} will be deleted. This cannot be undone.`;
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected confirmDelete(): void {
    const order = this.deleting();
    if (!order || this.deleteBusy()) {
      return;
    }

    this.deleteBusy.set(true);
    this.api
      .deleteOrder(order.id)
      .pipe(
        finalize(() => this.deleteBusy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.notifications.showSuccess(
            'Purchase order deleted',
            `${order.reference} was deleted.`,
          );
          this.store.dispatch(PurchaseOrdersActions.orderDeleted({ id: order.id }));
        },
        // The error popup carries the server's reason; the confirmation closes and the page reloads,
        // so a row another user changed or deleted shows its current state.
        error: () => {
          this.deleting.set(null);
          this.store.dispatch(PurchaseOrdersActions.retried());
        },
      });
  }

  protected closeEdit(): void {
    this.editingOrder.set(null);
  }

  protected onEdited(order: PurchaseOrderListItem): void {
    this.editingOrder.set(null);
    this.store.dispatch(PurchaseOrdersActions.orderEdited({ order }));
  }
}
