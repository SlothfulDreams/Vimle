# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vimle is a daily coding challenge web application built with modern web technologies. It's a gamified platform where users complete vim-based coding challenges daily, with AI-powered challenge generation and comprehensive user progress tracking.

## Tech Stack & Architecture

- **Frontend**: React 19 with Vike (full-stack meta-framework)
- **Backend**: Hono server with tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: TailwindCSS with shadcn/ui components
- **Editor**: CodeMirror 6 with vim bindings (@replit/codemirror-vim)
- **AI Generation**: Google Gemini API for challenge content generation
- **Authentication**: Supabase Auth
- **Deployment**: Vercel with edge functions
- **Code Quality**: Biome for linting and formatting

## Key Architecture Patterns

### Full-Stack Type Safety
- **tRPC Router**: `trpc/server.ts` defines all API endpoints with Zod validation
- **Database Layer**: Prisma client with generated types in `lib/generated/prisma/`
- **Type Definitions**: Shared types in `types/index.ts`

### Challenge System Architecture
The application has a sophisticated dual-generation system:

1. **AI Generation Pipeline** (`lib/ai-generation/`):
   - `generator.ts`: Main orchestrator for AI-powered challenge generation  
   - `gemini/`: Google Gemini integration with prompts, validation, and error handling
   - Fallback to static challenges when AI generation fails

2. **Static Challenge Pool** (`lib/challenge/static-pool.ts`):
   - Curated set of vim challenges for reliable fallback
   - Date-based deterministic selection algorithm

### State Management
- **Challenge Context**: `lib/challenge-context.tsx` provides global challenge state
- **Auth Context**: `lib/auth-context.tsx` manages user authentication state
- **Local Storage**: `lib/local-storage.ts` handles offline data persistence

### Component Architecture
- **Page Components**: File-system based routing in `pages/` directory
- **UI Components**: shadcn/ui components in `components/ui/`
- **Business Components**: Feature-specific components (Editor, Challenge, Auth)

## Development Commands

### Core Development
- `pnpm dev` - Start development server with Vike and Hono
- `pnpm build` - Build for production (generates static files and server)
- `pnpm preview` - Preview production build locally

### Code Quality
- `pnpm lint` - Run Biome linter with auto-fix
- `pnpm format` - Format code with Biome (2-space indentation)

### Database Operations
- `pnpm prisma:generate` - Generate Prisma client after schema changes
- `pnpm prisma:studio` - Open Prisma Studio for database inspection

### Component Management
- `pnpm shadcn add [component]` - Add new shadcn/ui component

## Important File Locations

### Configuration Files
- `vite.config.ts` - Vite configuration with Vercel deployment settings
- `biome.json` - Code formatting and linting rules (2-space indentation)
- `prisma/schema.prisma` - Database schema with User, Challenge, ChallengeAttempt models
- `components.json` - shadcn/ui configuration

### Core Application Files
- `hono-entry.ts` - Main server entry point (development and production)
- `trpc/server.ts` - tRPC API router with all backend logic
- `pages/index/+Page.tsx` - Main game interface component
- `components/EditorContainer.tsx` - CodeMirror vim editor wrapper

### Business Logic
- `lib/challenge/service.ts` - Challenge generation and management service
- `lib/ai-generation/generator.ts` - AI-powered challenge generation orchestrator
- `hooks/useTimer.ts` - Challenge completion timer functionality

## Database Schema

The application uses three main entities:

1. **User**: Stores user profiles with Supabase UUID integration
2. **Challenge**: Daily challenges with AI/static generation tracking
3. **ChallengeAttempt**: User completion records with performance metrics

Key relationships:
- Users have many ChallengeAttempts
- Challenges have many ChallengeAttempts (one per user)
- Unique constraint on (user_id, challenge_id) prevents duplicate attempts

## Environment Variables

Required for AI generation:
- `GOOGLE_AI_API_KEY` - Google Gemini API key for challenge generation
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (for migrations)

## Development Workflow

1. **Database Changes**: Update `prisma/schema.prisma` → run `pnpm prisma:generate`
2. **API Changes**: Modify `trpc/server.ts` → types automatically propagate to frontend
3. **UI Components**: Use shadcn/ui patterns and maintain 2-space indentation
4. **Challenge Content**: Add static challenges to `lib/challenge/static-pool.ts`

## Code Style Guidelines

- **Indentation**: 2 spaces (enforced by Biome)
- **Import Organization**: Biome auto-organizes imports
- **Component Patterns**: Follow React functional component patterns with hooks
- **Error Handling**: Graceful degradation (AI → static fallback, database failures)
- **Type Safety**: Leverage TypeScript strict mode and tRPC end-to-end typing

## Testing & Quality Assurance

- Run `pnpm lint` before committing to ensure code quality
- The application handles network failures gracefully (offline localStorage persistence)
- AI generation includes validation and automatic fallback mechanisms
- Database operations use transactions and proper error handling

## Deployment Notes

- **Vercel Integration**: Configured via `vite.config.ts` with additional endpoints
- **Edge Functions**: Hono server runs on Vercel Edge Runtime
- **Static Assets**: Vike handles static generation with SSR capabilities
- **Database**: Uses connection pooling for production PostgreSQL