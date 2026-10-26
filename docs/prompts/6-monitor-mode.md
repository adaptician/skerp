# Purchase Order Monitor Mode - create a separate view that allows users to view live updates and change only statuses

Add a new Feature to Epic AB#1429 Purchase Order Management called "Purchase Order Monitor Mode". This will be added to the existing Purchase Order management screen.

Currently the Purchase Order management screen supports CRUD operations to view, create, edit, and delete purchase orders. From the list view screen it is also possible to update the status of a purchase order.

The current screen works well for users that must capture and manage purchase orders. Create a secondary view that becomes available when a user toggles on "Monitor Mode". The toggle is applicable only to the purchase order list screen.

When Monitor Mode is enabled the create new purchase order button should be hidden, and all Action dropdown buttons on the grid view should also be hidden. Rows should no longer be expandable to show line items. The only action that remains possible when Monitor Mode is enabled is the update to purchase order status using the dropdown select on the row item.

Monitor Mode is intended to allow users to update purchase order status and actively observe real-time changes as they happen. SignalR should be used and a connection should be opened when Monitor Mode is enabled, and disconnected when disabled. Monitor Mode may be left on for extended periods of time - include a health indicator on the screen to show the status of the connection to SignalR. If the client is disconnected, the health indicator should make it clear to the user and prompt them to refresh to re-establish the connection. Automation re-connection is excluded from the scope of this work item, and will be implemented as a follow up enhancement.

When Monitor Mode is enabled the filters on the list screen should continue to apply to the search results, including reference, customers, status, and created dates, sorting, and pagination. When a new purchase order is created, edited, updated, or deleted, a relevant event should be raised that causes sessions for other users to automatically retrieve the latest results via SignalR. This should not cause a full page refresh - instead it should update the grid results according to the same filters. Only users with Monitor Mode enabled should receive the updates.

Changes to purchase order line items should animate into view as follows:
- created lines should expand into place, pushing rows above and below to make room.
- edited lines should be outlined with a thick coloured border for 2 seconds and become slightly elevated above the rest before returning to normal.
- deleted lines should shrink out of view, the opposite to lines that are created, and fade out.
- status updates should have the same thick coloured border and elevated effect as edits, and should also change the row background colour to match the new status 
- the background colour change should also only last for 2 seconds, before the row returns to normal.

When Monitor Mode is disabled the purchase order screen should look and function exactly as it does now.

No additional release or feature toggle is required for Monitor Mode, and concurrency safety remains out of scope for now.

No changes will be made to the Figma design at this time. Frontend components should continue to follow the standards and remain consistent with the look and feel established by the current design.

Create 1 User Story under the new Feature and /plan-work-item for the story, then /run-milestone until the work is ready for staging verification then raise a PR.