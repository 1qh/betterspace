# Schema Evolution

SpacetimeDB handles schema changes through module republishing.
When you run `spacetime publish`, it compares the new schema against the deployed one
and applies the diff.

## The basic workflow

1. Edit your module (`packages/be/src/index.ts`)
2. Publish: `spacetime publish my-app --module-path packages/be/`
3. Regenerate bindings:
   `spacetime generate --lang typescript --module-path packages/be/ --out-dir packages/be/module_bindings/`
4. Update client code to use new fields/tables

## Adding a field

Add the field to your table definition and republish:

```typescript
// Before
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    content: t.string(),
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)

// After: add 'category' field
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    content: t.string(),
    category: t.string().optional(), // new field, optional for backward compat
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)
```

Publish:

```bash
spacetime publish my-app --module-path packages/be/
```

Existing rows get `null` for the new optional field.
Required (non-optional) fields on existing rows will have their zero value (empty string
for `t.string()`, `0` for `t.u32()`, `false` for `t.bool()`). Existing rows receive
zero-value defaults (empty string for strings, 0 for numbers, false for booleans).
Verify this is acceptable for your business logic before deploying.

## Removing a field

**Warning: This operation permanently deletes all data in the removed column.
Back up your database before proceeding.
This cannot be undone.**

Remove the field from the table definition and republish.
Existing data in that column is dropped.

```typescript
// Remove 'category' field
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    content: t.string(),
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)
```

After republishing, regenerate bindings.
Client code referencing the removed field will get TypeScript errors, which is the
intended behavior.

## Adding a table

Add the table to your schema and republish:

```typescript
const tag = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    name: t.string().unique(),
    postId: t.u32().index()
  }
)

const spacetimedb = schema({
  post,
  tag // new table
})
```

The new table starts empty.
Existing data is unaffected.

## Removing a table

Remove the table from the schema and republish.
All data in that table is dropped.

```typescript
const spacetimedb = schema({
  post
  // tag removed
})
```

## Renaming a field or table

SpacetimeDB doesn’t have a native rename migration.
The safe approach:

1. Add the new field/table alongside the old one
2. Write a migration reducer that copies data from old to new
3. Update client code to use the new field/table
4. Remove the old field/table in a subsequent publish

```typescript
// Step 1: add new field
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    body: t.string(), // new name
    content: t.string(), // old name, keep temporarily
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)

// Step 2: migration reducer
export const migrateContentToBody = spacetimedb.reducer(
  { name: 'migrate_content_to_body' },
  {},
  ctx => {
    for (const post of ctx.db.post) {
      if (post.body === '' && post.content !== '') {
        ctx.db.post.id.update({ ...post, body: post.content })
      }
    }
  }
)
```

Run the migration:

```bash
spacetime call my-app migrate_content_to_body '{}'
```

Then remove the old field in a subsequent publish.

## Changing a field type

SpacetimeDB doesn’t support in-place type changes.
Use the rename pattern above: add a new field with the new type, migrate data, remove
the old field.

## Index changes

Add or remove indexes by modifying the table definition:

```typescript
// Add an index
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    category: t.string().index(), // add index
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)

// Composite index
const wiki = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'orgIdSlug',
        algorithm: 'btree',
        columns: ['orgId', 'slug']
      }
    ]
  },
  {
    /* fields */
  }
)
```

Republish to apply index changes.
SpacetimeDB rebuilds indexes on publish.

## Reducer changes

Adding, removing, or changing reducer signatures follows the same pattern: edit the
module, republish, regenerate bindings.

If you remove a reducer that clients are calling, those calls will fail with an error.
Coordinate client and server deploys to avoid downtime.

## Production migrations

For production deployments with live users:

1. **Backward-compatible changes first**: add optional fields, new tables, new reducers.
   Deploy server.
2. **Deploy client**: update client to use new fields/reducers.
3. **Remove old fields**: once all clients are updated, remove deprecated fields.
   Deploy server again.

This two-phase approach avoids breaking live clients during a deploy.

## Checking the current schema

```bash
# View the deployed module's schema
spacetime describe my-app

# View table definitions
spacetime describe my-app --table post
```

## Resetting a local module

During development, you can wipe and republish:

**Never do this in production.**

```bash
# Delete the module (drops all data)
spacetime delete my-app

# Republish fresh
spacetime publish my-app --module-path packages/be/
```

This is only safe in local dev.
