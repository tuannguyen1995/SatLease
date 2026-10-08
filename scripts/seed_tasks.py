#!/usr/bin/env python3
"""
Seed initial live task on GenLayer Studionet for SatLease.
"""

import json
import time
from pathlib import Path
from genlayer_py import create_account, create_client, studionet

PK = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"


def main():
    dep_path = Path(__file__).parent.parent / "deployment.json"
    if not dep_path.exists():
        print("[!] deployment.json not found!")
        return

    with open(dep_path, "r", encoding="utf-8") as f:
        dep = json.load(f)

    contract_addr = dep["contractAddress"]
    print(f"[+] Targeting SatLease Contract: {contract_addr}", flush=True)

    client_acc = create_account(PK)
    client = create_client(chain=studionet, account=client_acc)
    print(f"[+] Task Creator Address: {client_acc.address}", flush=True)

    # Deposit 0.01 GEN (10,000,000,000,000,000 wei)
    deposit_val = 10_000_000_000_000_000

    print("[+] Calling create_imaging_task on-chain...", flush=True)
    try:
        tx_hash = client.write_contract(
            address=contract_addr,
            function_name="create_imaging_task",
            args=["[36.7783, -119.4179, 37.2000, -119.0000]", 15, 30, 6000],
            value=deposit_val,
        )
        print(f"[+] Task Creation Tx Hash: {tx_hash}", flush=True)
        print("[+] Waiting for validator consensus...", flush=True)
        receipt = client.wait_for_transaction_receipt(tx_hash)
        print(f"[+] Receipt Status: {receipt.get('status') or receipt.get('result')}", flush=True)
        print(f"[+] Task ID returned: {receipt.get('return_value') or receipt.get('execution_result')}", flush=True)
    except Exception as e:
        print(f"[!] Seeding error: {e}", flush=True)


if __name__ == "__main__":
    main()
