import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler
import datetime
from typing import Tuple, List, Dict

class TransformAgent:
    def transform(self, df: pd.DataFrame, df_before: pd.DataFrame, target_col: str) -> Tuple[pd.DataFrame, List[str], Dict[str, list]]:
        audit_log = []
        previews = {}
        
        # Snapshot Raw
        previews['raw'] = df.head(5).replace({np.nan: None}).to_dict(orient="records")

        # 1. Drop columns
        missing_pct = df.isnull().mean()
        unique_pct = df.nunique() / len(df)
        cols_to_drop = [col for col in df.columns if missing_pct[col] > 0.50 or unique_pct[col] < 0.02]
        if target_col and target_col in cols_to_drop:
            cols_to_drop.remove(target_col)
            
        if cols_to_drop:
            df.drop(columns=cols_to_drop, inplace=True)
            audit_log.append(f"[{self._now()}] STEP 1: DROPPED {len(cols_to_drop)} cols (>50% missing or unique<2%)")

        # 2. Drop duplicates
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            df.drop_duplicates(inplace=True)
            audit_log.append(f"[{self._now()}] STEP 2: REMOVED {dup_count} duplicate rows.")

        missing_df = df_before[df_before.isnull().any(axis=1)]
        previews['missing'] = missing_df.head(5).replace({np.nan: None}).to_dict(orient="records")

        # 3. Numeric imputation
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            missing_count = df[col].isnull().sum()
            miss_ratio = df[col].isnull().mean()
            if missing_count > 0:
                if miss_ratio < 0.20:
                    df[col] = df[col].fillna(df[col].median())
                    audit_log.append(f"[{self._now()}] Imputation [{col}]: Filled {missing_count} missing values. Method: Median. Reason: Missing ratio is low (<20%) and median is robust to extreme outliers.")
                elif miss_ratio <= 0.50:
                    imputer = KNNImputer(n_neighbors=5)
                    imputed_vals = imputer.fit_transform(df[[col]])
                    df[col] = imputed_vals.ravel()
                    audit_log.append(f"[{self._now()}] Imputation [{col}]: Filled {missing_count} missing values. Method: KNN. Reason: Missing ratio is moderate (<50%), requiring algorithmic distance-based approximations.")

        # 4. Categorical imputation
        cat_cols = df.select_dtypes(exclude=[np.number]).columns
        for col in cat_cols:
            missing_count = df[col].isnull().sum()
            miss_ratio = df[col].isnull().mean()
            if missing_count > 0:
                if miss_ratio < 0.10:
                    mode_s = df[col].mode()
                    if not mode_s.empty:
                        fill_val = mode_s.iloc[0]
                        df[col] = df[col].fillna(fill_val)
                        audit_log.append(f"[{self._now()}] Imputation [{col}]: Filled {missing_count} missing values. Method: Mode ('{fill_val}'). Reason: Missing ratio is extremely low, making highest frequency fill optimal.")
                elif miss_ratio <= 0.30:
                    df[col] = df[col].fillna("unknown")
                    audit_log.append(f"[{self._now()}] Imputation [{col}]: Filled {missing_count} missing values. Method: Unknown constant. Reason: Missing distribution too broad for mode, generating explicit null-class.")

        # Snapshot After Imputation
        previews['imputed'] = df.head(5).replace({np.nan: None}).to_dict(orient="records")

        # 6. Categorical encoding
        encoded_cols = []
        for col in cat_cols:
            if col in df.columns:
                nunique = df[col].nunique()
                if nunique == 2:
                    unique_vals = df[col].dropna().unique()
                    val_map = {val: i for i, val in enumerate(unique_vals)}
                    df[col] = df[col].map(val_map)
                    encoded_cols.append(col)
                    audit_log.append(f"[{self._now()}] ENCODED [{col}]: Binary label encoding applied.")
                elif nunique < 10:
                    df = pd.get_dummies(df, columns=[col], drop_first=True)
                    encoded_cols.append(col)
                    audit_log.append(f"[{self._now()}] ENCODED [{col}]: One-Hot Representation expanded.")
                else:
                    freq = df[col].value_counts(normalize=True)
                    df[col] = df[col].map(freq)
                    encoded_cols.append(col)
                    audit_log.append(f"[{self._now()}] ENCODED [{col}]: High-cardinality Frequency mapping applied.")
        
        # Snapshot After Encoding
        previews['encoded'] = df.head(5).replace({np.nan: None}).to_dict(orient="records")

        # 7. Normalization (Scaling Data)
        scaler = StandardScaler()
        final_num_cols = df.select_dtypes(include=[np.number]).columns
        cols_to_scale = [c for c in final_num_cols if c != target_col and not c.startswith('ai_anomaly_flag')]
        if len(cols_to_scale) > 0:
            df[cols_to_scale] = scaler.fit_transform(df[cols_to_scale])
            audit_log.append(f"[{self._now()}] NORMALIZED Step: Standardized {len(cols_to_scale)} numerical features (Mean=0, StdDev=1).")
        
        # Snapshot After Normalization
        previews['normalized'] = df.head(5).replace({np.nan: None}).to_dict(orient="records")

        return df, audit_log, previews

    def _now(self):
        return datetime.datetime.now().isoformat()[:19]
