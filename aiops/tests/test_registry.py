import pytest
from aiops.registry.manager import RegistryManager
from aiops.schemas.models import ModelEntry, PromptEntry

def test_list_registries():
    manager = RegistryManager()
    
    assert len(manager.list_models()) == 3
    assert len(manager.list_prompts()) == 2

def test_model_registration():
    manager = RegistryManager()
    
    new_model = ModelEntry(
        model_name="yolov9-stair-detector", version="v1.0.0", owner="Vision",
        approval_status="CANARY", description="Canary test weights",
        last_tested="2026-07-11T12:00:00Z"
    )
    
    manager.register_model(new_model)
    assert len(manager.list_models()) == 4
    assert manager.list_models()[-1].model_name == "yolov9-stair-detector"

def test_prompt_version_roll():
    manager = RegistryManager()
    
    new_prompt = PromptEntry(
        prompt_id="prompt-compliance-reasoning", version="v1.5",
        template="Analyze {context} with updated limits",
        active=True, creator="Lead Dev", avg_user_accuracy=0.99
    )
    
    manager.register_prompt(new_prompt)
    
    prompts = manager.list_prompts()
    assert len(prompts) == 3
    
    # Version v1.4 of prompt-compliance-reasoning should be marked inactive (active=False)
    inactive_v1_4 = [p for p in prompts if p.prompt_id == "prompt-compliance-reasoning" and p.version == "v1.4"][0]
    assert inactive_v1_4.active is False
    
    # Version v1.5 should be active
    active_v1_5 = [p for p in prompts if p.prompt_id == "prompt-compliance-reasoning" and p.version == "v1.5"][0]
    assert active_v1_5.active is True
