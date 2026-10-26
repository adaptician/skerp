# Purchase Orders

A user should be able to access a purchase order management screen from a menu item "Purchase Orders".

## Purchase Order Retrieval

A user should be able to view a list of purchase orders as a paginated result.

- Optionally, they should be able to search by reference number.
- Optionally, they should be able to filter from a dropdown multi-select of existing customers, dropdown single-select of statuses, and date range applied to createdAt date on the purchase order.
- A purchase order should display as a row in a grid and include:
    - reference number
    - customer name
    - currency symbol and grand total
    - current status
    - createdAt (date only)
    - an Actions dropdown button
- Each purchase order row should be expandable on the list screen:
    - when expanded, line items for the purchase order should be displayed with sku, name, quantity, price, and sub-total
    - use lazy-loading for line items, loading maximum 20 at a time when expanding.
- Include a visual placeholder for when no items are found.
- Load first page result on landing with most recent first.

Rules:
- Both purchase order grand totals and line item sub-totals MUST be computed on the server; totals are NEVER computed on the client-side, where they are read-only.

## Purchase Order Creation

The purchase order list screen should include a button to create a new purchase order. Clicking the button opens a new form in a modal.

- form should include:
    - reference number
    - customer
        - name
        - email
    - status with default "Pending"
    - currency with default "ZAR"
    - list of line items:
        - sku
        - name
        - quantity
        - price
        - sub-total (DISPLAY ONLY)
    - grand total (DISPLAY ONLY)
    - notes

Client-Side Rules:
- the form should validate for required fields and enforce data types on the client-side.
- the reference field should perform a lookup on blur to assert if the reference number already exists in the database:
    - if the reference does not exist, display a green checkmark.
    - if the reference does exist, display a red stop sign.
- the customer name field should perform a search against the backend for existing customers:
    - search is triggered on keybown when the input contains a minimum of 5 characters.
    - a list of customer names should be displayed as search results.
    - if the user selects an existing customer, display it as a pill in the field input:
        - auto-populate the existing customer email address and disable the email address field (editing the email address for an existing customer is not supported).
    - if no selection is made, the user should capture the new customer name and hit ENTER when the name is ready to capture:
        - for new customers, a valid email address is required and must be captured.
    - a customer with the same name but a different email is treated as the same customer for now and should raise an error.
- quantity and price can NEVER be negative numbers.
- sku on line item should be searchable against existing products:
    - display sku and product name in search results
    - if a user selects a result item auto-populate the sku and product name and disable these fields
    - capture new products into the database - provide helpful errors if collisions occur on sku
    - a product with the same sku but different name is treated as the same product for now and should raise an error.
- whenever a valid line item is added a `calculate` endpoint should be called that calculates the totals for the purchase order so far:
    - total calculations MUST be performed server-side to prevent issues with rounding and conversions between client and server.
    - the totals should display in the form once they are received from the backend and are NEVER editable.
    - any changes to line item quantity, price should trigger a re-calculate on blur.
- minimum line items: 1; maximum line items: 100.
- allow line items to be removed and recalculate totals.

Include a "Cancel" button to close the modal, and a "Save" button to post the purchase order for creation.

Demo Features:
- Attempting to save a purchase order with an existing reference should produce an error from the backend:
   - Disable the "Save" button when the reference lookup indicates that the reference number already exists WHEN Demo Mode = false;
   - WHEN Demo Mode = true DO NOT disable the "Save" button based on the reference lookup - instead leave the button enabled and highlight the save button in red.
   - WHEN Demo Mode = true display a demo comment under the save button with the following note: "To improve a user's experience, asserting reference availability is performed proactively. Disabling the 'Save' button provides a more interactive user experience. However, the button has been left enabled during demo mode to demonstrate that the backend does not rely on client-side validation to enforce data integrity."

Server-Side Rules:
- the API MUST validate the request for required fields and all data types.
- a purchase order captured with an existing reference is invalid - block creation and return a descriptive error to the user.
- totals are not included in the request and must be calculated from the request during creation to gurantee integrity:
    - create a dedicated class called `PurchaseOrderCalculator` to encapsulate domain logic for purchase order calculations:
        - the `calculate` endpoint must use this class to return totals to the client-side.
        - purchase order creation must use this class to calculate totals prior to persistence.
        - purchase order editing must use this class to calculate totals prior to persistence.

Minimum Unit Tests:
- GIVEN a new purchase order WHEN the reference number is null THEN creation should fail with invalid request error.
- GIVEN a new purchase order WHEN the reference number already exists in the database THEN creation should fail with duplicate error.
- GIVEN a new purchase order WHEN the customer name is null THEN creation should fail with invalid request error.
- GIVEN a new purchase order WHEN the customer email is null or invalid THEN creation should fail with an invalid request error.
- GIVEN a new purchase order WHEN customer name already exists in the database THEN creation should fail with a duplicate error.
- GIVEN a new purchase order line item WHEN quantity or price are null or less than or equal to 0 THEN creation should fail with invalid request error.
- GIVEN a new purchase order line item WHEN the product sku or name are null THEN creation should fail with an invalid request error.
- GIVEN a new purchase order line item WHEN product sku already exists in the database THEN creation should fail with a duplicate error.
- GIVEN a new purchase order WHEN line items are 0 or more than 1000 THEN creation fail with invalid request.

## Purchase Order Total Calculate

### Purchase Order Calculator

#### Line Item Total Equation
`line item sub-total = quantity * price`

Preserve up to 4 decimals on line item sub-total - DO NOT apply rounding.

Minimum Unit Tests:
- include unit tests to validate the line item total equation produces the expected results.

#### Grand Total Equation
`grand total = sum of all line item totals`

Result is rounded to 2 decimal places on grand total ONLY using Banker's rounding.

Minimum Unit Tests:
- include unit tests to validate the grand total equation produces the expected results.
- include unit tests to validate calculator against common rounding errors.

## Purchase Order Edit (Modification)

Editing a purchase order refers to modifying the purchase order and can include:
- currency
- notes
- adding / removing line items

The following may never be edited on an existing purchase order:
- reference
- customer

Rules:
- a purchase order can only be edited when it has a status of "Pending".
- once a purchase order exits the "Pending" status it is considered immutable except for further status changes.

Minimum Unit Tests:
- GIVEN an existing purchase order WHEN line items are not changed THEN no changes are written to line items in the database.
- GIVEN an existing purchase order WHEN new line items are added THEN new line items are associated with the purchase order.
- GIVEN an existing purchase order WHEN existing line items are removed THEN the persisted line items are soft-deleted ONLY.
- GIVEN an existing purchase order WHEN status is "Pending" THEN edit is permitted.
- GIVEN an existing purchase order WHEN status is NOT "Pending" THEN edit is blocked completely.

## Purchase Order Status Update

Updates are limited to purchase order statuses. Changes to purchase order status must be persisted additively so that a full history is audited.

Updating a purchase order affects ONLY:
- status

The "Fulfilled" and "Cancelled" statuses are considered terminal, and no further changes of any kind may be made to a purchase order once a terminal status is reached.

Rules for Status Changes:
- during creation status is defaulted to "Pending".
- once created status transitions must adhere to the following transitions:
    - "Pending" > "Confirmed" | "Cancelled"
    - "Confirmed" > "Fulfilled" | "Cancelled"
    - "Fulfilled" > terminal
    - "Cancelled" > terminal

Demo Features:
- When Demo Mode = false a dropdown used to update a purchase order status should include only valid status options and a terminal status should display as a pill only and no longer as a dropdown.
- When Demo Mode = true a dropdown used to update a purchase order status should include all statuses and include an info icon that displays a tooltip on hover with the following note "To improve a user's experience, statuses are proactively removed from status dropdowns until only valid options remain. This helps users learn and understand how the system works. However, all options have been included during demo mode to demonstrate that the backend does not rely on client-side exclusions to enforce state integrity."

Server-side rules:
- the backend is responsible for validating all state transitions - implement a simple State Pattern using the Gang of Four behavioural Object-Orientated Design Pattern:
    - create a state class per status abstracted against an `IPurchaseOrderState` interface.
    - create a `PurchaseOrderStatusContext` class to encapsulate status mapping for a given purchase order and handle transition rules and guards.
- the `PurchaseOrderStatusContext` MUST BE USED whenever a purchase order status is created, edited, or updated.
- invalid transitions should retain the existing status unchanged, and should return a descriptive error display to the user.

Minimum Unit Tests:
- coverage for all state transitions as listed under Rules for Status Changes.

## Purchase Order Delete

A purchase order may be SOFT-DELETED when it has a status of "Pending" ONLY.

Display a confirmation modal to the user to explain that the action is non-reversible, with the option to cancel or confirm.

Cascade behavriour:
- deleting a purchase order should also delete associated line items.
- cascade EXCLDUES customers.
- cascade EXCLDUES products.

Minimum Unit Tests:
- GIVEN an existing purchase order WHEN IsDeleted = false and status is "Pending" THEN delete is permitted as soft-delete ONLY.
- GIVEN an existing purchase order WHEN IsDeleted = false and status is NOT "Pending" THEN delete is BLOCKED completely.
- GIVEN an existing purchase order WHEN IsDeleted = true THEN the purchase order is NOT included in query results.