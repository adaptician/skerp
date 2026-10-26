# Purchase Orders API

The backend is the source of truth for data state, integrity, and business rules.

Enhancements on the client-side server to improve user experience, and are NEVER sufficient to enforce persistence, data integrity, business rules, or security.

URL prefix: `/api/v1/`

## Normalization Rules
1. Codes (reference, SKU)

Capture as identifiers with a strict canonical form.

Steps, in order: trim, uppercase (invariant culture), validate. NEVER strip silently.
- Allowed characters: `A–Z 0–9 - _ . /.` Whitespace inside the value is an error.

Valid:
`ABC123`
`PO-2026-001`
Invalid:
`PO 2026 001`

Validate length AFTER normalization: 
- 5–128 for reference
- 3–64 for sku.

Create one `ReferenceNormalizer` and `SkuNormalizer` in Domain. The lookup endpoint, create, edit and search all call it.

The UI never re-implements the rule. It sends the raw value to the lookup endpoint.

Responses return the normalized value, so users see what was stored.

2. Names (customer, product). 

Steps, in order: Trim, collapse runs of whitespace to one space, and keep the casing as per user input.

Uniqueness is case-insensitive. Use EF Core `UseCollation("NOCASE")` on the Name and Sku columns combined with a filtered unique index (WHERE IsDeleted = 0).

Minimum Unit Tests:
- include unit tests for normalization rules 1 and 2
    - include length checks
    - include valid and invalid characters checks
    - include case-sensitivity checks

## Result Pattern

Use accurate HTTP status codes and apply a Result Pattern for API responses.

Errors should fail gracefully and provide useful feedback to users.
Unexpected errors or exceptions should be logged and return a generic failure response to users.
EXCLUDE / REDACT sensitive backend data in error messages.

Example:
```json
{
    "isSuccess": true,
    "isFailure": false,
    "error": {
        "code": "PurchaseOrder.DuplicateReferenceNumber",
        "description": "The provided reference number already exists.",
    },
    "value": null,
}
```

Example domain errors:
```csharp
public record Error(string Code, string Description)
{
    public static readonly Error None = new(string.Empty, string.Empty);
}

public static class PurchaseOrderErrors
{
    public static readonly Error NotFound = new("PurchaseOrder.NotFound", "The requested purchase order was not found.");
    public static readonly Error DuplicateReferenceNumber = new("PurchaseOrder.DuplicateReferenceNumber", "The provided reference number already exists.");
}

public static class CustomerErrors
{
    public static readonly Error DuplicateName = new("Customer.DuplicateName", "The provided customer name already exists.");
    public static readonly Error InvalidEmail = new("Customer.InvalidEmail", "The provided email format is invalid.");
}
```

## Retrieval endpoints

### List (POST)

Request:
| Property | Data Type | Constraints |
|--|--|--|
| search | string (optional) max: 128 | reference |
| statusId | short (optional) | status enum |
| customerIds | guid[] (optional) | list of customer ids; maximum 10 ids |
| createdMin | date (optional) | minimum for date range filter |
| createdMax | date (optional) | maximum for date range filter |
| sorting | string (optional) max: 128 | sorting field name followed by 'asc' for ascending or 'desc' for descending - default 'createdAt desc' |
| skipCount | int (required) min: 0 max: int.MaxValue | number of items to skip |
| maxResultCount | int min: 1 max: 100 | number of items returned per paged result; default: 10 |

- validate Guid format from request when given as request parameters.

### One by `Id` (GET)

Request:
| Property | Data Type | Constraints |
|--|--|--|
| id | guid | purchase order id |
| skipCount | int (required) min: 0 max: int.MaxValue | number of line items to skip |
| maxResultCount | int min: 1 max: 100 | number of items returned per paged result; default: 20 |

- validate Guid format from request when given as request parameters.
- use `skipCount` and `maxResultCount` to lazy load line items

### Response
Example:
```json
{
    "data": [
        {
            "id": "<purchase-order-guid>",
            "reference": "ABC123",
            "createdAt": "2026-10-21 11:00:00.000Z",
            "customer": 
            {
                "id": "<customer-guid>",
                "name": "Alpha Studios",
            },
            "currency": 
            {
                "id": 1,
                "name": "ZAR",
            },
            "status": 
            {
                "id": 20,
                "name": "Confirmed",
            },
            "lineItems": 
            [
                    {
                    "id": "<purchase-order-item-guid>",
                    "sku": "SDA001",
                    "name": "Delicious Soda",
                    "quantity": 5,
                    "price": 9.99,
                    "total": 49.95,
                    },
                    {
                    "id": "<purchase-order-item-guid>",
                    "sku": "CAN001",
                    "name": "Delicious Candy",
                    "quantity": 3,
                    "price": 12.99,
                    "total": 38.97,
                    },
            ],
            "total": 88.92,
        }
    ],
    "totalCount": 100
}
```

- only one status is applicable

## Create endpoint (POST)

### Request

| Property | Data Type | Constraints |
|--|--|--|
| reference | string (required) max: 128 | external reference number |
| customer.id | guid (optional) | provided if an existing customer is selected |
| customer.name | string (optional) max: 128 | name for a new customer ONLY |
| customer.email | string (optional) max: 128 | valid email for a new customer ONLY |
| currencyId | short (required) | enum value for selected currency |
| statusId | short (required) | enum value for selected status |
| lineItem.product.id | guid (optional) | provided if an existing product is selected |
| lineItem.product.sku | string (optional) max: 64 | sku for a new product ONLY |
| lineItem.product.name | string (optional) max: 128 | name for a new product ONLY |
| lineItem.quantity | int (required) | quantity for the line item |
| lineItem.price | decimal (required) | unit price for the line item |
| notes | string (optional) max: 512 | notes for the purchase order |

Example:
```json
{
   "reference": "ABC123",
   "customer": 
   {
       "id": "<customer-guid>",
       "name": "Alpha Studios",
       "email": "alpha@studios.com",
   },
   "currencyId": 1,
   "statusId": 20,
   "lineItems": 
   [
        {
          "product":
          {
            "id": "<product-guid>",
            "sku": "SDA001",
            "name": "Delicious Soda",
          },
          "quantity": 5,
          "price": 9.99,
        },
        {
          "product":
          {
            "id": "<product-guid>",
            "sku": "CAN001",
            "name": "Delicious Candy",
          },
          "quantity": 3,
          "price": 12.99,
        },
   ],
   "notes": null
}
```

- reference must be normalized using rule 1.
- when an existing customer is selected (id is populated) DO NOT overwrite the customer name and email.
- customer name must be normalized using rule 2.
- customer email address must be validated.
- if a customer id and customer name and email address are all present fail with a bad request error - should be id, or name and email, not all 3.
- product sku must be normalized using rule 1.
- product name must be normalized using rule 2. 
- if product id and product sku and name are all present fail with a bad request error - should be id, or sku and name, not all 3.
- line item quantity and price must be greater than 0 (positive).
- totals are NEVER received on the request, and must be calculated during creation.

# Calculate endpoint (GET)

Expose an endpoint that allows purchase order totals to be calculated by the backend and returned to the client-side for display.

## Request
| Property | Data Type | Constraints |
|--|--|--|
| lineItem.id | string (required) | line item identifier used to map results back to client view - use a generated temp id for new line items or Guid for existing |
| lineItem.quantity | int (required) | quantity for the line item |
| lineItem.price | decimal (required) | unit price for the line item |

Example:
```json
{
   "lineItems": 
   [
        {
          "id": "<temp-id OR guid>",
          "quantity": 5,
          "price": 9.99,
        },
        {
          "id": "<temp-id OR guid>",
          "quantity": 3,
          "price": 12.99,
        },
   ]
}
```

## Result

Example:
```json
{
   "lineItems": 
   [
        {
          "id": "<temp-id OR guid>",
          "total": 49.95,
        },
        {
          "id": "<temp-id OR guid>",
          "total": 38.97,
        },
   ],
   "total": 88.92,
}
```

# Edit endpoint (PUT)

| Property | Data Type | Constraints |
|--|--|--|
| id | guid (required) | id for the existing purchase order |
| currencyId | short (required) | enum value for selected currency |
| lineItem.id | guid | id for the existing line items |
| lineItem.product.id | guid (optional) | provided if an existing product is selected |
| lineItem.product.sku | string (optional) max: 64 | sku for a new product ONLY |
| lineItem.product.name | string (optional) max: 128 | name for a new product ONLY |
| lineItem.quantity | int (required) | quantity for the line item |
| lineItem.price | decimal (required) | unit price for the line item |
| notes | string (optional) max: 512 | notes for the purchase order |

Example:
```json
{
   "currencyId": 1,
   "lineItems": 
   [
        {
          "product":
          {
            "id": "<product-guid>",
            "sku": "SDA001",
            "name": "Delicious Soda",
          },
          "quantity": 5,
          "price": 9.99,
        },
        {
          "product":
          {
            "id": "<product-guid>",
            "sku": "CAN001",
            "name": "Delicious Candy",
          },
          "quantity": 3,
          "price": 12.99,
        },
   ],
   "notes": null
}
```

- compare the line items against the persisted line items:
    - apply changes to existing line items that remain present in the request.
    - new line items in the request are created.
    - existing line items absent from the request are soft-deleted.
- if line items have changed, re-calculate totals.

# Update Status endpoint (PUT)

| Property | Data Type | Constraints |
|--|--|--|
| id | guid (required) | id for the existing purchase order |
| statusId | short (required) | enum value for selected status |

# Delete endpoint (DELETE)

| Property | Data Type | Constraints |
|--|--|--|
| id | guid (required) | id for the existing purchase order |

# Customer API

## Customer Lookup (GET)

| Property | Data Type | Constraints |
|--|--|--|
| name | string (required) max: 128 | name for a new customer |

Response:
```json
{
    "data": [
        {
            "id": "<customer-guid>",
            "name": "Alpha Studios",
        }
    ]
}
```

# Product API

## Product Lookup (GET)

| Property | Data Type | Constraints |
|--|--|--|
| sku | string (required) max: 64 | sku for a new product |

Response:
```json
{
    "data": [
        {
            "id": "<product-guid>",
            "sku": "CAN001",
            "name": "Delicious Candy",
        }
    ]
}
```