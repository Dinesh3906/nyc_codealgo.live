import numpy as np
from typing import List, Dict, Any
from ..config import settings

class ColbertEngine:
    """
    Simulates ColBERTv2 Late Interaction (MaxSim) token-alignment scoring.
    Supports PyTorch GPU acceleration with graceful CPU/NumPy fallback.
    """

    def __init__(self):
        self.use_gpu = settings.USE_GPU
        self.device = settings.GPU_DEVICE
        
        # Check PyTorch availability
        self.torch_available = False
        try:
            import torch
            self.torch_available = True
            if self.use_gpu and not torch.cuda.is_available():
                self.use_gpu = False # Failback to CPU
        except ImportError:
            self.use_gpu = False

    def _get_token_embeddings(self, tokens: List[str], dim: int = 32) -> np.ndarray:
        """
        Generates deterministic pseudo-embeddings for text tokens based on char n-grams.
        Returns a normalized matrix of shape (num_tokens, dim).
        """
        if not tokens:
            return np.zeros((1, dim))

        embeddings = []
        for token in tokens:
            # Generate a pseudo-random seed based on token hash
            val = hash(token)
            np.random.seed(abs(val) % (2**32))
            vec = np.random.randn(dim)
            norm = np.linalg.norm(vec)
            embeddings.append(vec / norm if norm > 0 else vec)

        return np.array(embeddings)

    def _tokenize(self, text: str) -> List[str]:
        import re
        return re.findall(r"\b\w+\b", text.lower())

    def compute_late_interaction_score(self, query: str, document_text: str) -> float:
        """
        Computes the Late Interaction MaxSim score:
        Sum_q( Max_d( CosineSim(q, d) ) )
        """
        q_tokens = self._tokenize(query)
        d_tokens = self._tokenize(document_text)

        if not q_tokens or not d_tokens:
            return 0.0

        q_embs = self._get_token_embeddings(q_tokens) # (len(Q), dim)
        d_embs = self._get_token_embeddings(d_tokens) # (len(D), dim)

        if self.torch_available:
            import torch
            with torch.no_grad():
                # Convert to torch Tensors
                q_tensor = torch.from_numpy(q_embs).float()
                d_tensor = torch.from_numpy(d_embs).float()
                
                if self.use_gpu:
                    q_tensor = q_tensor.to(self.device)
                    d_tensor = d_tensor.to(self.device)

                # Compute cosine similarities matrix of shape (len(Q), len(D))
                # Shape: (len(Q), len(D))
                sim_matrix = torch.matmul(q_tensor, d_tensor.T)
                
                # MaxSim: max along document tokens, sum along query tokens
                max_sims, _ = torch.max(sim_matrix, dim=1)
                score = torch.sum(max_sims).item()
        else:
            # CPU NumPy calculation
            sim_matrix = np.dot(q_embs, d_embs.T) # (len(Q), len(D))
            max_sims = np.max(sim_matrix, axis=1)
            score = float(np.sum(max_sims))

        # Normalize score by query length to represent average token similarity margin
        normalized_score = score / len(q_tokens)
        return round(normalized_score, 4)
