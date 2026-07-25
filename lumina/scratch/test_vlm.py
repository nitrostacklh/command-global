import httpx
import json

BASE_URL = "http://localhost:8000"
MOCK_IMAGE_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

def test():
    client = httpx.Client()
    payload = {"node_id": "test_vis", "image": MOCK_IMAGE_B64}
    try:
        print("Sending VLM request...")
        r = client.post(f"{BASE_URL}/api/vlm", json={"node_id": "test_vlm", "image": MOCK_IMAGE_B64, "prompt": "What do you see?"}, timeout=45)
        print("Status code:", r.status_code)
        print("Headers:", r.headers)
        print("Text:", r.text)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
