import pandas as pd
import numpy as np

np.random.seed(42)
n_rows = 4000

df = pd.DataFrame({
    "id": range(n_rows), 
    "age": np.random.normal(35, 10, n_rows),
    "salary": np.random.normal(60000, 20000, n_rows), 
    "category": np.random.choice(["A", "B", "C"], n_rows), 
    "status": np.random.choice(["Active", "Inactive"], n_rows), 
    "high_missing_col": [np.nan] * int(n_rows * 0.8) + [1] * int(n_rows * 0.2), 
    "constant_col": ["Same"] * n_rows, 
    "target": np.random.choice([0, 1], n_rows) 
})

# Add missing values as per spec test cases
df.loc[np.random.choice(df.index, int(n_rows * 0.1)), "age"] = np.nan
df.loc[np.random.choice(df.index, int(n_rows * 0.25)), "salary"] = np.nan
df.loc[np.random.choice(df.index, int(n_rows * 0.05)), "category"] = np.nan
df.loc[np.random.choice(df.index, int(n_rows * 0.15)), "status"] = np.nan

# Add exact duplicates
df = pd.concat([df, df.sample(127)]) # Add ~127 duplicates

df.to_csv("test_dataset.csv", index=False)
print("Created test_dataset.csv with", len(df), "rows.")
