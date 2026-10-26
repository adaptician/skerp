---
title: Package Policy
tier: 2
enforced-by: [review, prose-only]
applies-when: >
  Adding, updating, or removing a package dependency.
disposition: >
  mechanise — a lint/CI rule blocking disallowed packages by name is a strong, low-effort candidate.
last-reviewed: 2026-08-17
---
## Package Policy

Preferred:
- FluentValidation
- Dapper
- MediatR
- MassTransit

Avoid:
- service locators
- static mutable state