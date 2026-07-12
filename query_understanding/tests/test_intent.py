from query_understanding.schemas.models import QueryIntent
from query_understanding.intent.classifier import IntentClassifier

def test_intent_classification():
    classifier = IntentClassifier()
    
    # Egress check query
    intents = classifier.classify_intents("Verify stair width clearances")
    assert QueryIntent.COMPLIANCE_CHECK in intents
    assert QueryIntent.ACCESSIBILITY_REVIEW in intents
    
    # direct lookup query
    intents = classifier.classify_intents("Lookup section 1004.1.2")
    assert QueryIntent.CODE_LOOKUP in intents
    
    # general question query
    intents = classifier.classify_intents("What are the general rules?")
    assert QueryIntent.GENERAL_QUESTION in intents
