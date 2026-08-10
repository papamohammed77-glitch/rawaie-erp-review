# RAWAEA Release — Edge Functions

This directory contains only Edge Functions explicitly approved for Production deployment.

## Current Target
Manual Stock Vouchers.

## Rule
A function is copied here only after:
- source/schema/RLS verification;
- complete implementation review;
- UI ↔ Edge ↔ RPC contract verification;
- GO decision.

The already-deployed database migration is not repeated here as a redeployment artifact.
