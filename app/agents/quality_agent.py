import pandas as pd

class QualityAgent:
    def evaluate(self, df_before: pd.DataFrame, df_after: pd.DataFrame) -> dict:
        completeness_after = 1 - df_after.isnull().mean().mean()
        completeness_before = 1 - df_before.isnull().mean().mean()
        completeness_gain = (completeness_after - completeness_before) * 100
        
        memory_after = df_after.memory_usage(deep=True).sum()
        memory_before = df_before.memory_usage(deep=True).sum()
        memory_gain = (1 - memory_after / memory_before) * 100
        
        return {
            "completeness": 100 * completeness_after,
            "shape_change": f"{df_before.shape}→{df_after.shape}",
            "memory_reduction": memory_gain,
            "final_score": min(100.0, 85.0 + max(0.0, float(completeness_gain)) + max(0.0, float(memory_gain)))
        }
