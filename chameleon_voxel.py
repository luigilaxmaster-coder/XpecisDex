#!/usr/bin/env python3
"""
Premium voxel chameleon generator for Goxel / MagicaVoxel.

The model is built as separate technical generators so each piece can be tuned
independently:

01_branch
02_body_main
03_back_arch
04_head_main
05_head_casque
06_snout
07_eye_turret_right
08_eye_detail
09_front_left_leg
10_front_right_leg
11_back_left_leg
12_back_right_leg
13_gripping_toes
14_spiral_tail
15_dorsal_spikes
16_cyan_lateral_stripe
17_scale_noise
18_color_spots
19_shadow_pass
20_highlight_pass
"""

import json
import math
import random
import struct
import sys

SIZE_X = 128
SIZE_Y = 72
SIZE_Z = 80
SEED = 8127

COLORS = [
    ("body_lime_green", (155, 203, 61), 1),
    ("body_yellow_green", (201, 217, 58), 2),
    ("body_deep_green", (63, 127, 54), 3),
    ("body_shadow_green", (36, 87, 46), 4),
    ("body_highlight_yellow", (220, 233, 90), 5),
    ("stripe_cyan_light", (142, 217, 230), 6),
    ("stripe_cyan_shadow", (75, 168, 184), 7),
    ("eye_red_orange", (183, 71, 50), 8),
    ("eye_dark_red", (106, 31, 29), 9),
    ("eye_black", (8, 6, 4), 10),
    ("eye_highlight", (246, 244, 232), 11),
    ("mouth_line_light", (242, 231, 138), 12),
    ("mouth_shadow", (94, 68, 44), 13),
    ("spot_brown_red", (139, 62, 47), 14),
    ("spot_dark_brown", (75, 42, 31), 15),
    ("spot_yellow", (230, 216, 80), 16),
    ("spot_light_green", (185, 230, 90), 17),
    ("claw_dark", (28, 26, 22), 18),
    ("branch_dark_brown", (28, 22, 20), 19),
    ("branch_mid_brown", (58, 42, 34), 20),
    ("branch_highlight", (90, 64, 50), 21),
]

C = {name: idx for name, _, idx in COLORS}


class Grid:
    def __init__(self, sx=SIZE_X, sy=SIZE_Y, sz=SIZE_Z):
        self.sx = sx
        self.sy = sy
        self.sz = sz
        self.data = [[[0 for _ in range(sz)] for _ in range(sy)] for _ in range(sx)]

    def in_bounds(self, x, y, z):
        return 0 <= x < self.sx and 0 <= y < self.sy and 0 <= z < self.sz

    def set(self, x, y, z, color):
        if self.in_bounds(x, y, z):
            self.data[x][y][z] = color

    def get(self, x, y, z):
        if self.in_bounds(x, y, z):
            return self.data[x][y][z]
        return 0

    def sphere(self, cx, cy, cz, r, color, hollow=False):
        self.ellipsoid(cx, cy, cz, r, r, r, color, hollow=hollow)

    def ellipsoid(self, cx, cy, cz, rx, ry, rz, color, hollow=False):
        x0 = max(0, int(cx - rx) - 1)
        x1 = min(self.sx, int(cx + rx) + 2)
        y0 = max(0, int(cy - ry) - 1)
        y1 = min(self.sy, int(cy + ry) + 2)
        z0 = max(0, int(cz - rz) - 1)
        z1 = min(self.sz, int(cz + rz) + 2)
        rx2 = max(1e-6, rx * rx)
        ry2 = max(1e-6, ry * ry)
        rz2 = max(1e-6, rz * rz)
        shell = 0.82
        for x in range(x0, x1):
            dx = (x - cx) * (x - cx) / rx2
            for y in range(y0, y1):
                dy = (y - cy) * (y - cy) / ry2
                if dx + dy > 1.0:
                    continue
                for z in range(z0, z1):
                    dz = (z - cz) * (z - cz) / rz2
                    d = dx + dy + dz
                    if d <= 1.0 and (not hollow or d >= shell):
                        self.set(x, y, z, color)

    def voxels(self):
        out = []
        for x in range(self.sx):
            for y in range(self.sy):
                for z in range(self.sz):
                    color = self.data[x][y][z]
                    if color:
                        out.append((x, y, z, color))
        return out


def lerp(a, b, t):
    return a + (b - a) * t


def lerp3(a, b, t):
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))


def dist3(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def draw_tube(points, radii, colors, grid):
    prev = None
    prev_r = None
    prev_color = None
    for point, radius, color in zip(points, radii, colors):
        if prev is not None:
            steps = max(2, int(dist3(prev, point) * 1.6))
            for i in range(steps + 1):
                t = i / steps
                x, y, z = lerp3(prev, point, t)
                r = lerp(prev_r, radius, t)
                c = prev_color if t < 0.5 else color
                grid.sphere(
                    int(round(x)),
                    int(round(y)),
                    int(round(z)),
                    max(1, int(round(r))),
                    c,
                )
        prev = point
        prev_r = radius
        prev_color = color


def is_surface(grid, x, y, z):
    if not grid.get(x, y, z):
        return False
    for dx, dy, dz in (
        (1, 0, 0),
        (-1, 0, 0),
        (0, 1, 0),
        (0, -1, 0),
        (0, 0, 1),
        (0, 0, -1),
    ):
        if grid.get(x + dx, y + dy, z + dz) == 0:
            return True
    return False


def body_backbone():
    return [
        (40, 36, 30),
        (48, 36, 38),
        (58, 36, 45),
        (68, 35, 48),
        (78, 34, 46),
        (86, 34, 42),
    ]


def piece_01_branch(grid, rng):
    points = []
    radii = []
    colors = []
    for i in range(22):
        t = i / 21
        x = lerp(6, 123, t)
        y = 40 - 5 * t + math.sin(t * math.pi * 2.3 + 0.4) * 1.7
        z = 21 + 12 * t + math.sin(t * math.pi * 1.9 + 1.1) * 1.3
        r = 5.2 + math.sin(t * math.pi * 4.0 + 0.2) * 0.9
        points.append((x, y, z))
        radii.append(r)
        colors.append(C["branch_dark_brown"])
    draw_tube(points, radii, colors, grid)
    for point in points:
        x, y, z = [int(round(v)) for v in point]
        if rng.random() > 0.35:
            grid.set(x, y - 1, z + 1, C["branch_mid_brown"])
        if rng.random() > 0.7:
            grid.set(x, y - 2, z + 2, C["branch_highlight"])


def piece_02_body_main(grid, rng):
    points = body_backbone()
    radii = [7.5, 10.0, 12.5, 13.0, 11.0, 8.0]
    colors = [
        C["body_yellow_green"],
        C["body_lime_green"],
        C["body_lime_green"],
        C["body_yellow_green"],
        C["body_lime_green"],
        C["body_yellow_green"],
    ]
    draw_tube(points, radii, colors, grid)
    for i, point in enumerate(points[1:-1], start=1):
        x, y, z = point
        grid.ellipsoid(
            x,
            y + 2,
            z - 2,
            max(5, radii[i] - 3),
            max(6, radii[i] - 2),
            max(5, radii[i] - 4),
            C["body_shadow_green"],
        )


def piece_03_back_arch(grid, rng):
    for i in range(25):
        t = i / 24
        x = int(round(lerp(42, 82, t)))
        z = int(round(33 + math.sin(t * math.pi) * 21))
        y = int(round(36 - t * 2.2))
        grid.sphere(x, y, z + 2, 2, C["body_deep_green"])
        if rng.random() > 0.45:
            grid.set(x, y, z + 4, C["body_highlight_yellow"])


def piece_04_head_main(grid, rng):
    for i in range(27):
        t = i / 26
        x = 83 + i
        side = max(1.6, 8.5 - t * 4.9)
        top = max(2.0, 9.0 - t * 4.6)
        z_lift = 46 + t * 5.0
        y_shift = -1.8 * t
        for dy in range(-10, 11):
            for dz in range(-10, 11):
                ny = dy / side
                nz = dz / top
                if ny * ny + nz * nz <= 1.0:
                    y = int(round(35 + y_shift + dy * (1.0 - 0.18 * t)))
                    z = int(round(z_lift + dz * (1.0 - 0.18 * t)))
                    color = C["body_yellow_green"] if t > 0.25 else C["body_lime_green"]
                    if dz > top * 0.55:
                        color = C["body_deep_green"]
                    grid.set(x, y, z, color)


def piece_05_head_casque(grid, rng):
    grid.ellipsoid(93, 32, 56, 9, 7, 8, C["body_deep_green"])
    grid.ellipsoid(95, 31, 59, 6, 4, 4, C["body_highlight_yellow"])
    for x in range(86, 101):
        for y in range(26, 38):
            for z in range(51, 64):
                if (
                    grid.get(x, y, z) == C["body_deep_green"]
                    and grid.get(x - 1, y, z) == 0
                ):
                    grid.set(x, y, z, C["body_shadow_green"])


def piece_06_snout(grid, rng):
    for i in range(8):
        t = i / 7
        x = 110 + i
        r = max(1, int(round(4.5 - t * 2.5)))
        grid.sphere(x, 32 - int(t * 1.2), 50 + int(t * 1.3), r, C["body_yellow_green"])
    for i in range(16):
        x = 98 + i
        y = 28
        z = 47 + int(i * 0.12)
        if grid.get(x, y, z):
            grid.set(x, y, z, C["mouth_line_light"])
            if grid.get(x, y + 1, z):
                grid.set(x, y + 1, z, C["mouth_shadow"])


def piece_07_eye_turret_right(grid, rng):
    base = (98, 23, 50)
    for i, r in enumerate((6, 5, 4)):
        grid.ellipsoid(base[0] - i, base[1], base[2], r, r, r, C["body_yellow_green"])
    grid.sphere(101, 21, 50, 6, C["body_highlight_yellow"])
    grid.sphere(101, 21, 50, 7, C["body_shadow_green"], hollow=True)


def piece_08_eye_detail(grid, rng):
    grid.sphere(103, 19, 50, 4, C["eye_red_orange"])
    grid.sphere(104, 18, 50, 2, C["eye_black"])
    grid.set(105, 17, 51, C["eye_highlight"])
    grid.set(104, 17, 50, C["eye_highlight"])
    for dx in range(-1, 2):
        for dz in range(-1, 2):
            if abs(dx) + abs(dz) <= 1:
                grid.set(100 + dx, 23, 50 + dz, C["eye_dark_red"])


def draw_leg_chain(grid, chain, colors):
    for i, point in enumerate(chain):
        color = colors[min(i, len(colors) - 1)]
        grid.sphere(point[0], point[1], point[2], 3 if i < len(chain) - 1 else 2, color)


def piece_09_front_left_leg(grid, rng):
    draw_leg_chain(
        grid,
        [(79, 33, 38), (78, 35, 35), (77, 36, 32), (76, 38, 29)],
        [
            C["body_yellow_green"],
            C["body_lime_green"],
            C["body_lime_green"],
            C["body_deep_green"],
        ],
    )


def piece_10_front_right_leg(grid, rng):
    draw_leg_chain(
        grid,
        [(82, 39, 40), (81, 40, 36), (80, 40, 33), (79, 39, 30)],
        [
            C["body_deep_green"],
            C["body_deep_green"],
            C["body_shadow_green"],
            C["body_shadow_green"],
        ],
    )


def piece_11_back_left_leg(grid, rng):
    draw_leg_chain(
        grid,
        [(49, 34, 33), (48, 35, 29), (47, 36, 26), (46, 38, 23)],
        [
            C["body_deep_green"],
            C["body_lime_green"],
            C["body_lime_green"],
            C["body_deep_green"],
        ],
    )


def piece_12_back_right_leg(grid, rng):
    draw_leg_chain(
        grid,
        [(51, 40, 34), (50, 40, 30), (49, 39, 27), (48, 38, 24)],
        [
            C["body_shadow_green"],
            C["body_shadow_green"],
            C["body_deep_green"],
            C["body_deep_green"],
        ],
    )


def piece_13_gripping_toes(grid, rng):
    toe_sets = [
        [(75, 39, 28), (75, 40, 28), (76, 40, 27), (74, 40, 28)],
        [(79, 39, 29), (79, 40, 29), (80, 39, 28), (78, 40, 29)],
        [(45, 39, 22), (45, 40, 22), (46, 39, 21), (44, 40, 22)],
        [(47, 39, 23), (48, 39, 23), (48, 40, 22), (46, 40, 23)],
    ]
    for toe_group in toe_sets:
        for x, y, z in toe_group:
            grid.set(x, y, z, C["claw_dark"])


def piece_14_spiral_tail(grid, rng):
    points = []
    radii = []
    colors = []
    center_x = 33
    center_y = 43
    center_z = 18
    turns = 1.82
    steps = 120
    for i in range(steps):
        t = i / (steps - 1)
        angle = t * turns * math.pi * 2.0
        spiral_r = 18.0 * (1.0 - t * 0.58)
        x = center_x - t * 17.0 - math.cos(angle) * spiral_r * 0.62
        y = center_y + math.sin(angle) * spiral_r * 0.72
        z = center_z + 14.0 * (1.0 - t) - abs(math.sin(angle)) * 2.2
        points.append((x, y, z))
        radii.append(6.8 - t * 4.6)
        band = int(angle / (math.pi * 0.47)) % 5
        if band == 0:
            colors.append(C["body_yellow_green"])
        elif band == 1:
            colors.append(C["body_lime_green"])
        elif band == 2:
            colors.append(C["spot_brown_red"])
        elif band == 3:
            colors.append(C["body_highlight_yellow"])
        else:
            colors.append(C["body_deep_green"])
    draw_tube(points, radii, colors, grid)


def piece_15_dorsal_spikes(grid, rng):
    for i in range(21):
        t = i / 20
        x = int(round(44 + 38 * t))
        y = int(round(36 - 2 * t))
        z = int(round(39 + math.sin(t * math.pi) * 18))
        color = C["body_deep_green"] if i % 2 == 0 else C["body_highlight_yellow"]
        grid.set(x, y, z + 2, color)
        grid.set(x, y, z + 3, color)
        if rng.random() > 0.5:
            grid.set(x - 1, y, z + 2, C["body_shadow_green"])


def piece_16_cyan_lateral_stripe(grid, rng):
    for i in range(34):
        t = i / 33
        x = int(round(45 + 38 * t))
        y = int(round(29 + math.sin(t * math.pi * 2.2 + 0.1) * 1.8))
        z = int(round(38 + math.sin(t * math.pi) * 6.0))
        width = 2 if i % 5 else 3
        for dy in range(-width, width + 1):
            for dz in range(-1, 2):
                if grid.get(x, y + dy, z + dz):
                    color = (
                        C["stripe_cyan_light"]
                        if rng.random() > 0.28
                        else C["stripe_cyan_shadow"]
                    )
                    grid.set(x, y + dy, z + dz, color)


def piece_17_scale_noise(grid, rng):
    for _ in range(1100):
        x = rng.randint(34, 110)
        y = rng.randint(20, 48)
        z = rng.randint(16, 61)
        if not is_surface(grid, x, y, z):
            continue
        color = grid.get(x, y, z)
        if color in (
            C["body_lime_green"],
            C["body_yellow_green"],
            C["body_deep_green"],
            C["body_highlight_yellow"],
        ):
            roll = rng.random()
            if roll < 0.34:
                grid.set(x, y, z, C["spot_yellow"])
            elif roll < 0.58:
                grid.set(x, y, z, C["spot_light_green"])
            elif roll < 0.78:
                grid.set(x, y, z, C["body_deep_green"])
            else:
                grid.set(x, y, z, C["body_highlight_yellow"])


def piece_18_color_spots(grid, rng):
    centers = [
        (50, 35, 44, 3),
        (60, 28, 44, 4),
        (74, 30, 41, 3),
        (94, 30, 47, 2),
        (38, 41, 31, 3),
        (30, 46, 21, 3),
    ]
    for cx, cy, cz, r in centers:
        for x in range(cx - r, cx + r + 1):
            for y in range(cy - r, cy + r + 1):
                for z in range(cz - r, cz + r + 1):
                    if is_surface(grid, x, y, z):
                        d = math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
                        if d <= r:
                            grid.set(
                                x,
                                y,
                                z,
                                C["spot_brown_red"]
                                if d < r * 0.65
                                else C["spot_dark_brown"],
                            )


def piece_19_shadow_pass(grid, rng):
    for x in range(28, 111):
        for y in range(23, 50):
            for z in range(12, 39):
                color = grid.get(x, y, z)
                if color in (
                    C["body_lime_green"],
                    C["body_yellow_green"],
                    C["body_highlight_yellow"],
                ):
                    if is_surface(grid, x, y, z):
                        grid.set(x, y, z, C["body_shadow_green"])


def piece_20_highlight_pass(grid, rng):
    for x in range(39, 108):
        for y in range(20, 39):
            for z in range(39, 66):
                color = grid.get(x, y, z)
                if color in (
                    C["body_lime_green"],
                    C["body_yellow_green"],
                    C["body_deep_green"],
                ):
                    if is_surface(grid, x, y, z) and rng.random() > 0.45:
                        grid.set(x, y, z, C["body_highlight_yellow"])


PIECES = [
    ("01_branch", piece_01_branch),
    ("02_body_main", piece_02_body_main),
    ("03_back_arch", piece_03_back_arch),
    ("04_head_main", piece_04_head_main),
    ("05_head_casque", piece_05_head_casque),
    ("06_snout", piece_06_snout),
    ("07_eye_turret_right", piece_07_eye_turret_right),
    ("08_eye_detail", piece_08_eye_detail),
    ("09_front_left_leg", piece_09_front_left_leg),
    ("10_front_right_leg", piece_10_front_right_leg),
    ("11_back_left_leg", piece_11_back_left_leg),
    ("12_back_right_leg", piece_12_back_right_leg),
    ("13_gripping_toes", piece_13_gripping_toes),
    ("14_spiral_tail", piece_14_spiral_tail),
    ("15_dorsal_spikes", piece_15_dorsal_spikes),
    ("16_cyan_lateral_stripe", piece_16_cyan_lateral_stripe),
    ("17_scale_noise", piece_17_scale_noise),
    ("18_color_spots", piece_18_color_spots),
    ("19_shadow_pass", piece_19_shadow_pass),
    ("20_highlight_pass", piece_20_highlight_pass),
]


def export_piece_manifest(path):
    payload = {
        "name": "chameleon_reference_asset",
        "assetType": "animal",
        "species": "chameleon",
        "style": "premium_voxel_semi_realistic",
        "dimensions": {"x": SIZE_X, "y": SIZE_Y, "z": SIZE_Z},
        "seed": SEED,
        "pieces": [name for name, _ in PIECES],
    }
    with open(path, "w", encoding="ascii") as fh:
        json.dump(payload, fh, indent=2)


def build_palette():
    palette = [(0, 0, 0, 0)] * 256
    for _, rgb, idx in COLORS:
        palette[idx] = (rgb[0], rgb[1], rgb[2], 255)
    return palette


def write_vox(path, voxels, palette):
    sx = max(v[0] for v in voxels) + 1
    sy = max(v[1] for v in voxels) + 1
    sz = max(v[2] for v in voxels) + 1
    with open(path, "wb") as fh:
        fh.write(b"VOX " + struct.pack("<I", 150))
        content = bytearray()
        size_chunk = struct.pack("<III", sx, sy, sz)
        content.extend(b"SIZE" + struct.pack("<II", len(size_chunk), 0) + size_chunk)
        xyzi = struct.pack("<I", len(voxels))
        for x, y, z, color in voxels:
            xyzi += struct.pack("<BBBB", x, y, z, color)
        content.extend(b"XYZI" + struct.pack("<II", len(xyzi), 0) + xyzi)
        rgba = b"".join(struct.pack("<BBBB", r, g, b, a) for r, g, b, a in palette)
        content.extend(b"RGBA" + struct.pack("<II", len(rgba), 0) + rgba)
        fh.write(b"MAIN" + struct.pack("<II", 0, len(content)) + content)


def build_model():
    rng = random.Random(SEED)
    grid = Grid()
    for _, builder in PIECES:
        builder(grid, rng)
    return grid


def main():
    grid = build_model()
    voxels = grid.voxels()
    if len(voxels) < 1000:
        print("ERROR: generated voxel count is too low")
        return 1
    write_vox("chameleon.vox", voxels, build_palette())
    export_piece_manifest("chameleon_manifest.json")
    print("Generated chameleon.vox")
    print("Generated chameleon_manifest.json")
    print(f"Voxel count: {len(voxels)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
