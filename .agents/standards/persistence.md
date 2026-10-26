---
title: Persistence Rules
tier: 1
enforced-by: [review, prose-only]
applies-when: >
  Writing or changing persistence code, schema, or migrations.
disposition: >
  mechanise — the migration-tooling-only rule and update-path field scoping are strong CI/analyzer
  candidates once a concrete ORM and database are chosen.
last-reviewed: 2026-10-14
---
## Persistence Rules

- All schema changes require migrations.
- Soft deletes must use global query filters.
- New entities support soft deletion unless their spec explicitly calls for hard deletion. See *Entity Base Classes
  and Auditing* → *Soft deletion is the default*.
- All timestamps use UTC.

---

## Reuse Existing Schema Before Adding New

Before adding a new table, column, or lookup set, check whether an existing one already models this
concept, or could be lightly extended to. A near-duplicate `Addresses` table added because nobody
checked that one already exists for a different entity is the schema-level version of rebuilding a
UI component three different ways — and considerably more expensive to unwind once data has landed
in both. This is the data-modelling instance of a rule that applies to every layer and every work
item — see `.agents/standards/agent-workflow.md` → *Reuse, Duplication, and When to Refactor* for
the full mindset, the benefit/risk framework, and why this is never the agent's call to make alone.
Weigh a shared table's coupling cost against the duplication it avoids the same way; when genuinely
unsure whether two concepts are the same one, ask rather than guessing either way.

---

## Write Only What Changed

When persisting a mutation, only the fields that the operation is designed to change must be written. Overwriting fields that were not part of the operation is unnecessary at best and destructive under concurrent writes at worst.

**With EF Core change tracking (tracked entities):** Update only the specific properties that have changed. Do not call `dbContext.Update(entity)` on a fully re-populated entity — this marks every property as modified and overwrites all columns, including those the operation had no business touching.

```csharp
// Correct — load the tracked entity, set only the properties this operation owns
var invoice = await dbContext.Invoices.FindAsync(id, cancellationToken);
invoice.Status = InvoiceStatus.Submitted;
invoice.SubmittedAt = _clock.UtcNow;
// EF Core tracks only these two changes; all other columns are untouched

// Incorrect — re-attaches a fully populated entity, marks every column as modified
dbContext.Update(mappedEntity);
```

**With detached or no-tracking scenarios:** Explicitly set only the modified properties rather than attaching or replacing the full entity. Prefer loading the tracked entity from the store and applying changes over constructing a detached replacement.

**System-owned fields are never overwritten by a mutation:** Fields such as `CreatedAt`, `CreatedBy`, and generated identifiers must be excluded from all update paths regardless of what the incoming payload contains. The persistence layer is the last line of defence — if a field should never be overwritten, the entity configuration or the update logic must enforce this unconditionally, not rely on the API layer having already filtered it out.

---

## Entity Configuration

Every entity that is persisted through EF Core must have a corresponding `IEntityTypeConfiguration<T>` class, located in `Infrastructure/Persistence/EntityConfigurations/`. This class is the single authoritative source for the entity's schema shape — table name, schema, column constraints, relationships, and indexes. Migrations are the output of this configuration; they are not an independent source of schema truth. A developer should never need to open a migration file or inspect the database to determine what constraints apply to an entity.

EF Core's convention-based defaults must not be relied upon for anything that matters. Conventions are implicit and invisible; explicit configuration is discoverable, reviewable, and enforceable in code review. Every configuration class must declare the following in full:

### Schema Constants

Database schema names are used across many entity configuration classes. Defining them as string literals in each configuration class produces the same schema name in multiple places with no single authoritative source — a textbook magic string problem. Define all schema names once as constants in a `DataSchemas` static class, located in `Infrastructure/Persistence/`:

```csharp
// Infrastructure/Persistence/DataSchemas.cs
internal static class DataSchemas
{
    public const string Application = "app";
    public const string Finances    = "fin";
    public const string Identity    = "id";
}
```

All `builder.ToTable()` and `builder.ToView()` calls use these constants for the schema argument. A developer can open this file to see every schema boundary in the solution at a glance, and renaming a schema requires changing a single constant rather than hunting through configuration files.

**Table names are a permitted exception to the magic string rule.** The table name string in `builder.ToTable()` is a declaration of a database identifier — it is not a lookup key, it does not appear in multiple places, and the risk that motivates the magic string rule (invisible dependencies, silent renaming hazards) does not apply in the same way. Using `nameof()` for a table name requires a transformation to snake_case and pluralisation that cannot be done in a constant expression, making it more complex without meaningful benefit. Table name strings in `builder.ToTable()` are permitted as written.

**Table naming convention.** Table names use lowercase snake_case and are pluralised: `invoices`, `subscription_plans`, `audit_entries`. EF Core's `UseSnakeCaseNamingConventions()` extension (available via the `EFCore.NamingConventions` package) can apply the case transformation globally, reducing per-configuration boilerplate. Pluralisation is not handled by that package and must either be applied via a custom convention in `OnModelCreating` or written explicitly in each `ToTable()` call. Whichever approach is chosen for a project, it must be consistent — do not mix global convention with per-entity overrides without a documented reason.

**Table name and schema** — always explicit. Default table names derived from `DbSet<T>` property names or class names are fragile under refactoring and do not communicate schema organisation intent.

**Primary key** — declared via `HasKey()` even when EF Core would infer it. For strongly-typed identifier types, include the value converter inline.

**All persisted properties** — each property declared with its column name, nullability, and any length or precision constraint. Column names follow the snake_case convention for the target database. A property not explicitly declared is subject to EF Core's conventions, which vary between versions and can silently change on upgrade.

**Required vs optional** — every property marked `.IsRequired()` or left implicitly optional. Where a property is nullable in C# but required in the database, the distinction must be visible in the configuration, not left to convention.

### Adding a Required Column to an Existing Table

A column marked `.IsRequired()` that is added to a table already holding rows must specify a
`.HasDefaultValue()` (or `.HasDefaultValueSql()`) the database can apply to those existing rows, or the
migration must backfill the column in a prior step before tightening the constraint. A migration that adds
a `NOT NULL` column with no default and no backfill either fails outright against a populated table, or
silently forces every existing row through an implicit zero-value default that was never a deliberate
decision — both are worse than the explicit alternative.

The two supported shapes:

- **A meaningful default exists** (e.g. a new `Status` column where every existing invoice was implicitly
  `Draft`): declare `.HasDefaultValue(InvoiceStatus.Draft)` in the entity configuration, so the default is
  visible in code, not buried in the migration.
- **No single default is correct** (e.g. a new required `OwnerId` that varies per row): add the column as
  nullable, write and run a data migration that backfills every existing row from its own history or
  context, then a second migration that tightens the column to `NOT NULL`. Do not guess a placeholder
  value to satisfy the constraint — a placeholder that is wrong is harder to find later than an explicit
  two-step migration now.

Only mark a column required where the domain genuinely cannot tolerate the field being absent. A column
left nullable "to be safe," when the domain actually requires it, lets invalid data accumulate silently —
that is a data-integrity gap, not caution. A column added "in case it's needed" is the opposite failure —
start it optional and tighten later if the need becomes real.

**Foreign key relationships** — declared via `HasOne` / `HasMany` with `.WithMany` / `.WithOne`, `.HasForeignKey()`, and `.OnDelete()`. Delete behaviour must always be stated explicitly — never rely on the default, which differs by relationship type and can produce unexpected cascade behaviour.

A complete configuration class covering these requirements:

```csharp
internal sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("invoices", schema: DataSchemas.Finances);

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Id)
            .HasColumnName("id")
            .HasConversion(id => id.Value, value => new InvoiceId(value));

        builder.Property(i => i.CustomerId)
            .HasColumnName("customer_id")
            .IsRequired()
            .HasConversion(id => id.Value, value => new CustomerId(value));

        builder.Property(i => i.Reference)
            .HasColumnName("reference")
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(i => i.Status)
            .HasColumnName("status")
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.TotalAmount)
            .HasColumnName("total_amount")
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(i => i.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(i => i.IsDeleted)
            .HasColumnName("is_deleted")
            .IsRequired();

        builder.HasOne(i => i.Customer)
            .WithMany(c => c.Invoices)
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.Reference)
            .IsUnique()
            .HasDatabaseName("ix_invoices_reference");

        builder.HasIndex(i => i.CustomerId)
            .HasDatabaseName("ix_invoices_customer_id");

        builder.HasQueryFilter(i => !i.IsDeleted);
    }
}
```

---

## Indexes and Uniqueness Constraints

Indexes and uniqueness constraints are declared in the entity's `IEntityTypeConfiguration<T>` class via `HasIndex()`. They must never be added only as raw SQL in a migration — defining them in the configuration class makes them visible alongside the rest of the schema shape, and allows EF Core to detect and track them across migrations.

**Foreign key columns** must always have an index. EF Core automatically creates indexes for foreign keys declared via the Fluent API in most cases, but this should be verified and declared explicitly to make the intent clear. An implicit index that disappears on a convention change is not a safe design.

**Uniqueness constraints** are declared by chaining `.IsUnique()` on the index definition. A unique constraint is a business rule expressed in the schema — it must be visible in the configuration class, not buried in a migration.

**Composite indexes** are defined by passing multiple properties to `HasIndex()`. Declare them in the order that reflects the intended query pattern — the leading column is the most selective filter in the most common query.

```csharp
// Single-column unique constraint
builder.HasIndex(i => i.Reference)
    .IsUnique()
    .HasDatabaseName("ix_invoices_reference");

// Composite index for a known query pattern
builder.HasIndex(i => new { i.CustomerId, i.Status })
    .HasDatabaseName("ix_invoices_customer_id_status");

// Foreign key index — explicit even when EF Core would add it implicitly
builder.HasIndex(i => i.CustomerId)
    .HasDatabaseName("ix_invoices_customer_id");
```

**Naming** — all indexes must be named explicitly via `.HasDatabaseName()`. EF Core's generated index names are not readable and vary between versions. A named index is identifiable in a migration, in the database, and in error messages. Use the convention `ix_{table}_{column(s)}`.

---

## Query Filters

Global query filters are declared in the entity's `IEntityTypeConfiguration<T>` class via `HasQueryFilter()`. The primary use case is soft deletes — every entity that supports soft deletion must have a filter that excludes deleted records from all queries by default.

EF Core applies only one global query filter per entity type. If multiple filter conditions are required — for example, soft deletion combined with tenant isolation — they must be combined into a single expression rather than chained as separate `HasQueryFilter()` calls. Chaining silently replaces the previous filter; the first condition is discarded without any warning.

```csharp
// Correct — combined into a single expression
builder.HasQueryFilter(i => !i.IsDeleted && i.TenantId == _tenantId);

// Incorrect — the first filter is silently replaced by the second
builder.HasQueryFilter(i => !i.IsDeleted);
builder.HasQueryFilter(i => i.TenantId == _tenantId);
```

When a query must bypass the filter — for example, an admin query that must see deleted records, or a background job that operates across tenants — use `.IgnoreQueryFilters()` explicitly at the call site. This makes the bypass visible and intentional rather than implicit.

```csharp
// Explicitly bypassing the global query filter — visible and reviewable
var deletedInvoices = await dbContext.Invoices
    .IgnoreQueryFilters()
    .Where(i => i.IsDeleted)
    .ToListAsync(cancellationToken);
```

When `.IgnoreQueryFilters()` is used in a repository method, the method name must signal this — a caller should not have to read the implementation to discover that deleted records may be returned.

```csharp
// Name reflects that filters are bypassed
Task<Invoice?> FindIncludingDeletedAsync(InvoiceId id, CancellationToken cancellationToken);
```

---

## Views and Stored Procedures

SQL views and stored procedures are first-class schema objects. They must be managed under source control in the same way as tables — with a visible current definition, a tracked history of changes, and early conflict detection when two developers modify the same object concurrently.

### Source Files

Each view and stored procedure is maintained as a set of versioned `.sql` files, one per migration that affects the object. File names embed the migration timestamp so that versions sort chronologically in the directory listing and carry no ambiguous semantic numbering.

An additional un-versioned file — named after the object with no timestamp — is always kept in sync with the latest version. This file is not referenced by any migration; it exists solely so that a developer can read the current definition of a view or procedure without locating the highest-numbered version file.

```
Infrastructure/
└── Persistence/
    ├── Views/
    │   ├── active_subscriptions.sql                 ← current state; mirrors the latest versioned file
    │   ├── active_subscriptions_20240315120000.sql  ← initial version
    │   └── active_subscriptions_20240820093000.sql  ← version introduced by a later migration
    └── StoredProcedures/
        ├── recalculate_invoice_totals.sql
        └── recalculate_invoice_totals_20240315120000.sql
```

All `.sql` files — both versioned and the current-state alias — are embedded as assembly resources in the Infrastructure project (`Build Action: Embedded Resource`). Migrations read them at execution time via the assembly manifest rather than via file system paths, which are unreliable across environments and CI runners.

```csharp
// Helper method — place on a migration base class or a static helper accessible to all migrations
private static string GetSql(string resourceName)
{
    var assembly = typeof(ApplicationDbContext).Assembly;
    using var stream = assembly.GetManifestResourceStream(resourceName)
        ?? throw new InvalidOperationException($"Embedded resource not found: {resourceName}");
    using var reader = new StreamReader(stream);
    return reader.ReadToEnd();
}
```

### Workflow When Modifying a View or Stored Procedure

1. Copy the current definition into a new versioned file named with the current timestamp (e.g. `active_subscriptions_20240820093000.sql`).
2. Edit that new versioned file to make the required changes.
3. Update the un-versioned current-state file (`active_subscriptions.sql`) to match.
4. Generate the EF Core migration. Write the `Up` and `Down` methods as described below.
5. Commit the new versioned file, the updated current-state file, and the migration together.

The timestamp in the versioned filename must match — or be close to — the migration timestamp so that the file and the migration that introduced it are traceable to each other.

### Migrations for Views

Views are always dropped and recreated — never altered in place. `ALTER VIEW` does not guarantee the definition matches expectations across databases in divergent state. Drop-and-recreate is deterministic.

The `Up` method drops whatever version currently exists and creates the new version. The `Down` method drops the new version and restores the previous version, so that rolling back the migration leaves the view in the state expected by the code on that branch. A `Down` that simply drops the view is insufficient — it leaves any dependent code broken until the migration is re-applied.

```csharp
// Migration: 20240820093000_UpdateActiveSubscriptionsView
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql("DROP VIEW IF EXISTS payments.active_subscriptions;");
    migrationBuilder.Sql(
        GetSql("Grimoire.Infrastructure.Persistence.Views.active_subscriptions_20240820093000.sql"));
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql("DROP VIEW IF EXISTS payments.active_subscriptions;");
    migrationBuilder.Sql(
        GetSql("Grimoire.Infrastructure.Persistence.Views.active_subscriptions_20240315120000.sql"));
}
```

For the initial migration that creates a view for the first time, there is no previous version to restore. The `Down` method drops only:

```csharp
// Migration: 20240315120000_AddActiveSubscriptionsView
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql(
        GetSql("Grimoire.Infrastructure.Persistence.Views.active_subscriptions_20240315120000.sql"));
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql("DROP VIEW IF EXISTS payments.active_subscriptions;");
}
```

**Branch isolation note.** The `Down` method references a versioned resource that must exist in the compiled assembly at rollback time. The expected workflow is: roll back the migration while still on the branch that introduced it, then switch branches. The assembly built from that branch contains all the versioned files the migration references. Attempting to run `Down` from an assembly built from a different branch — one that does not contain the referenced versioned file — will throw at the `GetManifestResourceStream` call.

### Mapping Views to Queryable Types

Views are mapped as keyless entity types. The keyless type and its configuration follow the same conventions as regular entities, with the distinction that no primary key is declared and the type is marked as having no key.

```csharp
// Keyless type — lives in Infrastructure alongside its configuration
internal sealed class ActiveSubscriptionView
{
    public CustomerId CustomerId { get; init; }
    public string SubscriptionReference { get; init; } = string.Empty;
    public DateTimeOffset ActiveSince { get; init; }
}

// Configuration
internal sealed class ActiveSubscriptionViewConfiguration
    : IEntityTypeConfiguration<ActiveSubscriptionView>
{
    public void Configure(EntityTypeBuilder<ActiveSubscriptionView> builder)
    {
        builder.ToView("active_subscriptions", schema: DataSchemas.Finances);

        builder.HasNoKey();

        builder.Property(v => v.CustomerId)
            .HasColumnName("customer_id")
            .HasConversion(id => id.Value, value => new CustomerId(value));

        builder.Property(v => v.SubscriptionReference)
            .HasColumnName("subscription_reference");

        builder.Property(v => v.ActiveSince)
            .HasColumnName("active_since");
    }
}
```

Keyless types are queried via a `DbSet<T>` registered on the `DbContext`. They are read-only by design — EF Core will not track changes or generate insert/update/delete SQL for them.

### Migrations for Stored Procedures

Stored procedures follow the same pattern as views: versioned source files, drop-and-recreate in both `Up` and `Down`, with the previous version restored on rollback.

```csharp
// Migration: 20240820093000_UpdateRecalculateInvoiceTotals
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql("DROP PROCEDURE IF EXISTS payments.recalculate_invoice_totals;");
    migrationBuilder.Sql(
        GetSql("Grimoire.Infrastructure.Persistence.StoredProcedures.recalculate_invoice_totals_20240820093000.sql"));
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql("DROP PROCEDURE IF EXISTS payments.recalculate_invoice_totals;");
    migrationBuilder.Sql(
        GetSql("Grimoire.Infrastructure.Persistence.StoredProcedures.recalculate_invoice_totals_20240315120000.sql"));
}
```

### Calling Stored Procedures

Stored procedures are called from repository implementations, not from application services or command handlers. Repository methods that call a stored procedure must be named after the operation they perform — the fact that a stored procedure is involved is an implementation detail.

```csharp
// Repository interface — no mention of stored procedures
Task RecalculateInvoiceTotalsAsync(InvoiceId invoiceId, CancellationToken cancellationToken);

// Repository implementation
public async Task RecalculateInvoiceTotalsAsync(InvoiceId invoiceId, CancellationToken cancellationToken)
{
    await _dbContext.Database.ExecuteSqlRawAsync(
        "CALL payments.recalculate_invoice_totals({0})",
        invoiceId.Value,
        cancellationToken);
}
```

### When to Use Each

**Views** are appropriate for read projections that join or aggregate across multiple tables and are used in more than one query context. A view that is queried in only one place is likely better expressed as a LINQ query with a projection. The overhead of a view is justified when the definition is complex, when it is shared across multiple consumers, or when a database-level index on the view is needed for performance.

**Stored procedures** are appropriate for bulk operations — mass updates, batch processing, or multi-step transactional operations — where the round-trip cost of materialising data through EF Core is prohibitive. They are not appropriate as a general substitute for repository methods, and should not be used to implement business logic that belongs in the domain model. If a stored procedure is needed to enforce a business rule, that is a signal the rule is not correctly placed.

---

## Seeding

Seeding is the mechanism for establishing known, prerequisite data in the database — data the application requires to function, data that accelerates development by removing manual setup steps, and data that makes it possible to reproduce a working state on a fresh checkout or after switching branches. Done well, seeding is invisible: it runs on startup, verifies the database is in the expected state, and exits without disturbing anything that already exists. Done poorly, it overwrites user modifications, inserts duplicates, and introduces environment-specific surprises.

### Categories of Seed Data

Three categories of seed data exist, each with distinct semantics for when records are written and whether existing records are updated.

**Reference data** — data the application cannot function without: roles, permissions, status codes, system-level configuration keys. Reference data is owned by the application; the seed configuration is authoritative. When the seed configuration changes, the corresponding records in the database are updated to match. Reference data is seeded in all environments.

**Default configuration** — initial values for settings that users or operators may legitimately override after deployment: notification templates, threshold values, system preferences. Default configuration is seeded once on first run only. Once a record exists it is left entirely untouched, because any subsequent modification to it is intentional. Default configuration is seeded in all environments.

**Development fixtures** — sample accounts, test records, and example data that make a fresh checkout immediately usable without manual setup. Development fixtures are only seeded in the development environment and can be independently disabled or reset via configuration.

### Configuration

Seed *values* — names, descriptions, emails, and other domain data — are driven from configuration. This makes defaults immediately visible and editable without touching code, and allows per-environment values through the standard `appsettings.{Environment}.json` override mechanism.

Seed record *identifiers* are not configurable. They are defined as named constants in code (see "Stable Identifiers" below). A configurable identifier could be accidentally changed, permanently breaking the seeder's ability to recognise existing records.

A top-level `Enabled` flag controls whether seeding runs at all for a given environment. Setting it to `false` disables all seeding without code changes.

```json
// appsettings.Development.json
{
  "Seeding": {
    "Enabled": true,
    "Fixtures": {
      "Reset": false
    },
    "Roles": [
      { "Name": "Administrator", "Description": "Full system access" },
      { "Name": "Operator",      "Description": "Operational access"  }
    ],
    "DefaultAdminUser": {
      "Email":      "admin@dev.local",
      "GivenName":  "System",
      "FamilyName": "Administrator"
    }
  }
}
```

```json
// appsettings.Production.json
{
  "Seeding": {
    "Enabled": true,
    "Roles": [
      { "Name": "Administrator", "Description": "Full system access" },
      { "Name": "Operator",      "Description": "Operational access"  }
    ],
    "DefaultAdminUser": {
      "Email":      "admin@company.com",
      "GivenName":  "System",
      "FamilyName": "Administrator"
    }
  }
}
```

Seed configuration binds to typed settings classes following the same Options pattern used throughout the project:

```csharp
internal sealed class SeedingSettings
{
    public const string SectionName = "Seeding";

    public bool Enabled { get; set; }

    public FixtureSeedSettings Fixtures { get; set; } = new();

    public IReadOnlyList<RoleSeedSettings> Roles { get; set; } = [];

    public AdminUserSeedSettings DefaultAdminUser { get; set; } = new();
}

internal sealed class FixtureSeedSettings
{
    /// <summary>
    /// When true, existing fixture records are deleted and recreated on each seeder run.
    /// Only applies in Development. Never set this in staging or production configuration.
    /// </summary>
    public bool Reset { get; set; }
}

internal sealed class RoleSeedSettings
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

internal sealed class AdminUserSeedSettings
{
    public string Email { get; set; } = string.Empty;
    public string GivenName { get; set; } = string.Empty;
    public string FamilyName { get; set; } = string.Empty;
}
```

### Stable Identifiers

Seeded records must be identifiable across seeder runs and across environments. Without a stable identifier the seeder cannot determine whether a record already exists and will either insert duplicates or fail to update records that should be updated.

Record identifiers for seed data are defined as named constants in a `SeedIds` class, grouped by domain concept. They are never stored in configuration. These values are permanent — treat them as immutable once committed.

```csharp
internal static class SeedIds
{
    internal static class Roles
    {
        public static readonly RoleId Administrator = new(new Guid("3fa85f64-5717-4562-b3fc-2c963f66afa6"));
        public static readonly RoleId Operator      = new(new Guid("7b2c4e8a-1f3d-4b6e-9c0a-2d5e7f8b1c4a"));
    }

    internal static class Users
    {
        public static readonly UserId DefaultAdmin = new(new Guid("9a4d1c3e-8b2f-4a7e-b5d6-1c2e3f4a5b6c"));
    }
}
```

For reference data with a strong natural key — a role name, a permission code — the natural key is used for the existence check and the stable ID is used only when inserting. For records without a natural key, the stable ID itself is the existence check.

### Seeder Interface

Each seeder is a class implementing `ISeeder`, scoped to a single category or domain concern. Splitting seeders by concern keeps each one focused and makes it straightforward to trace which seeder is responsible for a given record.

```csharp
internal interface ISeeder
{
    Task SeedAsync(CancellationToken cancellationToken);
}
```

### Reference Data Seeder — Upsert Semantics

Reference data seeders find each record by its natural key and update it if it exists, or insert it with its stable ID if it does not. The configuration is authoritative — if the description of a role changes in configuration, the database is updated to match on the next startup.

```csharp
internal sealed class RoleSeeder : ISeeder
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IReadOnlyList<RoleSeedSettings> _roleSettings;

    public RoleSeeder(ApplicationDbContext dbContext, IOptions<SeedingSettings> settings)
    {
        _dbContext = dbContext;
        _roleSettings = settings.Value.Roles;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        foreach (var settings in _roleSettings)
        {
            var existing = await _dbContext.Roles
                .FirstOrDefaultAsync(r => r.Name == settings.Name, cancellationToken);

            if (existing is null)
            {
                _dbContext.Roles.Add(
                    new Role(ResolveId(settings.Name), settings.Name, settings.Description));
            }
            else
            {
                // The name is the stable natural key — it is never updated.
                // All other configurable fields are updated to reflect current configuration.
                existing.UpdateDescription(settings.Description);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static RoleId ResolveId(string name) => name switch
    {
        "Administrator" => SeedIds.Roles.Administrator,
        "Operator"      => SeedIds.Roles.Operator,
        _ => throw new InvalidOperationException(
            $"No stable seed ID is defined for role '{name}'. " +
            $"Add an entry to {nameof(SeedIds)}.{nameof(SeedIds.Roles)}.")
    };
}
```

The `ResolveId` guard is deliberate. If a new role is added to configuration without a corresponding ID constant, the error surfaces immediately on startup rather than silently inserting a record with a generated ID that cannot be reliably referenced later.

### Default Configuration Seeder — Insert-Only Semantics

Default configuration seeders check for existence by stable ID and return immediately if the record already exists. Existing records are never touched, regardless of what the current configuration says.

```csharp
internal sealed class DefaultAdminUserSeeder : ISeeder
{
    private readonly ApplicationDbContext _dbContext;
    private readonly AdminUserSeedSettings _settings;

    public DefaultAdminUserSeeder(ApplicationDbContext dbContext, IOptions<SeedingSettings> settings)
    {
        _dbContext = dbContext;
        _settings = settings.Value.DefaultAdminUser;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Users
            .AnyAsync(u => u.Id == SeedIds.Users.DefaultAdmin, cancellationToken);

        if (exists)
            return; // Record exists — leave it untouched regardless of configuration changes.

        _dbContext.Users.Add(new User(
            SeedIds.Users.DefaultAdmin,
            _settings.Email,
            _settings.GivenName,
            _settings.FamilyName));

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
```

### Development Fixture Seeder — Insert-Only With Optional Reset

Development fixture seeders use insert-only semantics by default. When `Fixtures:Reset` is `true` in configuration, existing fixture records are removed and recreated — useful for restoring a known state during active development without manually truncating tables. The reset path must never execute outside of the development environment; the DI registration (described below) is the primary guard, and a defensive environment check inside the seeder is an additional safeguard.

```csharp
internal sealed class DevelopmentFixtureSeeder : ISeeder
{
    private readonly ApplicationDbContext _dbContext;
    private readonly SeedingSettings _settings;
    private readonly IHostEnvironment _environment;

    public DevelopmentFixtureSeeder(
        ApplicationDbContext dbContext,
        IOptions<SeedingSettings> settings,
        IHostEnvironment environment)
    {
        _dbContext = dbContext;
        _settings = settings.Value;
        _environment = environment;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
            return; // Defensive guard — registration should already prevent this.

        var existingFixture = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == _settings.DefaultAdminUser.Email, cancellationToken);

        if (existingFixture is not null)
        {
            if (!_settings.Fixtures.Reset)
                return;

            _dbContext.Users.Remove(existingFixture);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // Insert fixture records...
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
```

### Registration and Startup

Seeders are registered as `ISeeder` in the DI container. Development fixture seeders are registered only when the environment is `Development` — this is the primary guard that ensures they never run in other environments.

```csharp
// Infrastructure service registration
services.AddScoped<ISeeder, RoleSeeder>();
services.AddScoped<ISeeder, DefaultAdminUserSeeder>();

if (builder.Environment.IsDevelopment())
{
    services.AddScoped<ISeeder, DevelopmentFixtureSeeder>();
}
```

Seeding runs during application startup after migrations have been applied:

```csharp
// Program.cs
await app.ApplyMigrationsAsync();
await app.SeedDatabaseAsync();
```

```csharp
public static async Task SeedDatabaseAsync(this WebApplication app)
{
    using var scope = app.Services.CreateScope();

    var settings = scope.ServiceProvider
        .GetRequiredService<IOptions<SeedingSettings>>().Value;

    if (!settings.Enabled)
        return;

    foreach (var seeder in scope.ServiceProvider.GetServices<ISeeder>())
    {
        await seeder.SeedAsync(CancellationToken.None);
    }
}
```

The `Enabled` check in `SeedDatabaseAsync` means that setting `Seeding:Enabled: false` in any environment's configuration bypasses all seeders entirely, regardless of which ones are registered. This provides a clean disable path for environments — such as production at steady state — where seeding should not run on every deployment.

---

## Entity Base Classes and Auditing

Audit fields — who created a record, who last modified it, whether it has been soft-deleted — are cross-cutting concerns that must be defined once and applied consistently. Scattering these fields as individual property declarations across unrelated entity classes produces drift: column names diverge, nullability choices differ, and the soft-delete query filter gets forgotten. The base entity hierarchy resolves this by making audit structure a compile-time contract and making the soft-delete query filter a structural consequence of inheritance rather than a discipline requirement.

### Soft deletion is the default

When a spec does not say how an entity is deleted, assume it is soft-deleted. Use the full-audit level, which carries
the deletion fields and the query filter: `FullAuditEntity` below, or the framework's equivalent. Hard deletion is chosen deliberately and recorded in the spec, never reached by default. This holds even when the
work item that creates the entity has no delete action of its own: plan against the whole Feature, whose sibling items
usually include one.

Why: it is better to support soft deletion and not need it than to need it and not have it. Adding it later is a
schema change to a table that already holds data, and any rows hard-deleted before then are gone.

### Entity Hierarchy

The base classes live in `Domain/Shared/` alongside other cross-cutting domain types. They carry no framework attributes — all primary key and column configuration is handled in the base configuration class described below.

```csharp
/// <summary>
/// Root base for all persisted entities. Provides a typed primary key.
/// </summary>
public abstract class Entity<TPrimaryKey>
{
    public required TPrimaryKey Id { get; set; }
}

/// <summary>
/// Extends Entity with creation audit fields. Use for records where creation
/// provenance is required but subsequent modification is not tracked.
/// </summary>
public abstract class CreationAuditEntity<TPrimaryKey, TUserId> : Entity<TPrimaryKey>
    where TUserId : struct
{
    public required DateTimeOffset CreatedAtUtc { get; set; }
    public required TUserId CreatedByUserId { get; set; }
}

/// <summary>
/// Extends CreationAuditEntity with last-modification tracking.
/// UpdatedAtUtc and ModifiedByUserId are null until the record is first modified.
/// </summary>
public abstract class ModificationAuditEntity<TPrimaryKey, TUserId>
    : CreationAuditEntity<TPrimaryKey, TUserId>
    where TUserId : struct
{
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public TUserId? ModifiedByUserId { get; set; }
}

/// <summary>
/// Extends ModificationAuditEntity with soft-deletion. Any entity inheriting from
/// FullAuditEntity must have a query filter applied that excludes IsDeleted records.
/// This is enforced automatically by FullAuditEntityConfiguration.
/// </summary>
public abstract class FullAuditEntity<TPrimaryKey, TUserId>
    : ModificationAuditEntity<TPrimaryKey, TUserId>
    where TUserId : struct
{
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAtUtc { get; set; }
    public TUserId? DeletedByUserId { get; set; }
}
```

The `where TUserId : struct` constraint ensures that nullable audit fields (`TUserId?`) are always `Nullable<TUserId>` — unambiguous under C#'s nullable reference type system and consistent with the strongly-typed identifier convention.

Choose the base class that matches the auditing requirement of each entity. Not every entity needs the full audit trail — applying `FullAuditEntity` to a lookup table that is never modified by users adds noise without value. Apply the narrowest base class that satisfies the entity's actual audit requirements.

### The UserId Value Type

Audit fields reference the user who performed an operation. The type used for these references must be consistent across the solution, strongly typed, and chosen once at project inception. Define `UserId` as a `readonly record struct` in `Domain/Shared/`, following the same strongly-typed identifier convention applied to all aggregate IDs:

```csharp
// Domain/Shared/UserId.cs
// The underlying key type is the project-level decision — choose once, enforce everywhere.
public readonly record struct UserId(Guid Value);

// For solutions where user identities are integer keys:
// public readonly record struct UserId(int Value);

// For solutions where user identities are long keys:
// public readonly record struct UserId(long Value);
```

This file is the single point where the underlying key type is decided. Changing it from `Guid` to `int` in one place will surface every downstream impact as a compiler error, making the scope of the change immediately visible.

Domain entities then inherit with their concrete types:

```csharp
public class Invoice : FullAuditEntity<InvoiceId, UserId> { ... }
```

### Value Converter Convention

`UserId` requires a value converter to translate between its struct representation and the underlying database column type. Rather than declaring this conversion on every audit property in every entity configuration, register it once as a global EF Core convention in the `DbContext`. This ensures audit fields in the base configuration class are covered automatically without any per-entity boilerplate.

```csharp
// ApplicationDbContext.cs
protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
{
    configurationBuilder
        .Properties<UserId>()
        .HaveConversion<UserIdValueConverter>();
}
```

```csharp
// Infrastructure/Persistence/
internal sealed class UserIdValueConverter : ValueConverter<UserId, Guid>
{
    public UserIdValueConverter()
        : base(id => id.Value, value => new UserId(value)) { }
}
```

Update the converter's provider type (`Guid`) to match the underlying type chosen for `UserId`. The same convention-based approach can be applied to all strongly-typed IDs in the solution, replacing the per-property `HasConversion()` calls currently shown in the entity configuration examples with a single registration per type.

### Base Configuration Class

The base configuration class pairs with the entity hierarchy. It maps all audit column names using the established snake_case convention, declares the primary key, and applies the soft-delete query filter. Entity-specific configuration classes inherit from it and only declare the properties unique to that entity.

```csharp
// Infrastructure/Persistence/EntityConfigurations/
internal abstract class FullAuditEntityConfiguration<TEntity, TPrimaryKey, TUserId>
    : IEntityTypeConfiguration<TEntity>
    where TEntity : FullAuditEntity<TPrimaryKey, TUserId>
    where TUserId : struct
{
    public virtual void Configure(EntityTypeBuilder<TEntity> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(e => e.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .IsRequired();

        builder.Property(e => e.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.Property(e => e.ModifiedByUserId)
            .HasColumnName("modified_by_user_id");

        builder.Property(e => e.IsDeleted)
            .HasColumnName("is_deleted")
            .IsRequired();

        builder.Property(e => e.DeletedAtUtc)
            .HasColumnName("deleted_at_utc");

        builder.Property(e => e.DeletedByUserId)
            .HasColumnName("deleted_by_user_id");

        // Soft-delete filter applied automatically for all FullAuditEntity subclasses.
        // Override BuildQueryFilter() to combine with additional predicates rather than
        // calling HasQueryFilter() again — chaining HasQueryFilter() silently discards
        // the previous filter.
        builder.HasQueryFilter(BuildQueryFilter());
    }

    protected virtual Expression<Func<TEntity, bool>> BuildQueryFilter()
        => entity => !entity.IsDeleted;
}
```

A concrete entity configuration inherits from this base and overrides only what it needs to add:

```csharp
internal sealed class InvoiceConfiguration
    : FullAuditEntityConfiguration<Invoice, InvoiceId, UserId>
{
    public override void Configure(EntityTypeBuilder<Invoice> builder)
    {
        base.Configure(builder); // audit columns + soft-delete filter applied here

        builder.ToTable("invoices", schema: DataSchemas.Finances);

        builder.Property(i => i.Id)
            .HasColumnName("id")
            .HasConversion(id => id.Value, value => new InvoiceId(value));

        builder.Property(i => i.CustomerId)
            .HasColumnName("customer_id")
            .IsRequired()
            .HasConversion(id => id.Value, value => new CustomerId(value));

        builder.Property(i => i.Reference)
            .HasColumnName("reference")
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(i => i.Reference)
            .IsUnique()
            .HasDatabaseName("ix_invoices_reference");
    }
}
```

The soft-delete filter cannot be omitted — it is a consequence of inheriting from `FullAuditEntityConfiguration`. Equally, it cannot be silently overridden to a weaker condition, because `BuildQueryFilter()` is `protected virtual` and any override is visible in code review.

Equivalent base configuration classes should be defined for `CreationAuditEntity` and `ModificationAuditEntity` for entities that require those audit levels but not full soft-deletion.

### Tenancy Interfaces

Two interfaces signal whether an entity's records are segregated by tenant:

```csharp
// Domain/Shared/Tenancy/

/// <summary>
/// Indicates that every record belongs to a specific tenant.
/// A null TenantId is invalid for entities implementing this interface.
/// Queries must always filter to the current tenant.
/// </summary>
public interface IMustHaveTenant
{
    int TenantId { get; set; }
}

/// <summary>
/// Indicates that a record may belong to a tenant or may be system-wide.
/// A null TenantId means the record is accessible across all tenants.
/// Query filter semantics are project-specific and must be documented in the ADR.
/// </summary>
public interface IMayHaveTenant
{
    int? TenantId { get; set; }
}
```

The `int` underlying type for `TenantId` reflects the most common case. Projects using a different tenant key type redefine these interfaces accordingly.

**`IMustHaveTenant`** — every query against entities implementing this interface must be filtered to the current tenant ID. No query should ever return records belonging to a different tenant without an explicit, named bypass. The tenant filter must be declared in the entity's `IEntityTypeConfiguration<T>` class, combined with any other active filters via `BuildQueryFilter()`.

**`IMayHaveTenant`** — the filter semantics are ambiguous by design: some queries should include system-wide records alongside tenant records; others should not. The correct behaviour must be determined per-project and documented in the multi-tenancy ADR.

### Multi-Tenancy Requires an ADR

Implementing `IMustHaveTenant` or `IMayHaveTenant` on any entity is the signal that multi-tenancy is a requirement of the solution. This decision must be recorded as an Architecture Decision Record before implementation begins.

Multi-tenancy is not a feature that can be retrofitted cleanly. It affects how the current tenant identity is resolved (from a claim, a header, a subdomain), how it is made available to the `DbContext` for query filter evaluation, how repositories enforce tenant isolation, how cross-tenant administrative operations bypass isolation safely, and how migrations manage tenant-scoped schema objects. Each of these questions has multiple valid answers with meaningful trade-offs. The ADR forces these decisions to be made deliberately and documented, rather than discovered inconsistently across the codebase.

The tenancy interfaces establish the naming contract. They do not prescribe the resolution mechanism — that is the subject of the ADR and the project-specific implementation that follows it.

---

## Granular History Tracking

The audit base classes (`CreationAuditEntity`, `ModificationAuditEntity`, `FullAuditEntity`) establish who created, last modified, and deleted a record. This is the minimum baseline and is sufficient for most tables.

**Granular history tracking** — capturing every version of a record over time, not just the current state — is warranted only when there is a specific, justified requirement to reconstruct past state, produce an immutable audit trail of every field change, or satisfy a compliance obligation that demands point-in-time accuracy.

Adding granular history tracking to a table is an architectural decision and must be recorded in an ADR before implementation.

### When to Use

Use granular history tracking when **all** of the following apply:

- Historical state of individual fields matters — not just who last changed the record, but what every field contained at a given point in time.
- There is a concrete requirement driving it: regulatory compliance, financial audit, dispute resolution, or a user-facing version history feature.
- The table is not a high-write-volume hot path.

Common candidates: financial transactions, contracts, pricing records, user-visible configuration subject to dispute, entities under regulatory audit.

### When Not to Use

Do not apply granular history tracking as a default or as a precaution against future requirements. The cost is real and ongoing:

- **Every write to the main table produces an additional write to the history table.** On high-volume tables this doubles write throughput and storage consumption.
- **History tables grow unbounded** without an enforced retention policy. Query performance degrades over time without one.
- **Schema changes must be coordinated across both tables.** Adding a column to a tracked entity requires a corresponding change to the history table.
- **Queries against history tables are expensive without tight time-bounding.** An unbounded scan is not a query pattern that can be optimised away.

Do not use for: session and token tables, outbox and event log tables (append-only by design), reference and lookup tables that are rarely modified, and any table where the audit baseline — last modified by whom — is sufficient.

### Implementation Approaches

**Shadow history table (manual, database-agnostic)**

A dedicated history table mirrors the main table's structure and adds period columns. Rows are never updated — only inserted. On each write to the main table, the previous row's state is captured in the history table. The application layer owns this coordination, typically via an EF Core interceptor or within the repository.

**Database-native temporal tables**

Some engines (SQL Server, MariaDB) support system-versioned temporal tables — the engine maintains history automatically with no application-level write coordination. EF Core 6+ exposes this for SQL Server via `IsTemporal()` in the Fluent API.

Choose the approach that matches the database in use. The shadow table approach works on any relational database and gives the application full control over retention and purging. Native temporal tables offload that bookkeeping to the engine but are coupled to a specific database engine and its behaviours.

### Naming and Schema Convention

History tables live in the same schema as their main table. Append `_history` to the main table name:

- Main table: `fin.invoices`
- History table: `fin.invoices_history`

The history table includes all columns of the main table plus:

| Column | Type | Purpose |
|---|---|---|
| `history_id` | `bigint` (identity) | Surrogate primary key for the history row |
| `valid_from` | `timestamptz NOT NULL` | Start of the period this row was current |
| `valid_to` | `timestamptz NOT NULL` | End of the period; open-ended rows use a sentinel (`9999-12-31`) |
| `change_type` | `varchar(10) NOT NULL` | `INSERT`, `UPDATE`, or `DELETE` |
| `changed_by_user_id` | same type as the entity's user ID | Actor who caused this version |

The main table's primary key column appears in the history table as a non-unique foreign column — many history rows share the same entity ID.

### Code-First Migrations

Create the history table in its own migration, separate from the migration that created the main table. This isolates the history concern and allows it to be added to a table that was introduced earlier.

**Shadow history table (PostgreSQL / any database):**

```csharp
// Migration: 20240820093000_AddInvoicesHistoryTable
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.CreateTable(
        name: "invoices_history",
        schema: "fin",
        columns: table => new
        {
            history_id         = table.Column<long>(nullable: false)
                                      .Annotation("Npgsql:ValueGenerationStrategy",
                                                   NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
            id                 = table.Column<Guid>(nullable: false),
            customer_id        = table.Column<Guid>(nullable: false),
            reference          = table.Column<string>(maxLength: 100, nullable: false),
            status             = table.Column<string>(maxLength: 50, nullable: false),
            total_amount       = table.Column<decimal>(precision: 18, scale: 4, nullable: false),
            valid_from         = table.Column<DateTimeOffset>(nullable: false),
            valid_to           = table.Column<DateTimeOffset>(nullable: false),
            change_type        = table.Column<string>(maxLength: 10, nullable: false),
            changed_by_user_id = table.Column<Guid>(nullable: false)
        },
        constraints: table =>
        {
            table.PrimaryKey("pk_invoices_history", x => x.history_id);
        });

    migrationBuilder.CreateIndex(
        name: "ix_invoices_history_id_valid_from",
        schema: "fin",
        table: "invoices_history",
        columns: ["id", "valid_from"]);
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropTable(name: "invoices_history", schema: "fin");
}
```

**SQL Server temporal tables (EF Core Fluent API):**

Declare temporal tables in the entity configuration, not in hand-authored raw SQL. EF Core generates the appropriate migration scaffolding.

```csharp
builder.ToTable("invoices", schema: DataSchemas.Finances, b => b.IsTemporal(history =>
{
    history.UseHistoryTable("invoices_history");
    history.HasPeriodStart("valid_from");
    history.HasPeriodEnd("valid_to");
}));
```

Do not hand-author the `SYSTEM_TIME` clause or period column declarations in raw migration SQL when using EF Core's temporal table support — let the Fluent API own that scaffolding. The same versioned-SQL-file workflow used for views and stored procedures applies if raw temporal DDL must be authored outside EF Core.

### Indexes on History Tables

History tables have different query patterns from main tables.

**Always index** the entity ID column combined with `valid_from`. This covers the most common access pattern — all versions of a specific entity ordered by time:

```csharp
// Declared in the history table migration — not in an IEntityTypeConfiguration,
// because history tables are not mapped as EF entities.
migrationBuilder.CreateIndex(
    name: "ix_invoices_history_id_valid_from",
    schema: "fin",
    table: "invoices_history",
    columns: ["id", "valid_from"]);
```

**Index `valid_to` separately** only when point-in-time range queries — finding all records current at a specific timestamp — are a known, frequent access pattern. A partial index covering only open-ended rows (where `valid_to` equals the sentinel) can serve "what is currently active" queries efficiently without a full scan.

**Do not mirror the main table's indexes onto the history table.** History tables are append-only and are queried by time range, not by the same predicates as the live table. Duplicating the main table's indexes adds write overhead on every insert with no corresponding read benefit.

### Query Considerations

History tables are typically not mapped as EF Core entities. Query them via raw SQL, a view, or a keyless type (see the Views section).

**Always time-bound history queries.** An unbounded scan of a history table is likely a mistake and will degrade as the table grows.

```csharp
// Point-in-time: the state of a record as it existed at a specific moment
var snapshot = await dbContext.Database
    .SqlQueryRaw<InvoiceHistoryRow>(
        """
        SELECT * FROM fin.invoices_history
        WHERE id = {0} AND valid_from <= {1} AND valid_to > {1}
        """,
        invoiceId.Value, asOf)
    .FirstOrDefaultAsync(cancellationToken);

// Range: all changes to a record within a bounded period
var changes = await dbContext.Database
    .SqlQueryRaw<InvoiceHistoryRow>(
        """
        SELECT * FROM fin.invoices_history
        WHERE id = {0} AND valid_from >= {1} AND valid_from < {2}
        ORDER BY valid_from
        """,
        invoiceId.Value, from, to)
    .ToListAsync(cancellationToken);
```

For SQL Server temporal tables, use EF Core's temporal query operators rather than raw SQL:

```csharp
// Point-in-time state
var snapshot = await dbContext.Invoices
    .TemporalAsOf(asOf)
    .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);

// All versions within a period
var versions = await dbContext.Invoices
    .TemporalFromTo(from, to)
    .Where(i => i.Id == invoiceId)
    .OrderBy(i => EF.Property<DateTime>(i, "valid_from"))
    .ToListAsync(cancellationToken);
```

**Global query filters do not apply to temporal queries.** EF Core's `TemporalAsOf` and related operators bypass all query filters, including the soft-delete filter. Soft-deleted records will appear in temporal query results. Filter explicitly at the call site if the caller should not see them.

**Never join a history table to the live table without constraining the period columns** on the history side. An unconstrained join produces a cross-product between each current row and all of its historical versions.

### Retention and Maintenance

History tables grow without bound unless a retention policy is defined and enforced before the table is deployed to production. Do not defer this to "later" — later always arrives after the table is already large.

- Define the minimum retention window before deployment. Regulatory obligations often specify this explicitly (seven years is common for financial records).
- Implement retention as a scheduled background job that deletes rows older than the window. This is operational maintenance, not a migration.
- For SQL Server temporal tables, use the engine's built-in `HISTORY_RETENTION_PERIOD` rather than a custom purge job.
- Monitor history table size and row counts. Establish an alert threshold before query performance degrades.