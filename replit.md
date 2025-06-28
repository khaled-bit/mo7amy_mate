# LawyerMate - Legal Office Management System

## Overview

LawyerMate is a comprehensive legal office management system designed for law firms to manage clients, cases, sessions, documents, invoices, and administrative tasks. The application provides role-based access control with support for admin, lawyer, and assistant roles. The system is built with modern web technologies and follows a full-stack architecture with a React frontend and Express.js backend.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds
- **Form Management**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL session store
- **File Uploads**: Multer for handling document uploads
- **Password Security**: Node.js crypto module with scrypt hashing

## Key Components

### Database Schema
The system uses PostgreSQL with the following main entities:
- **Users**: Authentication and role management (admin, lawyer, assistant)
- **Clients**: Client information and contact details
- **Cases**: Legal case management with status tracking
- **Sessions**: Court sessions and appointments scheduling
- **Documents**: File management for case-related documents
- **Invoices**: Billing and payment tracking
- **Tasks**: Task assignment and progress tracking
- **Activity Log**: System audit trail

### Authentication & Authorization
- Session-based authentication using Passport.js
- Role-based access control (RBAC) with three user types
- Protected routes on both frontend and backend
- Password hashing using scrypt with salt

### File Management
- Local file storage using Multer
- Upload directory management with file size limits (10MB)
- Document association with cases and metadata tracking

### Data Validation
- Zod schemas for runtime type checking
- Form validation using React Hook Form resolvers
- Database schema validation with Drizzle Zod integration

## Data Flow

1. **User Authentication**: Users login through Passport.js local strategy
2. **Session Management**: Sessions stored in PostgreSQL with connect-pg-simple
3. **API Requests**: Frontend makes authenticated requests to Express.js backend
4. **Database Operations**: Drizzle ORM handles all database interactions
5. **File Uploads**: Multer processes file uploads to local storage
6. **State Management**: TanStack Query manages server state and caching

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for date manipulation
- **HTTP Client**: Fetch API with custom wrapper functions

### Backend Dependencies
- **Database Driver**: @neondatabase/serverless for PostgreSQL connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy
- **File Handling**: Multer for multipart form data
- **Session Storage**: connect-pg-simple for PostgreSQL session store

### Development Tools
- **Build Tool**: Vite with React plugin
- **Type Checking**: TypeScript with strict configuration
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: ESM modules with modern JavaScript features

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- TSX for running TypeScript backend in development
- Environment variables for database connection
- Replit-specific configurations for cloud development

### Production Build
- Vite builds frontend to static assets
- ESBuild bundles backend for Node.js deployment
- PostgreSQL database with connection pooling
- Environment-based configuration management

### Database Management
- Drizzle migrations for schema changes
- Connection pooling with Neon PostgreSQL
- Session table auto-creation for authentication

## Changelog
- June 28, 2025: Initial setup of legal case management system
- June 28, 2025: Successfully deployed Arabic legal case management system with complete functionality
- June 28, 2025: Database seeded with sample users for testing
- June 28, 2025: Updated currency system from Saudi Riyal to Egyptian Pound throughout application

## User Preferences

Preferred communication style: Simple, everyday language.