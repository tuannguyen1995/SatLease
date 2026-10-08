import pytest
import json
from gltest import *


def _to_hex(addr) -> str:
    """Helper to convert test address to lowercase hex."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    if isinstance(addr, bytes):
        return "0x" + addr.hex().lower()
    return str(addr).lower()


def setup_post_message_hook(direct_vm):
    """Intercept cross-contract calls / emit_transfer to track recipient balances in tests."""
    def post_message_hook(vm, request):
        if "PostMessage" in request:
            pm = request["PostMessage"]
            dest_addr = pm["address"]
            value = int(pm.get("value", 0))
            dest_bytes = vm._to_bytes(dest_addr)
            vm._balances[dest_bytes] = vm._balances.get(dest_bytes, 0) + value
            return {"ok": None}
        if "EthSend" in request:
            es = request["EthSend"]
            dest_addr = es.get("to") or es.get("address") or es.get("recipient")
            value = int(es.get("value", 0))
            dest_bytes = vm._to_bytes(dest_addr)
            vm._balances[dest_bytes] = vm._balances.get(dest_bytes, 0) + value
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = post_message_hook


@pytest.fixture
def contract(direct_deploy):
    return direct_deploy("contracts/contract.py")


def test_initial_state(contract, direct_vm, direct_alice):
    """Verify clean initial state on contract deployment."""
    assert contract.get_task_count() == 0
    stats = json.loads(contract.get_stats())
    assert stats["total_tasks"] == 0
    assert stats["total_imaging_locked"] == "0"
    assert stats["total_tasks_settled"] == 0


def test_create_task_validation_errors(contract, direct_vm, direct_alice):
    """Test input validations for create_imaging_task."""
    direct_vm.sender = direct_alice

    # 1. Zero escrow deposit
    direct_vm.value = 0
    with pytest.raises(Exception) as exc:
        contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)
    assert "escrow deposit must be greater than 0" in str(exc.value)

    # 2. Too short bounding box
    direct_vm.value = 1000000000000000000
    with pytest.raises(Exception) as exc:
        contract.create_imaging_task("[0,0]", 15, 30, 6000)
    assert "Valid target bounding box coordinate string required" in str(exc.value)


def test_create_task_and_operator_submission(contract, direct_vm, direct_alice, direct_bob):
    """Client creates task, satellite operator submits telemetry and preview URLs."""
    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000  # 1 GEN

    tid = contract.create_imaging_task(
        "[40.7128, -74.0060, 40.7739, -73.9500]",
        15,  # max cloud 15%
        30,  # min GSD 30cm
        6000
    )
    assert int(tid) == 1
    assert contract.get_task_count() == 1

    t_data = json.loads(contract.get_task(tid))
    assert t_data["client"] == _to_hex(direct_alice)
    assert t_data["status"] == 0  # STATUS_TASK_OPEN
    assert t_data["escrow_amount"] == "1000000000000000000"

    # Client cannot submit their own deliverable (Role violation)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as exc:
        contract.submit_capture_deliverable(
            tid,
            "https://constellation-stac.io/stac.json",
            "https://constellation-stac.io/preview.jpg"
        )
    assert "Client cannot deliver their own satellite imaging task" in str(exc.value)

    # Satellite Operator (Bob) submits deliverable
    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_8912/stac.json",
        "https://constellation-stac.io/passes/orbit_8912/preview.jpg"
    )

    t_after = json.loads(contract.get_task(tid))
    assert t_after["status"] == 1  # STATUS_CAPTURED
    assert t_after["operator"] == _to_hex(direct_bob)


def test_adjudicate_sla_compliant_full(contract, direct_vm, direct_alice, direct_bob):
    """AI Remote Sensing Tribunal evaluates compliant capture (4% cloud <= 15%, 28cm <= 30cm)."""
    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_8912/stac.json",
        "https://constellation-stac.io/passes/orbit_8912/preview.jpg"
    )

    # Mock web responses and LLM adjudication
    direct_vm.mock_web(".*", {"status": 200, "body": "GSD:28cm CLOUD_COVER:0.04 OFF_NADIR:12deg SENSOR:OPTICAL_PAN"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "SLA_COMPLIANT_FULL",
        "confidence": 99,
        "measured_cloud_cover_pct": 4,
        "measured_resolution_cm": 28,
        "reason": "Sub-30cm optical capture verified with pristine nadir angle and 4% cloud fringe."
    }))

    direct_vm.sender = direct_alice
    contract.adjudicate_imaging_sla(tid)

    task_data = json.loads(contract.get_task(tid))
    assert task_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert task_data["verdict"] == "SLA_COMPLIANT_FULL"
    assert task_data["measured_cloud_cover_pct"] == 4
    assert task_data["measured_resolution_cm"] == 28
    assert len(task_data["evidence_hash"]) == 64


def test_adjudicate_defective_cloud_breach(contract, direct_vm, direct_alice, direct_bob):
    """AI Remote Sensing Tribunal evaluates cloud cover breach (65% cloud > 10%)."""
    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    tid = contract.create_imaging_task("[35.6762, 139.6503, 35.7000, 139.7000]", 10, 50, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_9021/stac.json",
        "https://constellation-stac.io/passes/orbit_9021/preview.jpg"
    )

    direct_vm.mock_web(".*", {"status": 200, "body": "CLOUD_COVER:0.65 STATUS:OBSCURED"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "DEFECTIVE_CLOUD_BREACH",
        "confidence": 98,
        "measured_cloud_cover_pct": 65,
        "measured_resolution_cm": 45,
        "reason": "Dense stratus cloud bank obscures 65% of target bounding box."
    }))

    direct_vm.sender = direct_alice
    contract.adjudicate_imaging_sla(tid)

    task_data = json.loads(contract.get_task(tid))
    assert task_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert task_data["verdict"] == "DEFECTIVE_CLOUD_BREACH"
    assert task_data["measured_cloud_cover_pct"] == 65


def test_adjudicate_partial_usable_compensation(contract, direct_vm, direct_alice, direct_bob):
    """AI Remote Sensing Tribunal detects partial fringe cloud (22% cloud between 16% and 30%)."""
    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    tid = contract.create_imaging_task("[51.5074, -0.1278, 51.5200, -0.1100]", 15, 40, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_9100/stac.json",
        "https://constellation-stac.io/passes/orbit_9100/preview.jpg"
    )

    direct_vm.mock_web(".*", {"status": 200, "body": "CLOUD_COVER:0.22 GSD:38cm"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "PARTIAL_USABLE_COMPENSATION",
        "confidence": 92,
        "measured_cloud_cover_pct": 22,
        "measured_resolution_cm": 38,
        "reason": "Marginal cirrus cloud fringe across 22% of periphery; central target usable with optical mask."
    }))

    direct_vm.sender = direct_bob
    contract.adjudicate_imaging_sla(tid)

    task_data = json.loads(contract.get_task(tid))
    assert task_data["status"] == 2
    assert task_data["verdict"] == "PARTIAL_USABLE_COMPENSATION"
    assert task_data["measured_cloud_cover_pct"] == 22


def test_appeal_and_settlement_with_radar_overturn(contract, direct_vm, direct_alice, direct_bob):
    """Operator appeals defective ruling with 10% bond, overturned by SAR radar proof."""
    setup_post_message_hook(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000  # 1 GEN
    tid = contract.create_imaging_task("[48.8566, 2.3522, 48.8700, 2.3700]", 12, 35, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_9200/stac.json",
        "https://constellation-stac.io/passes/orbit_9200/preview.jpg"
    )

    direct_vm.mock_web(".*", {"status": 200, "body": "CLOUD_COVER:0.35"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "DEFECTIVE_CLOUD_BREACH",
        "confidence": 85,
        "measured_cloud_cover_pct": 35,
        "measured_resolution_cm": 34,
        "reason": "Optical cloud cover measured at 35% exceeding 12% SLA limit."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Bob stakes 10% dispute bond (0.1 GEN) to appeal
    direct_vm.sender = direct_bob
    direct_vm.value = 100000000000000000  # 0.1 GEN
    contract.appeal_verdict(
        tid,
        "Secondary SAR radar channel confirms clear surface penetration despite light cloud cover."
    )

    t_disputed = json.loads(contract.get_task(tid))
    assert t_disputed["status"] == 6  # STATUS_DISPUTED
    assert t_disputed["dispute_initiator"] == _to_hex(direct_bob)
    assert t_disputed["dispute_bond"] == "100000000000000000"

    # Clear prior adjudication mocks and set appellate Space Chamber mocks
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*radar_audit.*", {"status": 200, "body": "SAR_RADAR_CLEAR:100% VISIBILITY"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_UPHELD_COMPLIANT",
        "reason": "Multispectral SAR radar synthesis proves 100% surface visibility with zero cloud attenuation."
    }))

    contract.adjudicate_appeal(tid, "https://constellation-sar.io/passes/orbit_9200/radar_audit.json")

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 3  # STATUS_SETTLED_COMPLIANT
    assert t_settled["verdict"] == "SLA_COMPLIANT_FULL"
    assert t_settled["escrow_amount"] == "0"
    assert t_settled["dispute_bond"] == "0"


def test_finalize_settlement_after_cooling_off(contract, direct_vm, direct_alice, direct_bob):
    """Finalizing settlement payout after cooling-off period elapses (>24 blocks)."""
    setup_post_message_hook(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/stac.json",
        "https://constellation-stac.io/preview.jpg"
    )

    direct_vm.mock_web(".*", {"status": 200, "body": "CLEAR"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "SLA_COMPLIANT_FULL",
        "confidence": 99,
        "measured_cloud_cover_pct": 5,
        "measured_resolution_cm": 25,
        "reason": "Pristine observation."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Immediately trying to finalize during cooling-off window must raise error
    with pytest.raises(Exception) as exc:
        contract.finalize_settlement(tid)
    assert "Cooling-off challenge window is still active" in str(exc.value)

    # Advance task_counter by creating 25 dummy tasks to exceed cooling-off window (24 blocks)
    for i in range(25):
        direct_vm.sender = direct_alice
        direct_vm.value = 1000000
        contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    # Now cooling-off expired -> finalize settlement
    direct_vm.sender = direct_bob
    contract.finalize_settlement(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 3  # STATUS_SETTLED_COMPLIANT
    assert t_settled["escrow_amount"] == "0"


def test_cancel_or_reclaim_lifecycle(contract, direct_vm, direct_alice):
    """Client reclaims funds when task duration expired."""
    setup_post_message_hook(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    # Set short duration: 5 blocks
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 5)

    # Attempting to cancel before expiration fails
    with pytest.raises(Exception) as exc:
        contract.cancel_or_reclaim(tid)
    assert "Task capture duration has not expired" in str(exc.value)

    # Advance blocks beyond duration
    for _ in range(6):
        direct_vm.value = 10000
        contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    # Now reclaim succeeds
    contract.cancel_or_reclaim(tid)
    t_reclaimed = json.loads(contract.get_task(tid))
    assert t_reclaimed["status"] == 7  # STATUS_CANCELLED
    assert t_reclaimed["verdict"] == "CANCELLED"


def test_appeal_dismissed_forfeits_bond(contract, direct_vm, direct_alice, direct_bob):
    """If appeal is dismissed, bond is forfeited to the counterparty (client)."""
    setup_post_message_hook(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000  # 1 GEN
    tid = contract.create_imaging_task("[35.6762, 139.6503, 35.7000, 139.7000]", 10, 50, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_9021/stac.json",
        "https://constellation-stac.io/passes/orbit_9021/preview.jpg"
    )

    direct_vm.clear_mocks()
    direct_vm.mock_web(".*", {"status": 200, "body": "CLOUD_COVER:0.65"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "DEFECTIVE_CLOUD_BREACH",
        "confidence": 98,
        "measured_cloud_cover_pct": 65,
        "measured_resolution_cm": 45,
        "reason": "Dense cloud bank."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Bob appeals
    direct_vm.sender = direct_bob
    direct_vm.value = 100000000000000000  # 0.1 GEN bond
    contract.appeal_verdict(tid, "Claiming clouds were thin cirrus.")

    # Appellate chamber dismisses appeal
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*", {"status": 200, "body": "OVERCAST_CONFIRMED"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_DISMISSED",
        "reason": "Supplemental review confirms target ground completely obscured."
    }))
    contract.adjudicate_appeal(tid, "https://weather-audit.com/data.json")

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 4  # STATUS_SETTLED_DEFECTIVE
    assert t_settled["verdict"] == "DEFECTIVE_CLOUD_BREACH"
    assert t_settled["dispute_bond"] == "0"

