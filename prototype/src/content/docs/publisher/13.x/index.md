---
title: "Laravel Publisher Documentation"
slug: publisher/13.x
---

Publisher is a Laravel package that provides a complete content publishing workflow, allowing you to maintain both published and draft versions of your content simultaneously. Editors can work on changes without affecting the live published version until changes are explicitly published.

## Documentation

### Guides

- [Installation](/publisher/13.x/guides/installation/) - Get up and running with Publisher
- [Core Concepts](/publisher/13.x/guides/core-concepts/) - Understand the fundamentals of the publishing workflow

### Traits

- [IsPublishable](/publisher/13.x/traits/is-publishable/) - The main trait for making models publishable
- [HasPublishablePivotAttributes](/publisher/13.x/traits/has-publishable-pivot-attributes/) - Draft support for custom pivot model attributes
- [InteractsWithPublishableContent](/publisher/13.x/traits/interacts-with-publishable-content/) - Override relationship methods with publishable versions

### Features

- [Draft Management](/publisher/13.x/features/draft-management/) - How draft attributes are stored and synced
- [Publishing Workflow](/publisher/13.x/features/publishing-workflow/) - Publishing, unpublishing, and reverting content
- [Publishable Relationships](/publisher/13.x/features/publishable-relationships/) - BelongsToMany and MorphToMany with draft support
- [Dependent Models](/publisher/13.x/features/dependent-models/) - Cascading publish state to child models
- [Events](/publisher/13.x/features/events/) - Lifecycle events for the publishing workflow
- [Querying](/publisher/13.x/features/querying/) - Query scopes and draft-aware WHERE clauses
- [Middleware](/publisher/13.x/features/middleware/) - Controlling draft content visibility
- [URL Rewriting](/publisher/13.x/features/url-rewriting/) - Preserving draft visibility across navigation
- [Authorization](/publisher/13.x/features/authorization/) - Gates and permissions

### Advanced

- [Custom Workflow States](/publisher/13.x/advanced/custom-workflow-states/) - Extending beyond published/draft
- [Schema Conflicts](/publisher/13.x/advanced/schema-conflicts/) - Handling column renames and drops
- [Custom Pivot Models](/publisher/13.x/advanced/custom-pivot-models/) - Advanced pivot table configurations
- [Admin Panel Integration](/publisher/13.x/advanced/admin-panel-integration/) - Nova, Filament, and Backpack guides
- [Plank Ecosystem](/publisher/13.x/advanced/plank-ecosystem/) - Related packages and dependencies
