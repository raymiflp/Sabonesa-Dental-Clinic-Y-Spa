# Documentation Specification

## Purpose

Provide a README.md at the project root that enables a new developer or client to set up, configure, and deploy the application end-to-end.

## Requirements

### Requirement: README Structure

The README SHALL include these sections: project name, description, tech stack, prerequisites, setup (backend + frontend), environment variables, deployment (Railway), default credentials, and troubleshooting.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Complete README | Project root | File is read | All required sections present |
| Setup instructions | Developer follows README | Runs setup steps | Backend and frontend start correctly |

### Requirement: Environment Variables Table

The README MUST document all environment variables: `DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL`, `PORT`, `NODE_ENV`. Each SHALL include description, required/optional status, and example value.

#### Scenario: Env Var Reference

- GIVEN a developer deploying to Railway
- WHEN consulting the env var table
- THEN DATABASE_URL, JWT_SECRET, VITE_API_URL are documented with examples

### Requirement: Default Credentials

The README MUST list the three default users with email and password: admin@betty.com / admin123, doctor@betty.com / doctor123, asistente@betty.com / asistente123.

#### Scenario: Credentials Reference

- GIVEN a client testing the deployed app
- WHEN reviewing the README
- THEN default credentials are listed with role descriptions

### Requirement: Railway Deploy Instructions

The README MUST include step-by-step instructions for deploying to Railway: create PostgreSQL service, set environment variables, link the repo, and configure the frontend.

#### Scenario: Deploy Steps

- GIVEN a developer wants to deploy
- WHEN following deploy instructions
- THEN backend and frontend deploy successfully with Railway PG

### Requirement: Setup Commands

The README MUST provide exact terminal commands for: cloning, installing dependencies, running the seed, starting the backend, and starting the frontend.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Fresh setup | New developer clones repo | Runs commands from README | Backend starts on :3001, frontend on :5173 |
