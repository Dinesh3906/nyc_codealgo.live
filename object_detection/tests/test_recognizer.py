from document_ingestion.models import Page as IngestionPage, PDFType
from object_detection.symbols.recognizer import SymbolRecognizerEngine

def test_symbol_recognition(mock_semantic_document):
    recognizer = SymbolRecognizerEngine()
    sem_page = mock_semantic_document.pages[0]
    
    page = IngestionPage(
        index=0, width=800.0, height=600.0, dpi=300, page_type=PDFType.VECTOR,
        text_objects=sem_page.metadata["text_objects"],
        geometry_objects=[]
    )

    # Extract legend map from page
    legend_symbols = {}
    for leg in sem_page.legends:
        legend_symbols.update(leg.abbreviation_dictionary)

    symbols = recognizer.recognize_symbols(page, legend_symbols, 0)
    
    # "SD" in text matches "SD" abbreviation -> SMOKE_DETECTOR class
    assert len(symbols) == 1
    assert symbols[0].object_class == "SMOKE_DETECTOR"
    assert symbols[0].attributes["label"] == "SD"
