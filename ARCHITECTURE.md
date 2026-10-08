# 🏛️ SatLease Architecture & Economic Security Specification

## 1. Executive Protocol Overview

SatLease is a decentralized Earth Observation (EO) and Remote Sensing SLA escrow protocol deployed on the **GenLayer StudioNet** (Chain ID: `61999` / `0xF1EF`). It enables trustless procurement of Low Earth Orbit (LEO) satellite imagery through autonomous, multi-validator AI consensus.

---

## 2. GenLayer AI Consensus Engine

### Non-Deterministic Telemetry Ingestion (`gl.nondet.web.render`)
Unlike legacy EVM smart contracts, which cannot access off-chain geospatial datasets, SatLease validators fetch SpatioTemporal Asset Catalog (STAC) JSON metadata and processed radiometric optical images directly from public HTTPS endpoints:

```python
raw_meta = gl.nondet.web.render(meta_url, mode="text")
raw_prev = gl.nondet.web.render(prev_url, mode="text")
```

### Deterministic Consensus & Security Canary (`gl.vm.run_nondet`)
To protect against prompt injection, adversarial telemetry tampering, and hallucinations:
1. **XML Data Encapsulation:** Untrusted external telemetry is isolated strictly inside `<satellite_data>` XML containers.
2. **Cryptographic Security Canary:** The prompt strictly demands echo of `CANARY_SAT_LEASE_ORBITAL_V1`. Any validator output lacking or modifying the canary is rejected.
3. **Equivalence Principle:**
```python
def validator_fn(leader_res) -> bool:
    if not isinstance(leader_res, gl.vm.Return):
        return False
    leader = leader_res.calldata
    if leader.get("canary") != CANARY_TOKEN:
        return False
    mine = leader_fn()
    return mine["verdict"] == leader["verdict"] and leader["evidence_hash"] == mine["evidence_hash"]
```

---

## 3. Economic Security & Settlement Matrix

| Verdict | Trigger Condition | Capital Distribution |
|---|---|---|
| `SLA_COMPLIANT_FULL` | Cloud Cover $\le$ `max_cloud` AND GSD $\le$ `min_res` | **100% Escrow Released to Operator** |
| `PARTIAL_USABLE_COMPENSATION` | Cloud Cover between `max_cloud + 1%` and `max_cloud + 15%` | **50% Released to Operator, 50% Refunded to Client** |
| `DEFECTIVE_CLOUD_BREACH` | Cloud Cover $>$ `max_cloud + 15%` OR target coordinates missed | **100% Escrow Refunded to Client** |

### Anti-Griefing Dispute Mechanism
- **24-Block Cooling-off Challenge Window:** After initial AI adjudication, funds remain locked for 24 blocks.
- **10% Appeal Stake:** The appellant must stake a $10\%$ security bond:
  $$\text{Required Bond} = \lfloor \frac{\text{Escrow Amount} \times 10}{100} \rfloor$$
- **Appellate Re-Trial:**
  - If supplemental SAR radar proves ground penetration $\rightarrow$ Appeal Upheld, bond refunded, funds disbursed.
  - If appeal dismissed $\rightarrow$ Bond forfeited to the counterparty as griefing compensation.

---

## 4. Storage Architecture

| Field | Type | Description |
|---|---|---|
| `tasks` | `TreeMap[u64, ImagingTask]` | Keyed mapping of all historical and active imaging tasks |
| `task_ids` | `DynArray[u64]` | Enumerated list of task IDs for indexation |
| `total_imaging_locked` | `bigint` | Cumulative active escrow capital locked in GEN |
| `total_tasks_settled` | `u32` | Number of completed observation tasks |
| `task_counter` | `u64` | Monotonically advancing task counter and block clock |
| `owner` | `Address` | Protocol steward address |
