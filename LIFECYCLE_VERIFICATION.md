# 🛰️ SatLease On-Chain Lifecycle Verification & Receipts

**Network:** GenLayer StudioNet (Chain ID: `61999` / `0xF1EF`)  
**Contract Address:** `0x7d7aD14e9276d612E2A9a6edC0108ECb99649FaD`  
**Deployer Address:** `0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`  
**Date of Verification:** 2026-10-08

---

## 1. Deployment Receipt

| Parameter | Value |
|---|---|
| **Contract Name** | SatLease (Orbital Satellite Imaging & Earth Observation SLA Escrow) |
| **Transaction Hash** | `0x2d54e81b0c0bc63d7d6e65b29758ae813217e20fed4771205926d554b312cb8c` |
| **Receipt Status** | `5` (ACCEPTED / FINALIZED) |
| **Explorer Link** | [https://explorer-studio.genlayer.com/tx/0x2d54e81b0c0bc63d7d6e65b29758ae813217e20fed4771205926d554b312cb8c](https://explorer-studio.genlayer.com/tx/0x2d54e81b0c0bc63d7d6e65b29758ae813217e20fed4771205926d554b312cb8c) |

---

## 2. Seeded On-Chain Task #1 Receipt

| Action | `create_imaging_task` |
|---|---|
| **Transaction Hash** | `0x74f1cdea3140f78df9d44f8192d1093ede254a4391ab2011637119ad562c7d66` |
| **Receipt Status** | `5` (FINALIZED) |
| **Client Address** | `0xf34587a45c397281ef6bdd839d4a1de2dee393ad` |
| **Target Bounding Box** | `[36.7783, -119.4179, 37.2000, -119.0000]` (California Central Valley) |
| **Max Cloud Limit** | `15%` |
| **Required GSD** | `30 cm/pixel` |
| **Escrow Amount** | `0.01 GEN` (`10000000000000000 wei`) |
| **Initial Status** | `0` (`STATUS_TASK_OPEN`) |

---

## 3. Query Verification via RPC (`get_all_tasks`)

```json
[
  {
    "task_id": 1,
    "client": "0xf34587a45c397281ef6bdd839d4a1de2dee393ad",
    "operator": "0x0000000000000000000000000000000000000000",
    "dispute_initiator": "0x0000000000000000000000000000000000000000",
    "escrow_amount": "10000000000000000",
    "dispute_bond": "0",
    "target_bounding_box": "[36.7783, -119.4179, 37.2000, -119.0000]",
    "max_cloud_cover_pct": 15,
    "min_resolution_cm": 30,
    "metadata_url": "",
    "sample_preview_url": "",
    "evidence_hash": "",
    "status": 0,
    "verdict": "PENDING",
    "reason": "Task registered. Awaiting satellite constellation operator to deliver capture logs.",
    "confidence": 0,
    "measured_cloud_cover_pct": 0,
    "measured_resolution_cm": 0,
    "created_at_block": "1",
    "expires_at_block": "6001",
    "audit_completed_block": "0"
  }
]
```
