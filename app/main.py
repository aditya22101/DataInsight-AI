import io
import os
import uuid
import datetime
import certifi
from typing import List, Dict, Optional, Literal, Any
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from app.agents.inspector_agent import InspectorAgent
from app.agents.transform_agent import TransformAgent
from app.agents.quality_agent import QualityAgent
from app.agents.ai_agent import AIAgent
from app.agents.visualization_agent import VisualizationAgent
from app.agents.ml_agent import MLAgent
from pymongo import MongoClient
import os


load_dotenv()
app = FastAPI(title="DataInsight AI", version="2.0.0")

# CORS Configuration for Deployment
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware, 
    allow_origins=allowed_origins, 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
if "mongodb+srv" in MONGODB_URL:
    db_client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
else:
    db_client = AsyncIOMotorClient(MONGODB_URL)

db = db_client["dataforge"]
logs_collection = db["audit_logs"]

# ✅ ADD HERE
@app.get("/api/check-db")
async def check_db():
    try:
        await db.command("ping")
        return {"status": "MongoDB connected ✅"}
    except Exception as e:
        return {"error": str(e)}
# In-memory session store for cross-endpoint training
global_sessions = {}

class DataForgeResponse(BaseModel):
    status: Literal["success", "warning", "failed"]
    session_id: str
    timestamp: datetime.datetime
    columns: List[str]
    quality_score: float
    audit_log: List[str]
    metrics: Dict[str, float]
    shape_change: str
    warnings: List[str] = []
    data_info: Dict[str, Any]
    final_dtypes: Dict[str, str]
    missing_counts: Dict[str, int]
    previews: Dict[str, List[Dict]]
    dataset_sample: List[Dict]
    graphs: Dict[str, str]
    ai_insights: Dict[str, Any]
    correlation_matrix: Dict[str, Dict[str, float]]

class MLTrainRequest(BaseModel):
    session_id: str
    target_col: str
    feature_cols: List[str]
    task_type: Literal["classification", "regression"]
    model_type: Literal["auto", "random_forest", "linear", "logistic"]
    learning_rate: Optional[float] = None

class MLTrainResponse(BaseModel):
    model_used: str
    metrics: Dict[str, float]
    x_head: List[Dict]
    y_head: List[Dict]

@app.post("/preprocess", response_model=DataForgeResponse)
async def preprocess_data(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    target_col: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None)
):
    if not file.filename.endswith(".csv"): raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    contents = await file.read()
    df_before = pd.read_csv(io.BytesIO(contents))
    df = df_before.copy()
    warnings = []
    
    info_dict = {
        "rows": len(df), 
        "columns": len(df.columns), 
        "dtypes": {k: str(v) for k, v in df.dtypes.items()},
        "numerical_sum": float(df.select_dtypes(include=[np.number]).sum().sum())
    }
    missing_counts = df.isnull().sum().to_dict()
    
    transformer = TransformAgent()
    try:
        df, audit_log, previews = transformer.transform(df, df_before, target_col)
        df, ai_log = AIAgent().detect_anomalies(df)
        ai_insights = AIAgent().generate_insights(df)
        audit_log.append(ai_log)
        graphs = VisualizationAgent().generate_graphs(df)
        q_metrics = QualityAgent().evaluate(df_before, df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")

    session_id = str(uuid.uuid4())
    global_sessions[session_id] = df.copy()
    
    sample_df = df.sample(min(500, len(df))) if len(df) > 500 else df

    response_data = {
        "status": "success",
        "session_id": session_id,
        "filename": file.filename,
        "user_id": user_id,
        "user_email": user_email,
        "columns": df.columns.tolist(),
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "quality_score": round(q_metrics["final_score"], 2),
        "audit_log": audit_log,
        "metrics": {"completeness": round(q_metrics["completeness"], 2), "memory_reduction_pct": round(q_metrics["memory_reduction"], 2)},
        "shape_change": q_metrics["shape_change"],
        "warnings": warnings,
        "data_info": info_dict,
        "final_dtypes": {k: str(v) for k, v in df.dtypes.items()},
        "missing_counts": missing_counts,
        "previews": previews,
        "dataset_sample": sample_df.replace({np.nan: None}).to_dict(orient="records"),
        "graphs": graphs,
        "ai_insights": ai_insights,
        "correlation_matrix": ai_insights.get("correlation_matrix", {})
    }
    
    # Mongo backup stripped
    mongo_doc = response_data.copy()
    if 'previews' in mongo_doc: del mongo_doc['previews']
    if 'dataset_sample' in mongo_doc: del mongo_doc['dataset_sample']
    if 'graphs' in mongo_doc: del mongo_doc['graphs']
    background_tasks.add_task(logs_collection.insert_one, mongo_doc)
    
    return DataForgeResponse(**response_data)

@app.get("/history/{user_email}")
async def get_history(user_email: str):
    try:
        cursor = logs_collection.find({"user_email": user_email}).sort("timestamp", -1).limit(50)
        history = await cursor.to_list(length=50)
        # Convert ObjectId and datetime for JSON
        for h in history:
            h["_id"] = str(h["_id"])
            if isinstance(h.get("timestamp"), datetime.datetime):
                h["timestamp"] = h["timestamp"].isoformat()
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History Retrieval Failed: {str(e)}")

@app.post("/train", response_model=MLTrainResponse)
async def train_model(req: MLTrainRequest):
    if req.session_id not in global_sessions:
        raise HTTPException(status_code=404, detail="Session expired or not found. Please preprocess data again.")
    
    df = global_sessions[req.session_id]
    
    ml_agent = MLAgent()
    try:
        result = ml_agent.train(
            df=df,
            target_col=req.target_col,
            feature_cols=req.feature_cols,
            task_type=req.task_type,
            model_type=req.model_type,
            lr=req.learning_rate
        )
        return MLTrainResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training Failed: {str(e)}")

@app.get("/export/{session_id}")
async def export_data(session_id: str):
    if session_id not in global_sessions:
        raise HTTPException(status_code=404, detail="Session expired or not found.")
    
    df = global_sessions[session_id]
    
    # Use io.BytesIO for CSV export to handle binary streaming
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)
    
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=dataforge_processed_{session_id}.csv"}
    )


