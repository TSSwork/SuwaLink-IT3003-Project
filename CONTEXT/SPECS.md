# SPECS.md

# SuwaLink MVP Technical Specifications

## Purpose

This document defines the technical standards, architecture, project structure, and development guidelines for the SuwaLink MVP.

The goal is **consistency**, **maintainability**, and **scalability**.

Every contributor—human or AI—should follow these specifications before implementing new features.

This document intentionally focuses on engineering standards rather than feature implementation.

---

# Technology Stack

## Backend

Framework

- Spring Boot

Language

- Java 25 (LTS)

Build Tool

- Maven

Database

- MySQL 8+

Development Database

- MySQL 8 via docker compose (H2 is used only for tests)

ORM

- Spring Data JPA
- Hibernate

Authentication

- Spring Security
- JWT Authentication

Validation

- Bean Validation
- Hibernate Validator

Utilities

- Lombok

API

- REST API

Serialization

- Jackson

---

## Backend Dependencies

Required dependencies

- Spring Web
- Spring Data JPA
- Spring Security
- Validation
- MySQL Driver
- H2 Database
- Lombok

Additional recommended dependencies

- Spring Boot DevTools
- Spring Configuration Processor
- springdoc-openapi (Swagger/OpenAPI)
- jjwt (JWT implementation)

---

## Frontend

Technology

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- jQuery

UI

- Material Design 3

Design Rules

Refer to

```
DESIGN.md
```

No frontend framework should be introduced for the MVP.

---

# Overall Architecture

Follow a layered architecture.

```
Frontend
      │
 REST API
      │
Controllers
      │
Services
      │
Repositories
      │
Database
```

Business logic must never exist inside controllers.

Controllers are only responsible for

- receiving requests
- validation
- returning responses

---

# Backend Architecture

Recommended package structure

```
com.suwalink

│
├── config
├── security
├── auth
├── controller
├── service
│      ├── interface
│      └── impl
├── repository
├── entity
├── dto
│      ├── request
│      └── response
├── mapper
├── exception
├── util
├── validator
├── notification
├── inventory
├── prescription
├── reservation
└── common
```

Do not place everything into one package.

Organize by responsibility.

---

# Layer Responsibilities

## Controller

Responsible for

- REST endpoints
- request validation
- calling services
- returning DTOs

Controllers should remain small.

Never write business logic here.

---

## Service Interface

Every business module should expose an interface.

Example

```
InventoryService
```

not

```
InventoryServiceImpl directly
```

The interface defines the contract.

---

## Service Implementation

Contains business logic.

Example

```
InventoryServiceImpl
```

Responsibilities

- business rules
- transactions
- repository calls
- validation
- notification triggers

---

## Repository

Repositories should only communicate with the database.

No business logic.

No validation.

---

## Entity

Entities represent database tables.

Entities should not be used directly in API responses.

---

## DTO

Always use DTOs.

Never expose entities directly.

Separate

```
Request DTO
```

from

```
Response DTO
```

Example

```
CreateInventoryRequest

UpdateInventoryRequest

InventoryResponse
```

---

## Mapper

Mapping between

DTO ↔ Entity

should be isolated.

Avoid mapping inside controllers.

---

## Validation

Use Bean Validation annotations.

Examples

```
@NotBlank

@NotNull

@Email

@Size

@Pattern
```

Validation belongs in DTOs.

Never validate manually inside controllers unless necessary.

---

# Authentication

Authentication

JWT

Authorization

Spring Security

Roles

```
ROLE_USER

ROLE_PHARMACY

ROLE_ADMIN
```

Authentication flow

```
Login

↓

JWT Generated

↓

Frontend stores token

↓

Authorization Header

Bearer Token

↓

Protected Endpoints
```

Never use Sessions.

Never use Cookies for authentication during MVP.

---

# Passwords

Passwords

Must always be

```
BCrypt Hashed
```

Never store plain text passwords.

Never log passwords.

---

# API Design

Follow REST principles.

Examples

```
GET

POST

PUT

PATCH

DELETE
```

Naming

Good

```
/api/pharmacies

/api/inventory

/api/prescriptions

/api/reservations
```

Avoid

```
/getInventory

/createUser

/deleteMedicine
```

Resources should be nouns.

---

# API Responses

Create a standard response format.

Example

```
{
    "success": true,
    "message": "...",
    "data": {}
}
```

Errors should follow the same structure.

---

# Exception Handling

Use

```
@ControllerAdvice
```

Centralize exception handling.

Avoid

```
try
catch
```

inside every controller.

---

# Logging

Use

```
SLF4J
```

Log

- errors
- warnings
- authentication
- important events

Never log

- passwords
- JWT tokens
- sensitive medical data

---

# Database

Use

```
Spring Data JPA
```

Naming

Tables

snake_case

Columns

snake_case

Java

camelCase

IDs

Prefer UUID for public-facing identifiers if appropriate, or generated numeric IDs if simplicity is preferred for the MVP. Be consistent across the application.

---

# Database Migration

Recommended

Flyway

or

Liquibase

Avoid manually editing production databases.

Every schema change should be version controlled.

---

# Transactions

Business operations involving multiple database updates should use

```
@Transactional
```

Do not rely on manual rollback logic.

---

# File Uploads

Prescription images

Store

- original filename
- generated filename
- file path
- mime type

Do not store image binary data inside MySQL.

The database stores metadata only.

---

# Notifications

Notification logic should be isolated.

Create

```
NotificationService
```

Future implementations

- Push notifications
- Email
- SMS
- In-app notifications

should plug into the same service.

---

# Frontend Structure

Recommended structure

```
/

index.html

assets/

css/

js/

images/

icons/

fonts/

pages/

components/

layouts/

```

JavaScript

```
assets/js

api/

auth/

inventory/

prescription/

reservation/

notification/

utils/

components/

pages/

config/

```

Avoid putting everything into one file.

---

# CSS Structure

```
base/

components/

layout/

utilities/

pages/

themes/

```

Keep CSS modular.

Avoid one massive stylesheet.

---

# JavaScript Guidelines

Use

- ES6 Modules where practical
- const
- let

Avoid

```
var
```

Separate

- API calls
- DOM manipulation
- utility functions

Do not mix everything together.

---

# API Layer

Frontend should never call fetch directly everywhere.

Create

```
ApiService
```

Responsible for

- Authorization headers
- Error handling
- JSON parsing
- Token handling

Every page should use this layer.

---

# Authentication Storage

JWT

Store securely (the implementation may use browser storage for the MVP; evaluate security trade-offs before production).

Never hardcode tokens.

---

# UI Standards

Follow

```
DESIGN.md
```

strictly.

Material Design 3

Always.

---

# Naming Conventions

Classes

```
PascalCase
```

Methods

```
camelCase
```

Variables

```
camelCase
```

Constants

```
UPPER_SNAKE_CASE
```

Packages

```
lowercase
```

---

# Git Workflow

Main branches

```
main

develop
```

Feature branches

```
feature/login

feature/inventory

feature/prescription

feature/notification
```

One feature

One pull request.

---

# Documentation

Every module should include

- README
- API documentation
- DTO documentation (when needed)

Generate OpenAPI documentation using springdoc-openapi so backend endpoints remain discoverable and testable.

---

# Code Style

Backend

Follow the official Java Code Conventions and Spring Boot best practices.

Frontend

Follow consistent formatting.

Use Prettier if introduced.

---

# Development Workflow

Before implementing any feature:

## Step 1

Understand the feature.

---

## Step 2

Design database entities.

---

## Step 3

Create DTOs.

```
Request DTOs

Response DTOs
```

---

## Step 4

Create Repository interfaces.

---

## Step 5

Define Service interfaces.

Only define the contract first.

---

## Step 6

Implement Service classes.

Business logic belongs here.

---

## Step 7

Implement Controllers.

Controllers should simply orchestrate requests and responses.

---

## Step 8

Implement Frontend.

Only after API contracts are stable.

---

## Step 9

Integrate.

---

## Step 10

Test.

---

# Testing

Backend

Recommended

- JUnit 5
- Spring Boot Test
- MockMvc
- Mockito

Frontend

Manual testing for MVP.

Future

End-to-end testing.

---

# Future Scalability

The architecture should support future modules without major refactoring.

Examples

- Doctor Portal
- Medical Records
- AI Prescription Recognition
- OCR
- POS
- Payment Gateway
- Delivery Services
- Multi Pharmacy Chains
- Mobile Applications

The MVP architecture should already accommodate these future expansions.

---

# Guiding Principles

Every contributor should prioritize:

1. Readability over cleverness.
2. Separation of concerns.
3. Reusable components.
4. Small focused classes.
5. Interface-driven design.
6. DTO-driven APIs.
7. Validation at the boundary.
8. Consistent naming.
9. Material Design 3 compliance.
10. Maintainability over speed.

---

# Official References

Use these as the source of truth before introducing custom solutions.

## Backend

- Spring Boot Reference Documentation
- Spring Framework Documentation
- Spring Data JPA Documentation
- Spring Security Documentation
- Hibernate ORM Documentation
- Jakarta Bean Validation Specification
- Jackson Documentation
- Maven Documentation

## Frontend

- HTML Living Standard
- MDN Web Docs
- ECMAScript Specification
- jQuery Documentation

## Design

Refer to `DESIGN.md`.

---

# Summary

SuwaLink follows a clean, layered architecture with a strict separation between presentation, business logic, and persistence. The backend is built using Spring Boot with interface-driven services, DTO-based APIs, JWT authentication, and JPA persistence. The frontend uses HTML, CSS, Vanilla JavaScript, and jQuery while adhering strictly to the Material Design 3 principles defined in `DESIGN.md`.

Every feature should be designed before it is implemented, every API should be contract-first, and every contribution should favor consistency, maintainability, and long-term scalability over quick or tightly coupled solutions.

to reduce token usage ai can use there skills
- find-skills -  to find appropriate skills and download them to local directory and implement features, if find skills are not available, implement the feature using existing knowledge
- ponytail - think like senior dev that reduce unnecessary code and refactor existing code to be more maintainable, if no suitable skills are available, implement the feature using existing knowledge
- if other appropriate skill files are available, use them to implement the feature
