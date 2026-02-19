# JIRA Workflow

This document describes the JIRA workflow for Voyager Search UI projects.

## Workflow States

| Status          | Description                     |
| --------------- | ------------------------------- |
| **Open**        | Ticket created, not yet started |
| **In Progress** | Actively being worked on        |
| **In Review**   | Code review in progress         |
| **In QA**       | Quality assurance testing       |
| **Resolved**    | Work completed                  |

## Transitions

```
┌──────────┐    Start Progress    ┌─────────────┐
│   Open   │ ──────────────────▶  │ In Progress │
└──────────┘                      └─────────────┘
     ▲                                   │
     │ Stop Progress                     ├── Review Issue ──▶ In Review
     └───────────────────────────────────┤
                                         ├── Please QA ────▶ In QA
                                         │
                                         └── Resolve Issue ─▶ Resolved
```

### From Open

- **Start Progress** → In Progress

### From In Progress

- **Review Issue** → In Review
- **Please QA** → In QA
- **Resolve Issue** → Resolved
- **Stop Progress** → Open

## Standard Development Flow

1. **Create ticket** in JIRA
2. **Assign to yourself**
3. **Start Progress** - transitions to "In Progress"
4. **Create feature branch** from `dev`: `git checkout -b feat/<TICKET>-123-description`
5. **Write code** on the feature branch
6. **Create PR** targeting `dev`
7. **Wait for CI to pass** - ensure all checks pass before merging
8. **Merge PR** - squash and merge into `dev`
9. **Delete feature branch** - ask for permission, then delete the remote branch
10. **Review Issue** - transitions to "In Review", assign to reviewer
11. **Complete review** - reviewer reviews code on `dev` branch
12. **Please QA** (optional) - transitions to "In QA" if QA testing needed
13. **Resolve Issue** - transitions to "Resolved" when complete

**Important:** Merge to `dev` happens after CI passes. Code reviews happen on the `dev` branch after merge. Always ask before deleting feature branches.

## Team Members

| Name          | Role  | Notes    |
| ------------- | ----- | -------- |
| Harold Bostic | Owner | @hbostic |

_Note: Names and team composition may change as other team members join. The workflow process remains the same._

## Tips

- Always assign the ticket to yourself before starting work
- Assign to the appropriate reviewer when transitioning to "Review Issue"
- Use meaningful branch names that include the ticket number
- Reference the ticket number in commit messages and PR descriptions

---

_Last updated: February 2026_
