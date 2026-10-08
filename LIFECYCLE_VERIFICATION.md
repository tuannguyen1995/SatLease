# 🛰️ SatLease On-Chain Lifecycle Verification & Receipts

**Network:** GenLayer StudioNet (Chain ID: `61999` / `0xF1EF`)  
**Contract Address:** `0x23f456b88fC8e7c965d47866771C28C1FF9C7177`  
**Deployer Address:** `0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`  
**Date of Verification:** 2026-10-08

---

## 1. Deployment & Contract Synchronization

| Parameter | Value |
|---|---|
| **Contract Name** | SatLease (Orbital Satellite Imaging & Earth Observation SLA Escrow) |
| **Contract Address** | `0x23f456b88fC8e7c965d47866771C28C1FF9C7177` |
| **Explorer Link** | [https://explorer-studio.genlayer.com/address/0x23f456b88fC8e7c965d47866771C28C1FF9C7177](https://explorer-studio.genlayer.com/address/0x23f456b88fC8e7c965d47866771C28C1FF9C7177) |

---

## 2. Seeded On-Chain Task #1 Receipt

| Action | `create_imaging_task` |
|---|---|
| **Transaction Hash** | `0xb58cba6837214ed1492ede2c83f0f9a2aa3ac6b01cac911bd15db9a540b29ba3` |
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
| **Step A** | `create_imaging_task` | `0xb6d6d713a6583261652e994794ab9ca6ace694161b33e43db25ee79ecfc77efe` | `5` (FINALIZED) |
| **Step B** | `submit_capture_deliverable` | `0xce0f9eb6c1c72f302a0e8dd4f940a0b556685884cd69f00cc08a4d0a1ba42061` | `5` (FINALIZED) |
| **Step C** | `adjudicate_imaging_sla` | `0x61a30353d3ef8e34914f0278d2f64ae83f1bb6187c2caf7f2155b8035056b4dd` | `5` (FINALIZED) |

### On-Chain AI Remote Sensing Tribunal Ruling for Task #2:
- **Assigned Operator:** `0x1efea75f4d869d14bbcbed30c28285ec525b8c0b`
- **Resulting Lifecycle Status:** `STATUS_AWAITING_PAYOUT` (2 - Active 24-Block Cooling-Off Challenge Window)
- **AI Verdict:** `DEFECTIVE_CLOUD_BREACH`
- **Jury Confidence:** `100%`
- **Measured Cloud Cover:** `0%` (Max SLA: `20%`)
- **Measured GSD Resolution:** `1 cm/px` (Min SLA: `25 cm/px`)
- **Reasoning:** *"Telemetry data contains only smart contract source code and UI boilerplate; no actual STAC metadata or radiometric evidence for the target bounding box was provided for evaluation."*
- **Evidence Hash:** `4469ffabc2960a72...`

