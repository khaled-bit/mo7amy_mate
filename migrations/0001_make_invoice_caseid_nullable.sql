-- Migration: Make invoices.case_id nullable
-- Date: 2025-01-29
-- Description: Allow invoices to be created without being linked to a specific case

ALTER TABLE "invoices" ALTER COLUMN "case_id" DROP NOT NULL; 