import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import datetime
from typing import List, Dict, Optional, Tuple

class AIAgent:
    def detect_anomalies(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        num_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(num_cols) == 0 or len(df) < 50:
            return df, f"[{self._now()}] AI ANOMALY: Skipped (Not enough numeric columns or rows)"
            
        try:
            # Dropna just for IsolationForest fitting if there are still NaNs
            clean_df = df[num_cols].fillna(df[num_cols].median())
            
            iso = IsolationForest(contamination=0.05, random_state=42)
            preds = iso.fit_predict(clean_df)
            
            # Predict returns 1 for inliers, -1 for outliers
            df['ai_anomaly_flag'] = np.where(preds == -1, 1, 0)
            
            anomaly_count = (preds == -1).sum()
            pct = (anomaly_count / len(df)) * 100
            
            log_msg = f"[{self._now()}] AI ANOMALY: Detected {anomaly_count} anomalies ({pct:.1f}%) using IsolationForest"
            return df, log_msg
        except Exception as e:
            return df, f"[{self._now()}] AI ANOMALY: Failed - {str(e)}"
            
    def generate_insights(self, df: pd.DataFrame) -> dict:
        insights = {
            "summary": "Dataset analyzed by AI Agent.",
            "alerts": [],
            "correlation_matrix": self.calculate_correlation(df)
        }
        
        # Missing values check
        missing_pct = df.isnull().mean()
        high_missing = missing_pct[missing_pct > 0.3].index.tolist()
        if high_missing:
            insights["alerts"].append(f"High missingness (>30%) in: {', '.join(high_missing)}")
            
        # Correlations (numeric only)
        num_df = df.select_dtypes(include=[np.number])
        if len(num_df.columns) > 1:
            corr_matrix = num_df.corr().abs()
            upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            to_drop = [column for column in upper.columns if any(upper[column] > 0.90)]
            if to_drop:
                insights["alerts"].append(f"Redundant features discovered (Correlation > 0.90): {', '.join(to_drop)}")

        # Cardinality Check
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        high_card = [col for col in cat_cols if df[col].nunique() > 50]
        if high_card:
            insights["alerts"].append(f"High cardinality in categorical columns: {', '.join(high_card)}. Consider grouping values.")

        # Recommendations
        if not insights["alerts"]:
            insights["summary"] = "Dataset quality is excellent! Ready for high-performance ML models."
        else:
            insights["summary"] = f"AI identified {len(insights['alerts'])} potential optimization areas. Review the alerts below."

        return insights

    def calculate_correlation(self, df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Calculates Pearson correlation matrix for numerical columns."""
        numeric_df = df.select_dtypes(include=[np.number])
        if numeric_df.empty:
            return {}
        # Fill NaN with 0 to avoid breaking JSON serialization or charts
        corr = numeric_df.corr().fillna(0).to_dict()
        return corr

    def _now(self):
        return datetime.datetime.now().isoformat()[:19]
