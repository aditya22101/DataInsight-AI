import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score

class MLAgent:
    def train(self, df: pd.DataFrame, target_col: str, feature_cols: list, task_type: str, model_type: str, lr: float = None):
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found.")
        
        # If no features selected, use all remaining columns
        if not feature_cols or len(feature_cols) == 0:
            feature_cols = [c for c in df.columns if c != target_col and not c.startswith('ai_anomaly_flag')]
            
        X = df[feature_cols]
        y = df[target_col]
        
        # Train / Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = None
        metrics = {}
        
        if task_type == "classification":
            if model_type == "logistic":
                model = LogisticRegression(max_iter=1000)
            else: # auto / random_forest
                model = RandomForestClassifier(n_estimators=100, random_state=42)
            
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            metrics["accuracy"] = float(accuracy_score(y_test, preds) * 100)
            try:
                metrics["f1_score"] = float(f1_score(y_test, preds, average='weighted') * 100)
            except:
                metrics["f1_score"] = 0.0
            
        elif task_type == "regression":
            if model_type == "linear":
                model = LinearRegression()
            else:
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            metrics["accuracy"] = float(r2_score(y_test, preds) * 100) # Mapping R2 to Accuracy for generic UI
            metrics["r2_score"] = float(r2_score(y_test, preds) * 100)
            metrics["mse"] = float(mean_squared_error(y_test, preds))
            
        return {
            "model_used": model.__class__.__name__,
            "metrics": metrics,
            "x_head": X.head(5).to_dict(orient="records"),
            "y_head": pd.DataFrame({target_col: y.head(5)}).to_dict(orient="records")
        }
