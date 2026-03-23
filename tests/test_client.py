import httpx
import json

def test_api():
    url = "http://localhost:8000/preprocess"
    
    print("Sending test dataset to DataForge API...")
    files = {'file': ('test_dataset.csv', open('test_dataset.csv', 'rb'), 'text/csv')}
    data = {'target_col': 'target'}
    
    # Preprocessing might take some time (KNN Imputer)
    timeout = httpx.Timeout(30.0, connect=10.0)
    
    with httpx.Client(timeout=timeout) as client:
        response = client.post(url, files=files, data=data)
        
    print(f"\nStatus Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Response parsing:\n")
        result = response.json()
        print(f"DataForge Version: {result['version']}")
        print(f"Status: {result['status'].upper()}")
        print(f"Shape Change: {result['shape_change']}")
        print(f"Quality Score: {result['quality_score']}/100")
        
        print("\n--- AUDIT LOG ---")
        for log in result["audit_log"]:
            print(log)
            
        print("\n--- METRICS ---")
        print(json.dumps(result["metrics"], indent=2))
        
        print("\n--- PREVIEW (First 2 rows) ---")
        print(json.dumps(result["cleaned_data_preview"][:2], indent=2))
        
        if result["warnings"]:
            print("\n--- WARNINGS ---")
            for w in result["warnings"]:
                print(w)
    else:
        print("Failed!")
        print(response.text)

if __name__ == "__main__":
    test_api()
