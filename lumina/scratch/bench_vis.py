import time, cv2, sys
sys.path.insert(0, ".")
from vis import Vis

v = Vis("m/yolov8n.onnx", conf=0.45)
frame = cv2.imread("test_scene.jpg")

# warm
v.run(frame)

N = 20
t0 = time.perf_counter()
for _ in range(N):
    hits = v.run(frame)
dt = (time.perf_counter() - t0) / N * 1000

labels_path = None
from srv import COCO_LABELS
labels = [COCO_LABELS[h["cid"]] for h in hits]
uniq = []
for l in labels:
    if l not in uniq:
        uniq.append(l)

print(f"avg latency : {dt:.1f} ms over {N} runs")
print(f"raw boxes   : {len(hits)}  (was ~64 before NMS)")
print(f"unique objs : {uniq}")
