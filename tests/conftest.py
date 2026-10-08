import pytest
import sys
import json
import gltest.direct.loader as _gl_loader
import gltest.direct.pytest_plugin as _gl_plugin

_orig_deploy = _gl_loader.deploy_contract
_orig_load_module = _gl_loader._load_module


def _patch_genlayer_gl():
    if "genlayer.gl" in sys.modules:
        gl_mod = sys.modules["genlayer.gl"]
        import genlayer.gl.vm as _vm
        setattr(gl_mod, "UserError", _vm.UserError)
    if "genlayer" in sys.modules:
        gl_pkg = sys.modules["genlayer"]
        if hasattr(gl_pkg, "gl"):
            import genlayer.gl.vm as _vm
            setattr(gl_pkg.gl, "UserError", _vm.UserError)


def _patched_load_module(contract_path):
    mod = _orig_load_module(contract_path)
    _patch_genlayer_gl()
    if hasattr(mod, "gl"):
        import genlayer.gl.vm as _vm
        setattr(mod.gl, "UserError", _vm.UserError)
    return mod


def _patched_deploy(*args, **kwargs):
    instance = _orig_deploy(*args, **kwargs)
    _patch_genlayer_gl()
    if hasattr(instance, "__class__"):
        mod = sys.modules.get(instance.__class__.__module__)
        if mod and hasattr(mod, "gl"):
            import genlayer.gl.vm as _vm
            setattr(mod.gl, "UserError", _vm.UserError)
    return instance


_gl_loader._load_module = _patched_load_module
_gl_loader.deploy_contract = _patched_deploy
_gl_plugin.deploy_contract = _patched_deploy


def clear_known_contracts():
    """Reset genlayer internal known contract registry between test cases."""
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)


@pytest.fixture(autouse=True)
def reset_contracts():
    clear_known_contracts()
    yield
    clear_known_contracts()
