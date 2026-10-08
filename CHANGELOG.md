# Changelog

All notable changes to the **SatLease** protocol and application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
