import pytest
import json
from datetime import datetime, timezone, timedelta
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


def get_balance(direct_vm, addr) -> int:
    dest_bytes = direct_vm._to_bytes(addr)
    return direct_vm._balances.get(dest_bytes, 0)


@pytest.fixture
def contract(direct_deploy, direct_vm):
    # Initialize a clean starting ISO datetime
    direct_vm.warp("2026-10-10T12:00:00+00:00")
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
    direct_vm.warp("2026-10-10T12:00:00+00:00")
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
    direct_vm.warp("2026-10-10T12:00:00+00:00")
    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/passes/orbit_8912/stac.json",
        "https://constellation-stac.io/passes/orbit_8912/preview.jpg"
    )

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
    direct_vm.warp("2026-10-10T12:00:00+00:00")
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
    direct_vm.warp("2026-10-10T12:00:00+00:00")
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
    """Operator appeals defective ruling with 10% bond and bound radar evidence, overturned by SAR."""
    setup_post_message_hook(direct_vm)
    direct_vm.warp("2026-10-10T12:00:00+00:00")

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

    # Bob stakes 10% dispute bond (0.1 GEN) and permanently binds supplemental evidence URL
    direct_vm.sender = direct_bob
    direct_vm.value = 100000000000000000  # 0.1 GEN
    contract.appeal_verdict(
        tid,
        "Secondary SAR radar channel confirms clear surface penetration despite light cloud cover.",
        "https://constellation-sar.io/passes/orbit_9200/radar_audit.json"
    )

    t_disputed = json.loads(contract.get_task(tid))
    assert t_disputed["status"] == 6  # STATUS_DISPUTED
    assert t_disputed["dispute_initiator"] == _to_hex(direct_bob)
    assert t_disputed["dispute_bond"] == "100000000000000000"
    assert t_disputed["supplemental_evidence_url"] == "https://constellation-sar.io/passes/orbit_9200/radar_audit.json"

    # Appellate Space Chamber evaluates strictly the bound evidence URL
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*radar_audit.*", {"status": 200, "body": "SAR_RADAR_CLEAR:100% VISIBILITY"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_UPHELD_COMPLIANT",
        "reason": "Multispectral SAR radar synthesis proves 100% surface visibility with zero cloud attenuation."
    }))

    contract.adjudicate_appeal(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 3  # STATUS_SETTLED_COMPLIANT
    assert t_settled["verdict"] == "SLA_COMPLIANT_FULL"
    assert t_settled["escrow_amount"] == "0"
    assert t_settled["dispute_bond"] == "0"

    # Bob receives 100% escrow (1 GEN) + 100% dispute bond refunded (0.1 GEN) = 1.1 GEN
    assert get_balance(direct_vm, direct_bob) == 1100000000000000000


def test_appeal_dismissed_forfeits_bond(contract, direct_vm, direct_alice, direct_bob):
    """If appeal is dismissed, bond is forfeited to the counterparty (client)."""
    setup_post_message_hook(direct_vm)
    direct_vm.warp("2026-10-10T12:00:00+00:00")

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

    # Bob appeals with bound URL
    direct_vm.sender = direct_bob
    direct_vm.value = 100000000000000000  # 0.1 GEN bond
    contract.appeal_verdict(
        tid,
        "Claiming clouds were thin cirrus.",
        "https://weather-audit.com/data.json"
    )

    # Appellate chamber dismisses appeal
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*", {"status": 200, "body": "OVERCAST_CONFIRMED"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_DISMISSED",
        "reason": "Supplemental review confirms target ground completely obscured."
    }))
    contract.adjudicate_appeal(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 4  # STATUS_SETTLED_DEFECTIVE
    assert t_settled["verdict"] == "DEFECTIVE_CLOUD_BREACH"
    assert t_settled["dispute_bond"] == "0"

    # Client (Alice) receives 100% escrow (1 GEN) + forfeited bond (0.1 GEN) = 1.1 GEN
    assert get_balance(direct_vm, direct_alice) == 1100000000000000000


def test_cooling_off_cannot_be_advanced_by_task_creation(contract, direct_vm, direct_alice, direct_bob):
    """
    Focused test addressing Steward requirement:
    Proves that spamming or creating unrelated tasks CANNOT advance cooling-off window or expiry deadlines.
    """
    setup_post_message_hook(direct_vm)
    start_time = datetime(2026, 10, 10, 12, 0, 0, tzinfo=timezone.utc)
    direct_vm.warp(start_time.isoformat())

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

    # 1. Immediately attempting to finalize during active cooling-off window reverts
    with pytest.raises(Exception) as exc:
        contract.finalize_settlement(tid)
    assert "Cooling-off challenge window" in str(exc.value)

    # 2. Attacker creates 50 new tasks to try to mutate counter and advance deadlines
    for i in range(50):
        direct_vm.sender = direct_alice
        direct_vm.value = 1000000
        contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    # Finalize STILL reverts because chain timestamp has not advanced!
    with pytest.raises(Exception) as exc:
        contract.finalize_settlement(tid)
    assert "Cooling-off challenge window" in str(exc.value)

    # 3. Only when chain timestamp actually elapses past cooling-off (>72 seconds), settlement matures
    direct_vm.warp((start_time + timedelta(seconds=75)).isoformat())

    direct_vm.sender = direct_bob
    contract.finalize_settlement(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 3  # STATUS_SETTLED_COMPLIANT
    assert t_settled["escrow_amount"] == "0"
    assert get_balance(direct_vm, direct_bob) == 1000000000000000000


def test_expiry_cannot_be_advanced_by_task_creation(contract, direct_vm, direct_alice):
    """
    Focused test addressing Steward requirement:
    Proves that task capture duration expiry relies on chain time and cannot be artificially expired by task creation.
    """
    setup_post_message_hook(direct_vm)
    start_time = datetime(2026, 10, 10, 12, 0, 0, tzinfo=timezone.utc)
    direct_vm.warp(start_time.isoformat())

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000
    # Set short duration: 10 blocks = 30 seconds
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 10)

    # Attempting to cancel immediately fails
    with pytest.raises(Exception) as exc:
        contract.cancel_or_reclaim(tid)
    assert "Task capture duration has not expired" in str(exc.value)

    # Creating 30 new tasks does NOT expire the task
    for _ in range(30):
        direct_vm.value = 10000
        contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    with pytest.raises(Exception) as exc:
        contract.cancel_or_reclaim(tid)
    assert "Task capture duration has not expired" in str(exc.value)

    # Warp past duration (35 seconds > 30 seconds)
    direct_vm.warp((start_time + timedelta(seconds=35)).isoformat())

    contract.cancel_or_reclaim(tid)
    t_reclaimed = json.loads(contract.get_task(tid))
    assert t_reclaimed["status"] == 7  # STATUS_CANCELLED
    assert get_balance(direct_vm, direct_alice) == 1000000000000000000


def test_client_appeals_compliant_verdict_and_wins(contract, direct_vm, direct_alice, direct_bob):
    """
    Focused test addressing Steward requirement:
    Client appeals a compliant verdict with 10% bond and proves defect -> Client receives escrow + bond back.
    """
    setup_post_message_hook(direct_vm)
    direct_vm.warp("2026-10-10T12:00:00+00:00")

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000000  # 1 GEN
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/stac.json",
        "https://constellation-stac.io/preview.jpg"
    )

    # Initial AI verdict: erroneously compliant
    direct_vm.mock_web(".*", {"status": 200, "body": "GSD:25cm CLOUD_COVER:0.05"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "SLA_COMPLIANT_FULL",
        "confidence": 90,
        "measured_cloud_cover_pct": 5,
        "measured_resolution_cm": 25,
        "reason": "Appears compliant."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Client (Alice) appeals and stakes 10% bond (0.1 GEN) with ground camera proof
    direct_vm.sender = direct_alice
    direct_vm.value = 100000000000000000
    contract.appeal_verdict(
        tid,
        "Ground observation cameras confirm heavy localized fog covered entire target area.",
        "https://ground-cameras.org/california_fog.json"
    )

    t_task = json.loads(contract.get_task(tid))
    assert t_task["status"] == 6  # DISPUTED
    assert t_task["dispute_initiator"] == _to_hex(direct_alice)

    # Supreme Space Chamber upholds client's appeal as defective
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*ground-cameras.*", {"status": 200, "body": "FOG_CONFIRMED:100%_OBSCURED"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_UPHELD_DEFECTIVE",
        "reason": "Independent ground telemetry confirms heavy stratus fog obscured agricultural target."
    }))
    contract.adjudicate_appeal(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 4  # STATUS_SETTLED_DEFECTIVE
    assert t_settled["verdict"] == "DEFECTIVE_CLOUD_BREACH"

    # Alice gets 100% escrow back (1 GEN) + 100% dispute bond refunded (0.1 GEN) = 1.1 GEN
    assert get_balance(direct_vm, direct_alice) == 1100000000000000000
    # Bob gets 0
    assert get_balance(direct_vm, direct_bob) == 0


def test_client_appeals_compliant_verdict_and_dismissed(contract, direct_vm, direct_alice, direct_bob):
    """
    Focused test addressing Steward requirement:
    Client appeals a compliant verdict without merit -> Dismissed -> Operator gets escrow + forfeited bond.
    """
    setup_post_message_hook(direct_vm)
    direct_vm.warp("2026-10-10T12:00:00+00:00")

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
        "reason": "Pristine."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Client files frivolous appeal
    direct_vm.sender = direct_alice
    direct_vm.value = 100000000000000000
    contract.appeal_verdict(
        tid,
        "Frivolous dispute: I changed my mind and want a refund.",
        "https://frivolous.org/evidence.json"
    )

    # Appellate Chamber dismisses appeal
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*", {"status": 200, "body": "IRRELEVANT"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_DISMISSED",
        "reason": "Prior compliant observation confirmed; client appeal is baseless."
    }))
    contract.adjudicate_appeal(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 3  # STATUS_SETTLED_COMPLIANT
    assert t_settled["verdict"] == "SLA_COMPLIANT_FULL"

    # Bob gets 100% escrow (1 GEN) + Alice's forfeited bond (0.1 GEN) = 1.1 GEN
    assert get_balance(direct_vm, direct_bob) == 1100000000000000000
    assert get_balance(direct_vm, direct_alice) == 0


def test_appeal_reaches_partial_compromise_split(contract, direct_vm, direct_alice, direct_bob):
    """
    Focused test addressing Steward requirement:
    Appeal results in partial compensation (50/50 fair split) -> Solvency preserved to the wei.
    """
    setup_post_message_hook(direct_vm)
    direct_vm.warp("2026-10-10T12:00:00+00:00")

    direct_vm.sender = direct_alice
    direct_vm.value = 1000000000000000001  # 1 GEN + 1 wei (odd number to test solvency preservation)
    tid = contract.create_imaging_task("[40.7128, -74.0060, 40.7739, -73.9500]", 15, 30, 6000)

    direct_vm.sender = direct_bob
    contract.submit_capture_deliverable(
        tid,
        "https://constellation-stac.io/stac.json",
        "https://constellation-stac.io/preview.jpg"
    )

    # Erroneous defective ruling
    direct_vm.mock_web(".*", {"status": 200, "body": "CLOUD"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "DEFECTIVE_CLOUD_BREACH",
        "confidence": 80,
        "measured_cloud_cover_pct": 35,
        "measured_resolution_cm": 30,
        "reason": "Cloudy."
    }))
    contract.adjudicate_imaging_sla(tid)

    # Bob appeals
    direct_vm.sender = direct_bob
    direct_vm.value = 100000000000000000  # 0.1 GEN
    contract.appeal_verdict(
        tid,
        "Image was fringe clouds, center is perfectly usable.",
        "https://partial-evidence.io/cloud_mask.json"
    )

    # Supreme Chamber finds partial utility (50/50)
    direct_vm.clear_mocks()
    direct_vm.mock_web(".*", {"status": 200, "body": "MASK_USABLE"})
    direct_vm.mock_llm(".*", json.dumps({
        "canary": "CANARY_SAT_LEASE_ORBITAL_V1",
        "verdict": "APPEAL_UPHELD_PARTIAL",
        "reason": "Partial cloud fringe confirmed; usable with masking."
    }))
    contract.adjudicate_appeal(tid)

    t_settled = json.loads(contract.get_task(tid))
    assert t_settled["status"] == 5  # STATUS_SETTLED_PARTIAL
    assert t_settled["verdict"] == "PARTIAL_USABLE_COMPENSATION"

    # Total escrow: 1_000_000_000_000_000_001
    # Payout = 500_000_000_000_000_000
    # Refund = 500_000_000_000_000_001
    # Bob (appellant successfully moved defective to partial) gets bond refunded (100_000_000_000_000_000)
    assert get_balance(direct_vm, direct_bob) == 500_000_000_000_000_000 + 100_000_000_000_000_000
    assert get_balance(direct_vm, direct_alice) == 500_000_000_000_000_001
    # Total disbursed matches initial escrow + bond exactly: Solvency Invariant preserved!
    total_disbursed = get_balance(direct_vm, direct_bob) + get_balance(direct_vm, direct_alice)
    assert total_disbursed == 1000000000000000001 + 100000000000000000
