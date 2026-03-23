import pandas as pd
import numpy as np
import io
import base64
import matplotlib
import traceback
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

class VisualizationAgent:
    def generate_graphs(self, df: pd.DataFrame) -> dict:
        graphs = {}
        try:
            num_cols = df.select_dtypes(include=[np.number]).columns
            cat_cols = df.select_dtypes(exclude=[np.number]).columns

            # Theme defaults
            sns.set_theme(style="whitegrid")

            if len(num_cols) >= 2:
                # 1. Scatter Plot
                plt.figure(figsize=(6, 4))
                sns.scatterplot(x=df[num_cols[0]], y=df[num_cols[1]], alpha=0.7, color='#6366f1')
                plt.title(f"Scatter: {num_cols[0]} vs {num_cols[1]}")
                plt.tight_layout()
                graphs['scatter'] = self._get_base64(plt)
                
                # 2. Correlation Heatmap
                plt.figure(figsize=(6, 5))
                corr = df[num_cols].corr()
                sns.heatmap(corr, annot=False, cmap='coolwarm', linewidths=0.5)
                plt.title("Correlation Heatmap")
                plt.tight_layout()
                graphs['heatmap'] = self._get_base64(plt)

            if len(num_cols) >= 1:
                # 3. Histogram / Density Plot
                plt.figure(figsize=(6, 4))
                sns.histplot(df[num_cols[0]], kde=True, color='#10b981', bins=30)
                plt.title(f"Density & Histogram: {num_cols[0]}")
                plt.tight_layout()
                graphs['histogram'] = self._get_base64(plt)

            if len(cat_cols) >= 1:
                # 4. Bar / Pie Chart
                plt.figure(figsize=(6, 4))
                counts = df[cat_cols[0]].value_counts().head(10)
                sns.barplot(x=counts.index, y=counts.values, palette='viridis')
                plt.title(f"Bar Chart: Top Categories in {cat_cols[0]}")
                plt.xticks(rotation=45)
                plt.tight_layout()
                graphs['bar'] = self._get_base64(plt)
                
        except Exception as e:
            print("Graph Generation Failed", traceback.format_exc())

        return graphs

    def _get_base64(self, plt) -> str:
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', transparent=True)
        plt.close()
        buf.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
