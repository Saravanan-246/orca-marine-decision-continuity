from src.engines.decision_context_engine import DecisionContextEngine
from src.models.decision_context import DecisionContext

engine = DecisionContextEngine()

def build_context(request: dict) -> DecisionContext:
    return engine.create_context(request)

def revise_context(context: DecisionContext, marine_state: dict, changed_parameter: str) -> DecisionContext:
    return engine.update_context(context, marine_state, changed_parameter)
