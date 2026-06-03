# Inventario Specification

## Purpose

CRUD management for dental supplies (insumos) — list, create, edit, and delete supplies with stock tracking and unit pricing.

## Requirements

### Requirement: Insumo Model

The system MUST define an `Insumo` model in Prisma schema with fields: `id` (autoincrement Int), `nombre` (String), `descripcion` (String, optional), `cantidad` (Int, default 0), `precioUnitario` (Float, optional), `proveedor` (String, optional), `createdAt` (DateTime), `updatedAt` (DateTime).

#### Scenario: Model Applied

- GIVEN Prisma schema with Insumo model
- WHEN `npx prisma db push` executes
- THEN the `Insumo` table is created with all fields

### Requirement: REST Endpoints

The system MUST expose the standard CRUD endpoints following the procedimientos controller pattern (try/catch wrapper, `req.prisma` for Prisma access, `Number(id)` for param conversion).

| Endpoint | Method | Handler | Returns |
|----------|--------|---------|---------|
| `/api/insumos` | GET | getAll | Array of all insumos ordered by nombre asc |
| `/api/insumos/:id` | GET | getById | Single insumo by id (404 if not found) |
| `/api/insumos` | POST | create | 201 + created insumo |
| `/api/insumos/:id` | PUT | update | Updated insumo |
| `/api/insumos/:id` | DELETE | remove | Success message |

#### Scenario: List All Insumos

- GIVEN insumos exist in the database
- WHEN GET /api/insumos is called
- THEN a JSON array of all insumos is returned

#### Scenario: Create Insumo

- GIVEN valid insumo data (nombre, cantidad, precioUnitario)
- WHEN POST /api/insumos is called
- THEN a 201 response with the created insumo is returned

#### Scenario: Update Insumo

- GIVEN an existing insumo with id=1
- WHEN PUT /api/insumos/1 with { cantidad: 20 } is sent
- THEN the insumo's cantidad is updated to 20

#### Scenario: Delete Insumo

- GIVEN an existing insumo with id=1
- WHEN DELETE /api/insumos/1 is called
- THEN the insumo is removed from the database (204 or success message)

#### Scenario: Get Single — Not Found

- GIVEN no insumo with id=999
- WHEN GET /api/insumos/999 is called
- THEN a 404 response is returned

### Requirement: Frontend Inventario Page

The system MUST provide an `/inventario` page with a shadcn Table listing all insumos (columns: nombre, cantidad, precioUnitario, proveedor, acciones). Toolbar MUST include a "Nuevo Insumo" button opening a Dialog for creation. Each row MUST have an Edit button (pencil icon) and a Delete button with confirmation.

| Field | Display Format |
|-------|---------------|
| nombre | Plain text |
| cantidad | Integer with color-coded background |
| precioUnitario | Currency (RD$) |
| proveedor | Plain text or "—" if empty |

#### Scenario: Create Insumo via Dialog

- GIVEN the Inventario page is open
- WHEN user clicks "Nuevo Insumo", fills the form, and clicks "Crear"
- THEN the insumo is saved and appears in the table

#### Scenario: Edit Insumo via Dialog

- GIVEN an insumo in the table
- WHEN user clicks the Edit button, modifies fields, and clicks "Guardar"
- THEN the insumo is updated and the table reflects changes

#### Scenario: Delete with Confirmation

- GIVEN an insumo in the table
- WHEN user clicks Delete
- THEN a confirmation prompt appears before deletion

### Requirement: Stock Quantity Color Coding

The system MUST visually indicate stock status using color on the cantidad cell:

| Condition | Color |
|-----------|-------|
| cantidad = 0 | Red (bg-red-100 text-red-700) |
| cantidad between 1 and 10 | Yellow (bg-yellow-100 text-yellow-700) |
| cantidad > 10 | Green (bg-green-100 text-green-700) |

#### Scenario: Stock Display

- GIVEN insumos with stock=0, stock=5, and stock=25
- WHEN the table renders
- THEN each cantidad cell shows the corresponding color

### Requirement: Sidebar Link

The Layout sidebar MUST include an Inventario link with the `Package` icon from lucide-react, navigating to `/inventario`. It MUST respect role filtering (visible to admin and doctor).

#### Scenario: Admin Sees Link

- GIVEN an authenticated admin user
- WHEN sidebar renders
- THEN an "Inventario" link with Package icon is present

### Requirement: Route Registration

The frontend App MUST register `/inventario` route inside the Layout wrapper.

#### Scenario: Navigate to Inventario

- GIVEN the app is running
- WHEN navigating to /inventario
- THEN the Inventario page renders inside the Layout
