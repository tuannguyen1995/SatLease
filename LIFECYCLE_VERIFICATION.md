# 🛰️ SatLease On-Chain Lifecycle Verification & Receipts

**Network:** GenLayer StudioNet (Chain ID: `61999` / `0xF1EF`)  
**Contract Address:** `0x9C9fEFA5dc80839E1430B188A12B309632cE7753`  
**Deployer Address:** `0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`  
**Date of Verification:** 2026-10-08

---

## 1. Deployment Receipt

| Parameter | Value |
|---|---|
| **Contract Name** | SatLease (Orbital Satellite Imaging & Earth Observation SLA Escrow) |
| **Transaction Hash** | `0xbe4e4521d474e91c372d7681506a658f82fc44c4a54113f43cebe3b50dd5c057` |
| **Receipt Status** | `5` (ACCEPTED / FINALIZED) |
| **Explorer Link** | [https://explorer-studio.genlayer.com/tx/0xbe4e4521d474e91c372d7681506a658f82fc44c4a54113f43cebe3b50dd5c057](https://explorer-studio.genlayer.com/tx/0xbe4e4521d474e91c372d7681506a658f82fc44c4a54113f43cebe3b50dd5c057) |

---

## 2. Seeded On-Chain Task #1 Receipt

| Action | `create_imaging_task` |
|---|---|
| **Transaction Hash** | `0x2caf85d1111c03b6b6bf00ecd3e35489a6209dd21cd47fb03bdb8c092b1c3f35` |
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
