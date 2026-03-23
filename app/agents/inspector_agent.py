import pandas as pd

class InspectorAgent:
    def inspect(self, df: pd.DataFrame) -> dict:
        profile = {
            "shape": df.shape,
            "dtypes": {k: str(v) for k, v in df.dtypes.items()},
            "memory_mb": df.memory_usage(deep=True).sum() / 1e6,
            "missing_pct": df.isnull().mean().round(3).to_dict(),
            "duplicates": int(df.duplicated().sum()),
            "unique_ratio": (df.nunique() / len(df)).round(3).to_dict(),
            "constant_cols": [c for c in df.columns if df[c].nunique() <= 1]
        }
        return profile
