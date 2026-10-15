# Changelog

All notable changes to the **SatLease** protocol and application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-10
### Fixed & Hardened (Steward Review Requirements)
- **Immutable Deterministic Chain Timestamps:** Replaced mutable task counter with `_get_current_timestamp()` extracting from `gl.message_raw["datetime"]` or `gl.message.timestamp`. Deadlines are now strictly tied to chain time.
- **Bound Supplemental Evidence:** Appellant's `supplemental_evidence_url` is permanently bound into task storage at appeal filing. `adjudicate_appeal` is strictly restricted to evaluate that bound evidence.
- **Comprehensive Solvency Settlement Matrix:** Implemented exhaustive settlement matrix covering every combination of appellant (`Client` vs `Operator`) and prior verdict (`SLA_COMPLIANT_FULL`, `PARTIAL_USABLE_COMPENSATION`, `DEFECTIVE_CLOUD_BREACH`), preserving escrow & bond solvency to the exact wei.
- **Resilient GenVM Error Hierarchy:** Implemented `ContractError` dynamically inheriting from GenVM `UserError` to completely prevent `AttributeError` across any execution environment while maintaining canonical transaction revert semantics.
- **Expanded Pytest Suite (13 Tests):** Added focused tests proving cooling-off and expiry cannot be advanced by task creation, and that dismissed or upheld appeals preserve escrow and bond outcomes.

## [1.2.4] - 2026-10-08
### Added & Verified (Production Testnet Release)
- **Deployed Contract to GenLayer StudioNet:** Live contract deployed at [`0x7d7aD14e9276d612E2A9a6edC0108ECb99649FaD`](https://explorer-studio.genlayer.com/address/0x7d7aD14e9276d612E2A9a6edC0108ECb99649FaD) (Tx Hash: `0x2d54e81b0c0bc63d7d6e65b29758ae813217e20fed4771205926d554b312cb8c`).
- **Seeded Live Orbital Task #1:** Initialized on-chain task covering California Central Valley with 0.01 GEN escrow.
- **Vercel Production Deployment:** Automated production build with zero-mock live RPC connection and SPA routing.

## [1.2.0] - 2026-10-08
### Hardened (AI Remote Sensing Tribunal & Economic Security)
- **Multi-Validator Equivalence Consensus (`gl.vm.run_nondet`):** Enforces strict leader-validator consensus with SHA-256 evidence hashing and `CANARY_SAT_LEASE_ORBITAL_V1` prompt injection defense.
- **Live STAC & GeoTIFF Ingestion (`gl.nondet.web.render`):** Live fetching and evaluation of satellite radiometry directly on-chain.
- **Double Payout Safeguards:** Resetting `t.escrow_amount = 0` prior to `emit_transfer` execution.
- **Native GEN Payout Standard:** Standardized `_pay_native` to invoke `gl.get_contract_at(recipient).emit_transfer(value=u256(int(amount)))`.

## [1.1.0] - 2026-10-08
### Added (Two-Sided Justice & Anti-Griefing Appeal Engine)
- **24-Block Cooling-off Challenge Window:** Prevents instantaneous draining of funds; provides grace period for radiometric review.
- **10% Anti-Griefing Dispute Bond:** Requires appellants to stake 10% collateral to challenge tribunal rulings.
- **Appellate Space Chamber:** Re-evaluates disputed deliverables against supplemental Synthetic Aperture Radar (SAR) logs.
- **Split Payout (50/50 Fair Compensation):** Automatic middle tier for marginal peripheral cloud cover (between limit + 1% and limit + 15%).

## [1.0.0] - 2026-10-08
### Added (Core Protocol Foundation)
- **Intelligent Contract (`contracts/contract.py`):** GenVM storage layout using `TreeMap`, `DynArray`, `bigint`, and sized integers.
- **Unit Test Suite (`tests/test_satlease.py`):** 10 passing unit and integration tests covering all state machine branches.
- **Frontend dApp (`frontend/`):** React 18 + Vite + TypeScript + TailwindCSS "Orbital Mission Control Console".
