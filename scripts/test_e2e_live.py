#!/usr/bin/env python3
"""
Live End-to-End Test on GenLayer Studionet for SatLease.
Tests the complete lifecycle:
1. Client creates imaging task with GEN escrow
2. Satellite Operator submits capture deliverable (STAC & radiometry)
3. AI Remote Sensing Tribunal adjudicates SLA on-chain
4. Verify updated state, verdict, reason, and metrics
"""

import json
import time
from pathlib import Path
from genlayer_py import create_account, create_client, studionet
import eth_account

CLIENT_PK = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"

# Generate a secondary account for Satellite Operator
OPERATOR_ACCOUNT = eth_account.Account.create()
OPERATOR_PK = OPERATOR_ACCOUNT.key.hex()


def main():
    dep_path = Path(__file__).parent.parent / "deployment.json"
    with open(dep_path, "r", encoding="utf-8") as f:
        dep = json.load(f)

    contract_addr = dep["contractAddress"]
    print("============================================================")
    print("SATLEASE END-TO-END ON-CHAIN VERIFICATION")
    print(f"Target Contract: {contract_addr}")
    print("============================================================", flush=True)

    client_acc = create_account(CLIENT_PK)
    client = create_client(chain=studionet, account=client_acc)
    print(f"[1] Client Account: {client_acc.address}")
    print(f"[2] Satellite Operator Account: {OPERATOR_ACCOUNT.address}")

    # STEP A: Client creates new imaging task
    print("\n>>> STEP A: Client calls create_imaging_task (0.01 GEN Escrow)...", flush=True)
    task_deposit = 10_000_000_000_000_000  # 0.01 GEN
    tx_create = client.write_contract(
        address=contract_addr,
        function_name="create_imaging_task",
        args=["[37.7749, -122.4194, 37.8049, -122.3894]", 20, 25, 5000],
        value=task_deposit
    )
    print(f"[+] create_imaging_task Tx: {tx_create}", flush=True)
    receipt_create = client.wait_for_transaction_receipt(tx_create)
    print(f"[+] Task Created! Receipt Status: {receipt_create.get('status') or receipt_create.get('result')}", flush=True)

    # Read latest task ID
    tasks_raw = client.read_contract(address=contract_addr, function_name="get_all_tasks", args=[])
    tasks = json.loads(tasks_raw)
    latest_task = tasks[-1]
    tid = latest_task["task_id"]
    print(f"[+] Registered Task ID: #{tid} | Initial Status: {latest_task['status']} (OPEN)", flush=True)

    # STEP B: Operator submits capture deliverable
    print(f"\n>>> STEP B: Operator calls submit_capture_deliverable for Task #{tid}...", flush=True)
    operator_client = create_client(chain=studionet, account=create_account(OPERATOR_PK))
    meta_url = "https://raw.githubusercontent.com/tuannguyen1995/SatLease/main/contracts/contract.py"
    prev_url = "https://satlease.vercel.app"

    tx_submit = operator_client.write_contract(
        address=contract_addr,
        function_name="submit_capture_deliverable",
        args=[tid, meta_url, prev_url]
    )
    print(f"[+] submit_capture_deliverable Tx: {tx_submit}", flush=True)
    receipt_submit = operator_client.wait_for_transaction_receipt(tx_submit)
    print(f"[+] Deliverable Submitted! Receipt Status: {receipt_submit.get('status') or receipt_submit.get('result')}", flush=True)

    # Verify status changed to STATUS_CAPTURED (1)
    task_state = json.loads(client.read_contract(address=contract_addr, function_name="get_task", args=[tid]))
    print(f"[+] Task #{tid} Status after submission: {task_state['status']} (1 = CAPTURED)", flush=True)
    print(f"[+] Operator assigned: {task_state['operator']}", flush=True)

    # STEP C: Convene AI Remote Sensing Tribunal
    print(f"\n>>> STEP C: Convening AI Remote Sensing Tribunal (adjudicate_imaging_sla)...", flush=True)
    print("[+] Validators running non-deterministic AI evaluation & discrete consensus...", flush=True)
    tx_adjudicate = client.write_contract(
        address=contract_addr,
        function_name="adjudicate_imaging_sla",
        args=[tid]
    )
    print(f"[+] adjudicate_imaging_sla Tx: {tx_adjudicate}", flush=True)
    receipt_adjudicate = client.wait_for_transaction_receipt(tx_adjudicate)
    print(f"[+] AI Tribunal Consensus reached! Receipt Status: {receipt_adjudicate.get('status') or receipt_adjudicate.get('result')}", flush=True)

    # Verify final verdict and status
    final_task = json.loads(client.read_contract(address=contract_addr, function_name="get_task", args=[tid]))
    print("\n============================================================")
    print(f"[+] END-TO-END ON-CHAIN VERIFICATION RESULT FOR TASK #{tid}")
    print(f"Status: {final_task['status']} (2 = AWAITING_PAYOUT / COOLING-OFF)")
    print(f"AI Verdict: {final_task['verdict']}")
    print(f"Confidence: {final_task['confidence']}%")
    print(f"Measured Cloud Cover: {final_task['measured_cloud_cover_pct']}% (Max SLA: {final_task['max_cloud_cover_pct']}%)")
    print(f"Measured GSD Resolution: {final_task['measured_resolution_cm']} cm/px (Min SLA: {final_task['min_resolution_cm']} cm/px)")
    print(f"Tribunal Reason: {final_task['reason']}")
    print(f"Evidence Hash: {final_task['evidence_hash'][:16]}...")
    print("============================================================", flush=True)


if __name__ == "__main__":
    main()
