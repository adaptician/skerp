# Initial Planning Prompt - create backlog and generate prompt for design system

The current solution folder contains only requirements and instruction files from the scaffold. An overview of the deliverable is provided here .agents\specs\deliverables\erp-web-app\README.md​ . The solution must be setup accordingly and recorded against Epic AB#1428.

The solution must allow users to manage purchase orders. I have listed a detailed requirements brief under .agents\specs\epics\purchase-order-management\brief.md​ and included guidelines for the web API (.agents\specs\epics\purchase-order-management\api.md​) and persisted entities (.agents\specs\epics\purchase-order-management\entities.md​). This must be planned and recorded under Epic AB#1429.

Review the requirements provided and use /plan-epic to divide the work up into features using the following outline:

Under Epic AB#1428

- Feature Development preparation
    - Spike: solution setup - includes backend foundation, client foundation, and onboarding README
    - Design: Design system and core screens
- Feature Client Shell and Landing
    - User Story: App shell, landing, and navigation header - includes shell, navigation header, demo mode toggle, and welcome landing screen.

Under Epic AB#1429

- Feature: Purchase Order CRUD
    - User Story: Create Purchase Order - includes List screen shell, create modal, endpoints for create and calculate, PurchaseOrderCalculator, persistence, and unit tests.
    - User Story: List Purchase Order - includes List screen paginated grid with search and filter options, list items lazy loaded per purchase order, endpoints, validations, and unit tests.
    - User Story: Edit Purchase Order - includes Edit modal, endpoint, validations, persistence, and unit tests.
    - User Story: Delete Purchase Order - include confirmation modal, endpoint, validation, and unit tests.
- Feature: Purchase Order State Machine
    - User Story: Update Purchase Order Status - includes editable status dropdown in list grid and trigger on change, endpoint, PurchaseOrderStatusContext and status classes, transition rules, persistence, and unit tests.

Before development can begin a design will be created in Figma. Based on the requirements generate a prompt to provide to the Designer agent to create a well-structured, cohesive, and easy to use design system.

The designs must include as a minimum the following:

Common components:
- searchable multi-select dropdown e.g. customer filter
- single-select dropdown e.g. status
- pill e.g. reference number or status
- actions dropdown button - delete actions should be styled with a danger theme
- confirmation modal
- popup error message
- card with heading and injectable body content
- navigation header with menu items
- logo emblem and wordmark

Screens:

- purchase order list screen
- creation modal
- edit modal
- welcome landing screen

A warm and calming colour palette should be used, with web-friendly fonts.

Designs must be included for both desktop and mobile views. The solution must be responsive and mobile-friendly throughout.

Capture the prompt for the designer in the description of the Design work item created under epic AB#1428.