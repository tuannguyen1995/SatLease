# 🛰️ SatLease On-Chain Lifecycle Verification & Receipts

**Network:** GenLayer StudioNet (Chain ID: `61999` / `0xF1EF`)  
**Contract Address:** `0xA674dD8b7Ba836cae69b4D4c42113a3CEECB8cC7`  
**Deployer Address:** `0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`  
**Date of Verification:** 2026-10-08

---

## 1. Deployment & Contract Synchronization

| Parameter | Value |
|---|---|
| **Contract Name** | SatLease (Orbital Satellite Imaging & Earth Observation SLA Escrow) |
| **Contract Address** | `0xA674dD8b7Ba836cae69b4D4c42113a3CEECB8cC7` |
| **Explorer Link** | [https://explorer-studio.genlayer.com/address/0xA674dD8b7Ba836cae69b4D4c42113a3CEECB8cC7](https://explorer-studio.genlayer.com/address/0xA674dD8b7Ba836cae69b4D4c42113a3CEECB8cC7) |

---

## 2. Seeded On-Chain Task #1 Receipt

| Action | `create_imaging_task` |
|---|---|
| **Transaction Hash** | `0x884eb67a1194ee543e5d5901411d4490f9a9fd65aec5f08738749a0ef00a36c7` |
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

---

## 4. Live Automated End-to-End Test Receipt (Task #2 Full Lifecycle)

| Step | Action | Tx Hash | Status |
|---|---|---|---|
| **Step A** | `create_imaging_task` | `0x5d807be19c9ce5a53697ca6bd755564dd6fd5a77b34b801ca5b7e96ab1946662` | `5` (FINALIZED) |
| **Step B** | `submit_capture_deliverable` | `0xd0e2e11b206cb70d07067d26c22df33aefcea6aac5069ee40081ae4a3ba34184` | `5` (FINALIZED) |
| **Step C** | `adjudicate_imaging_sla` | `0x988317e0e7c0000f13529f9d94fa1d9eb844b0b528f53efc8fb65eeba3847928` | `5` (FINALIZED) |

### On-Chain AI Remote Sensing Tribunal Ruling for Task #2:
- **Assigned Operator:** `0x1f535115f03211c7d55ce1e13be4ddf43d0faaf0`
- **Resulting Lifecycle Status:** `STATUS_AWAITING_PAYOUT` (2 - Active 24-Block Cooling-Off Challenge Window)
- **AI Verdict:** `DEFECTIVE_CLOUD_BREACH`
- **Jury Confidence:** `95%`
- **Measured Cloud Cover:** `100%` (Max SLA: `20%`)
- **Measured GSD Resolution:** `9999 cm/px` (Min SLA: `25 cm/px`)
- **Reasoning:** *"Untrusted telemetry contains no actual orbital image metrics; only contract/UI text. Cloud cover and GSD cannot be verified, so deliverable is non-compliant."*
- **Evidence Hash:** `4469ffabc2960a72...`

