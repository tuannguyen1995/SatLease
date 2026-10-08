#!/usr/bin/env python3
"""
Deploy SatLease Intelligent Contract to GenLayer Studionet (Chain 61999).
RPC: https://studio.genlayer.com/api
"""

import os
import sys
import json
import re
import time
from pathlib import Path
from genlayer_py import create_client, create_account, studionet

PK = os.environ.get("DEPLOYER_PRIVATE_KEY", "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef").strip()


def deploy():
    print("=" * 70, flush=True)
    print("   Deploying SatLease to GenLayer Studionet (Chain 61999)   ", flush=True)
    print("=" * 70, flush=True)

    account = create_account(PK)
    client = create_client(chain=studionet, account=account)
    print(f"[+] Deployer Address: {account.address}", flush=True)
    bal = client.get_balance(account.address)
    print(f"[+] Deployer Balance: {bal / 1e18} GEN", flush=True)

    contract_path = Path(__file__).parent.parent / "contracts" / "contract.py"
    print(f"[+] Reading contract from: {contract_path}", flush=True)
    with open(contract_path, "r", encoding="utf-8") as f:
        contract_code = f.read()

    print("[+] Submitting deploy_contract transaction to Studionet...", flush=True)
    tx_hash = None
    for attempt in range(1, 4):
        try:
            tx_hash = client.deploy_contract(
                code=contract_code,
                account=account,
                args=[],
                leader_only=False
            )
            break
        except Exception as e:
            print(f"[!] Attempt {attempt} failed: {e}. Retrying in 5s...", flush=True)
            time.sleep(5)

    if not tx_hash:
        print("[!] All deployment attempts failed.", flush=True)
        return None

    print(f"[+] Deployment Transaction Hash: {tx_hash}", flush=True)
    print("[+] Waiting for validator consensus and block receipt...", flush=True)

    receipt = client.wait_for_transaction_receipt(tx_hash)
    contract_address = receipt.get("contract_address") or receipt.get("recipient")
    status = receipt.get("status") or receipt.get("result")

    print("\n" + "=" * 70)
    print("          DEPLOYMENT CONFIRMED ON GENLAYER STUDIONET             ")
    print("=" * 70)
    print(f"Contract Address : {contract_address}")
    print(f"Transaction Hash : {tx_hash}")
    print(f"Receipt Status   : {status}")
    print("=" * 70 + "\n")

    if not contract_address:
        print("[!] Warning: Could not find contract_address in receipt. Receipt dump:", flush=True)
        print(receipt, flush=True)
        return None

    # 1. Update deployment.json
    dep_file = Path(__file__).parent.parent / "deployment.json"
    output_info = {
        "network": "studionet",
        "chainId": 61999,
        "chainIdHex": "0xF22F",
        "rpcUrl": "https://studio.genlayer.com/api",
        "contractAddress": contract_address,
        "transactionHash": tx_hash,
        "deployerAddress": account.address,
        "status": str(status),
        "deployedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(dep_file, "w", encoding="utf-8") as f:
        json.dump(output_info, f, indent=2)
    print(f"[+] Saved deployment details to {dep_file}")

    # 2. Update frontend/.env if exists
    env_file = Path(__file__).parent.parent / "frontend" / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            env_content = f.read()
        env_content = re.sub(r"VITE_CONTRACT_ADDRESS=.*", f"VITE_CONTRACT_ADDRESS={contract_address}", env_content)
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_content)
        print(f"[+] Updated frontend/.env with {contract_address}")

    # 3. Update frontend/src/config/genlayer.ts if exists
    genlayer_ts = Path(__file__).parent.parent / "frontend" / "src" / "config" / "genlayer.ts"
    if genlayer_ts.exists():
        with open(genlayer_ts, "r", encoding="utf-8") as f:
            ts_content = f.read()
        ts_content = re.sub(
            r'DEFAULT_CONTRACT_ADDRESS\s*=\s*["\']0x[0-9a-fA-F]{40}["\']',
            f'DEFAULT_CONTRACT_ADDRESS = "{contract_address}"',
            ts_content
        )
        with open(genlayer_ts, "w", encoding="utf-8") as f:
            f.write(ts_content)
        print(f"[+] Updated frontend/src/config/genlayer.ts with {contract_address}")

    return contract_address


if __name__ == "__main__":
    deploy()
