"""
Shrink poses.glb by keeping only the animation tracks the app uses:
every bone's rotation, plus the hips' position. (Other bones' positions and
all scales would impose the library mannequin's proportions, so the app
ignores them anyway — see components/3d/PosedFigure.tsx.)

Usage: python3 -I strip_pose_tracks.py <in.glb> <out.glb>
"""
import json
import struct
import sys

HIPS = "pelvis"

src, dst = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
json_len = struct.unpack("<I", data[12:16])[0]
doc = json.loads(data[20:20 + json_len])
bin_start = 20 + json_len + 8
binary = data[bin_start:]

names = [n.get("name") for n in doc["nodes"]]
new_views, new_accessors, accessor_map, out = [], [], {}, bytearray()


def keep_accessor(index):
    if index in accessor_map:
        return accessor_map[index]
    acc = dict(doc["accessors"][index])
    view = doc["bufferViews"][acc["bufferView"]]
    start = view.get("byteOffset", 0)
    chunk = binary[start:start + view["byteLength"]]
    while len(out) % 4:
        out.append(0)
    new_views.append({"buffer": 0, "byteOffset": len(out), "byteLength": len(chunk)})
    out.extend(chunk)
    acc["bufferView"] = len(new_views) - 1
    new_accessors.append(acc)
    accessor_map[index] = len(new_accessors) - 1
    return accessor_map[index]


for anim in doc["animations"]:
    samplers, channels = [], []
    for ch in anim["channels"]:
        path = ch["target"]["path"]
        node = names[ch["target"]["node"]]
        if not (path == "rotation" or (path == "translation" and node == HIPS)):
            continue
        s = anim["samplers"][ch["sampler"]]
        samplers.append({**s, "input": keep_accessor(s["input"]), "output": keep_accessor(s["output"])})
        channels.append({**ch, "sampler": len(samplers) - 1})
    anim["samplers"], anim["channels"] = samplers, channels

while len(out) % 4:
    out.append(0)
doc["accessors"], doc["bufferViews"] = new_accessors, new_views
doc["buffers"] = [{"byteLength": len(out)}]

js = json.dumps(doc, separators=(",", ":")).encode()
js += b" " * ((4 - len(js) % 4) % 4)
total = 12 + 8 + len(js) + 8 + len(out)
with open(dst, "wb") as f:
    f.write(struct.pack("<4sII", b"glTF", 2, total))
    f.write(struct.pack("<I4s", len(js), b"JSON") + js)
    f.write(struct.pack("<I4s", len(out), b"BIN\x00") + out)
print(f"[strip] {len(data) / 1e6:.2f} MB -> {total / 1e6:.2f} MB, channels kept: {sum(len(a['channels']) for a in doc['animations'])}")
