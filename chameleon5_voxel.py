#!/usr/bin/env python3
"""
Chameleon 5 — Premium Voxel Chameleon Generator (VGM-P Protocol)
================================================================

A fully rewritten, anatomically faithful Panther Chameleon voxel asset
for mobile-game use.  Built with SDF ellipsoids, Bézier splines, and
procedural surface texturing — every piece has its own generator so it
can be fine-tuned independently.

Piece manifest
--------------
01_branch             — irregular dark branch crossing the scene
02_body_main          — arched laterally-compressed torso
03_back_arch          — dorsal ridge line
04_head_main          — triangular/wedge-shaped skull
05_head_casque        — elevated casque behind the eyes
06_snout              — tapered muzzle with mouth line
07_eye_turret_right   — protruding ocular turret (visible side)
08_eye_turret_left    — protruding ocular turret (far side, partial)
09_eye_detail         — iris, pupil, highlight on both eyes
10_front_left_leg     — forelimb with elbow bend
11_front_right_leg    — forelimb (far side, darker)
12_back_left_leg      — hindlimb
13_back_right_leg     — hindlimb (far side)
14_gripping_toes      — zygodactyl toes clasping the branch
15_spiral_tail        — 1.75-turn logarithmic spiral
16_dorsal_spikes      — small scale-spines along the ridge
17_cyan_lateral_stripe— irregular cyan band on flanks
18_scale_noise        — procedural granular scale dots
19_color_spots        — brown-red irregular patches
20_shadow_pass        — darken undersides
21_highlight_pass     — brighten dorsal / camera-facing surfaces

Output: chameleon5.vox  (MagicaVoxel 150 format)
              chameleon5_manifest.json
"""

import json
import math
import random
import struct
import sys

# ---------------------------------------------------------------------------
# Grid dimensions
# ---------------------------------------------------------------------------
SIZE_X = 128
SIZE_Y = 72
SIZE_Z = 80
SEED = 8127

# ---------------------------------------------------------------------------
# Indexed colour palette — 21 colours mapped 1–21
# ---------------------------------------------------------------------------
COLORS = [
    ("body_lime_green",       (155, 203,  61),  1),
    ("body_yellow_green",     (201, 217,  58),  2),
    ("body_deep_green",       ( 63, 127,  54),  3),
    ("body_shadow_green",     ( 36,  87,  46),  4),
    ("body_highlight_yellow", (220, 233,  90),  5),
    ("stripe_cyan_light",     (142, 217, 230),  6),
    ("stripe_cyan_shadow",    ( 75, 168, 184),  7),
    ("eye_red_orange",        (183,  71,  50),  8),
    ("eye_dark_red",          (106,  31,  29),  9),
    ("eye_black",             (  8,   6,   4), 10),
    ("eye_highlight",         (246, 244, 232), 11),
    ("mouth_line_light",      (242, 231, 138), 12),
    ("mouth_shadow",          ( 94,  68,  44), 13),
    ("spot_brown_red",        (139,  62,  47), 14),
    ("spot_dark_brown",       ( 75,  42,  31), 15),
    ("spot_yellow",           (230, 216,  80), 16),
    ("spot_light_green",      (185, 230,  90), 17),
    ("claw_dark",             ( 28,  26,  22), 18),
    ("branch_dark_brown",     ( 28,  22,  20), 19),
    ("branch_mid_brown",      ( 58,  42,  34), 20),
    ("branch_highlight",      ( 90,  64,  50), 21),
]

C = {name: idx for name, _, idx in COLORS}

# ---------------------------------------------------------------------------
# Maths helpers
# ---------------------------------------------------------------------------

def lerp(a, b, t):
    return a + (b - a) * t

def lerp3(a, b, t):
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))

def dist3(a, b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)

def catmull_rom(p0, p1, p2, p3, t):
    """Evaluate Catmull-Rom spline at parameter t."""
    t2 = t * t
    t3 = t2 * t
    return (
        0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
        0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
        0.5 * ((2*p1[2]) + (-p0[2]+p2[2])*t + (2*p0[2]-5*p1[2]+4*p2[2]-p3[2])*t2 + (-p0[2]+3*p1[2]-3*p2[2]+p3[2])*t3),
    )

def evaluate_catmull_chain(points, steps_per_seg):
    """Walk a full Catmull-Rom chain with virtual end-tangents."""
    pts = list(points)
    # virtual endpoints to keep tangent continuity
    pts.insert(0, (2*pts[0][0]-pts[1][0], 2*pts[0][1]-pts[1][1], 2*pts[0][2]-pts[1][2]))
    pts.append((2*pts[-1][0]-pts[-2][0], 2*pts[-1][1]-pts[-2][1], 2*pts[-1][2]-pts[-2][2]))
    result = []
    for i in range(1, len(pts)-2):
        for s in range(steps_per_seg):
            t = s / steps_per_seg
            result.append(catmull_rom(pts[i-1], pts[i], pts[i+1], pts[i+2], t))
    result.append(pts[-2])
    return result

def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

# ---------------------------------------------------------------------------
# Voxel grid with SDF primitives
# ---------------------------------------------------------------------------

class Grid:
    def __init__(self, sx=SIZE_X, sy=SIZE_Y, sz=SIZE_Z):
        self.sx, self.sy, self.sz = sx, sy, sz
        self.data = bytearray(sx * sy * sz)

    def _idx(self, x, y, z):
        return x * self.sy * self.sz + y * self.sz + z

    def in_bounds(self, x, y, z):
        return 0 <= x < self.sx and 0 <= y < self.sy and 0 <= z < self.sz

    def set(self, x, y, z, color):
        xi, yi, zi = int(round(x)), int(round(y)), int(round(z))
        if self.in_bounds(xi, yi, zi):
            self.data[self._idx(xi, yi, zi)] = color

    def get(self, x, y, z):
        xi, yi, zi = int(round(x)), int(round(y)), int(round(z))
        if self.in_bounds(xi, yi, zi):
            return self.data[self._idx(xi, yi, zi)]
        return 0

    def set_if_empty(self, x, y, z, color):
        xi, yi, zi = int(round(x)), int(round(y)), int(round(z))
        if self.in_bounds(xi, yi, zi):
            idx = self._idx(xi, yi, zi)
            if self.data[idx] == 0:
                self.data[idx] = color

    # --- SDF primitives ---

    def ellipsoid(self, cx, cy, cz, rx, ry, rz, color, hollow=False, overwrite=True):
        """Place an SDF ellipsoid.  hollow keeps only the shell."""
        x0 = max(0, int(cx - rx) - 1)
        x1 = min(self.sx, int(cx + rx) + 2)
        y0 = max(0, int(cy - ry) - 1)
        y1 = min(self.sy, int(cy + ry) + 2)
        z0 = max(0, int(cz - rz) - 1)
        z1 = min(self.sz, int(cz + rz) + 2)
        rx2, ry2, rz2 = max(0.01, rx*rx), max(0.01, ry*ry), max(0.01, rz*rz)
        shell = 0.78 if hollow else -1.0
        setter = self.set if overwrite else self.set_if_empty
        for x in range(x0, x1):
            dx = (x - cx)**2 / rx2
            if dx > 1.0:
                continue
            for y in range(y0, y1):
                dy = (y - cy)**2 / ry2
                if dx + dy > 1.0:
                    continue
                for z in range(z0, z1):
                    d = dx + dy + (z - cz)**2 / rz2
                    if d <= 1.0 and d >= shell:
                        setter(x, y, z, color)

    def sphere(self, cx, cy, cz, r, color, hollow=False, overwrite=True):
        self.ellipsoid(cx, cy, cz, r, r, r, color, hollow=hollow, overwrite=overwrite)

    def capsule(self, p0, p1, r, color, overwrite=True):
        """SDF capsule between two 3D points."""
        ax, ay, az = p0
        bx, by, bz = p1
        dx, dy, dz = bx-ax, by-ay, bz-az
        length2 = dx*dx + dy*dy + dz*dz
        length = math.sqrt(length2) if length2 > 0 else 0.001
        mn = [min(ax,bx)-r-1, min(ay,by)-r-1, min(az,bz)-r-1]
        mx = [max(ax,bx)+r+2, max(ay,by)+r+2, max(az,bz)+r+2]
        setter = self.set if overwrite else self.set_if_empty
        for x in range(max(0, int(mn[0])), min(self.sx, int(mx[0])+1)):
            for y in range(max(0, int(mn[1])), min(self.sy, int(mx[1])+1)):
                for z in range(max(0, int(mn[2])), min(self.sz, int(mx[2])+1)):
                    px, py, pz = x-ax, y-ay, z-az
                    t = max(0.0, min(1.0, (px*dx + py*dy + pz*dz) / length2))
                    closest = (ax+t*dx, ay+t*dy, az+t*dz)
                    dist = math.sqrt((x-closest[0])**2 + (y-closest[1])**2 + (z-closest[2])**2)
                    if dist <= r:
                        setter(x, y, z, color)

    def voxels(self):
        out = []
        for x in range(self.sx):
            base_x = x * self.sy * self.sz
            for y in range(self.sy):
                base_xy = base_x + y * self.sz
                for z in range(self.sz):
                    c = self.data[base_xy + z]
                    if c:
                        out.append((x, y, z, c))
        return out


def is_surface(grid, x, y, z):
    if not grid.get(x, y, z):
        return False
    for dx, dy, dz in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)):
        if grid.get(x+dx, y+dy, z+dz) == 0:
            return True
    return False


# ---------------------------------------------------------------------------
# Tube drawing along a point list with variable radius & colour
# ---------------------------------------------------------------------------

def draw_tube(points, radii, colors, grid, overwrite=True):
    """Draw a tube of spheres along a polyline with interpolated radius."""
    prev = None
    for pt, r, col in zip(points, radii, colors):
        if prev is not None:
            d = dist3(prev[0], pt)
            steps = max(2, int(d * 1.8))
            for i in range(1, steps + 1):
                t = i / steps
                p = lerp3(prev[0], pt, t)
                ri = lerp(prev[1], r, t)
                ci = prev[2] if t < 0.5 else col
                grid.sphere(p[0], p[1], p[2], max(1.0, ri), ci, overwrite=overwrite)
        prev = (pt, r, col)


# ---------------------------------------------------------------------------
# Shared body backbone (Catmull-Rom fit to chameleon arch)
# ---------------------------------------------------------------------------

def body_backbone():
    """Return the spine as (x, y, z) control points with the body arching
    upward and the head rising.  Y is roughly centred at 36."""
    return [
        (38, 36, 28),
        (46, 36, 36),
        (55, 36, 44),
        (65, 35, 48),
        (75, 34, 47),
        (84, 34, 44),
    ]


def spine_points():
    """Dense Catmull-Rom sampling of the backbone for surface attachment."""
    return evaluate_catmull_chain(body_backbone(), 12)


# ===================================================================
# PIECE GENERATORS
# ===================================================================

def piece_01_branch(grid, rng):
    """Irregular dark branch crossing the scene diagonally."""
    knots = [
        ( 4, 42, 18),
        (18, 41, 20),
        (35, 40, 23),
        (52, 39, 25),
        (70, 38, 27),
        (88, 37, 29),
        (105, 36, 31),
        (122, 35, 33),
    ]
    pts = evaluate_catmull_chain(knots, 8)
    for i, pt in enumerate(pts):
        t = i / max(1, len(pts)-1)
        # Variable radius gives organic feel
        r = 4.8 + math.sin(t * math.pi * 5.2 + 0.3) * 1.1
        # Slight Y wobble
        py = pt[1] + math.sin(t * math.pi * 3.7) * 0.8
        grid.sphere(pt[0], py, pt[2], r, C["branch_dark_brown"])
    # Surface texture — mid-brown / highlight streaks
    for i, pt in enumerate(pts):
        x, y, z = int(round(pt[0])), int(round(pt[1])), int(round(pt[2]))
        if rng.random() > 0.30:
            grid.set(x, y-1, z+1, C["branch_mid_brown"])
            grid.set(x+1, y-1, z, C["branch_mid_brown"])
        if rng.random() > 0.65:
            grid.set(x, y-2, z+2, C["branch_highlight"])
            grid.set(x-1, y-2, z+1, C["branch_highlight"])


def piece_02_body_main(grid, rng):
    """Arched, laterally-compressed torso built from chained ellipsoids
    along the backbone.  Wider dorsal arch, narrower belly."""
    bk = body_backbone()
    pts = evaluate_catmull_chain(bk, 6)
    n = len(pts)
    for i, pt in enumerate(pts):
        t = i / max(1, n-1)
        # lateral compression (Y is depth / width)
        ry = lerp(8, 13, math.sin(t * math.pi))       # widest at middle
        # dorsal arch (Z height) — taller in the middle
        rz = lerp(9, 16, math.sin(t * math.pi))
        # X extent (along body)
        rx = lerp(5, 8, math.sin(t * math.pi))
        # Shift centre upward so dorsal ridge is higher
        cz = pt[2] + rz * 0.08
        # Taper head and tail ends
        head_taper = smoothstep(0.0, 0.15, t)
        tail_taper = smoothstep(1.0, 0.85, t)
        scale = head_taper * tail_taper
        ry *= max(0.35, scale)
        rz *= max(0.40, scale)
        rx *= max(0.45, scale)
        # Alternate lime/yellow-green for subtle banding
        color = C["body_lime_green"] if int(t * 14) % 2 == 0 else C["body_yellow_green"]
        grid.ellipsoid(pt[0], pt[1], cz, rx, ry, rz, color)

    # Underbelly shadow ellipsoids
    for i, pt in enumerate(pts):
        t = i / max(1, n-1)
        if 0.15 < t < 0.85:
            ry = lerp(5, 9, math.sin(t * math.pi))
            rz = lerp(4, 7, math.sin(t * math.pi))
            grid.ellipsoid(pt[0], pt[1], pt[2] - rz*0.6, 4, ry*0.8, rz*0.45,
                           C["body_shadow_green"])


def piece_03_back_arch(grid, rng):
    """Dorsal ridge line — runs along the top of the body."""
    bk = body_backbone()
    pts = evaluate_catmull_chain(bk, 10)
    for i, pt in enumerate(pts):
        t = i / max(1, len(pts)-1)
        if t < 0.08 or t > 0.92:
            continue
        height = math.sin(t * math.pi) * 18 + 4
        x, y = pt[0], pt[1]
        z_top = pt[2] + height
        # Small ridge capsule
        grid.capsule((x, y-1, z_top-1), (x, y+1, z_top-1), 1.8, C["body_deep_green"])
        if rng.random() > 0.5:
            grid.set(int(x), int(y), int(z_top)+1, C["body_highlight_yellow"])


def piece_04_head_main(grid, rng):
    """Triangular / wedge-shaped chameleon skull pointing right (+X).
    Uses decreasing cross-section ellipsoids to form a tapered wedge."""
    # Head base near body
    head_start_x = 82
    head_end_x = 114
    head_len = head_end_x - head_start_x
    cy_base = 34
    cz_base = 46

    for i in range(head_len + 1):
        t = i / head_len   # 0 = back of head, 1 = tip of snout
        x = head_start_x + i
        # Lateral width tapers toward snout
        ry = lerp(11, 3.5, t**0.7)
        # Height tapers too but less dramatically
        rz = lerp(12, 4.0, t**0.65)
        # Lift upward slightly toward front
        cz = cz_base + t * 4.5
        cy = cy_base - t * 1.5

        # Upper half gets deep green for crest transition
        if t < 0.35:
            color_top = C["body_deep_green"]
            color_body = C["body_lime_green"]
        elif t < 0.7:
            color_top = C["body_yellow_green"]
            color_body = C["body_yellow_green"]
        else:
            color_top = C["body_yellow_green"]
            color_body = C["body_highlight_yellow"]

        # Fill with per-voxel zone colouring
        ry2, rz2 = max(0.01, ry*ry), max(0.01, rz*rz)
        for dy in range(-int(ry)-1, int(ry)+2):
            for dz in range(-int(rz)-1, int(rz)+2):
                nd = (dy*dy)/ry2 + (dz*dz)/rz2
                if nd <= 1.0:
                    color = color_top if dz > rz*0.4 else color_body
                    grid.set(x, cy+dy, cz+dz, color)


def piece_05_head_casque(grid, rng):
    """Elevated casque — the bony helmet behind/above the eyes.
    Shaped as a tilted ellipsoidal plate."""
    # Main casque volume
    grid.ellipsoid(90, 34, 60, 10, 7, 7, C["body_deep_green"])
    # Upper highlight
    grid.ellipsoid(92, 33, 63, 6, 5, 4, C["body_yellow_green"])
    # Peak
    grid.ellipsoid(91, 34, 66, 4, 3, 3, C["body_highlight_yellow"])
    # Shadow edge on rear
    for x in range(84, 97):
        for y in range(28, 40):
            z = 59
            if grid.get(x, y, z) and not grid.get(x-1, y, z):
                grid.set(x, y, z, C["body_shadow_green"])
    # Granular texture on casque
    for _ in range(60):
        x = rng.randint(85, 96)
        y = rng.randint(29, 39)
        z = rng.randint(57, 66)
        if is_surface(grid, x, y, z):
            grid.set(x, y, z, rng.choice([C["body_deep_green"], C["body_shadow_green"],
                                           C["body_highlight_yellow"]]))


def piece_06_snout(grid, rng):
    """Tapered muzzle with mouth line."""
    # Snout taper
    for i in range(12):
        t = i / 11
        x = 110 + i
        r = max(1.3, 5.0 - t * 3.5)
        cy = 33 - t * 1.5
        cz = 50 + t * 2.0
        grid.sphere(x, cy, cz, r, C["body_yellow_green"])

    # Nostrils — two dark dots near tip
    grid.set(120, 31, 52, C["body_shadow_green"])
    grid.set(120, 35, 52, C["body_shadow_green"])

    # Mouth line — light line with shadow below
    for i in range(20):
        x = 96 + i
        y_mouth = 30
        z_mouth = 46 + int(i * 0.15)
        if grid.get(x, y_mouth, z_mouth) or grid.get(x, y_mouth, z_mouth+1):
            grid.set(x, y_mouth, z_mouth, C["mouth_line_light"])
            grid.set(x, y_mouth, z_mouth-1, C["mouth_shadow"])
        # Far side too
        y_far = 38
        if grid.get(x, y_far, z_mouth) or grid.get(x, y_far, z_mouth+1):
            grid.set(x, y_far, z_mouth, C["mouth_line_light"])
            grid.set(x, y_far, z_mouth-1, C["mouth_shadow"])


def piece_07_eye_turret_right(grid, rng):
    """Right eye — protruding ocular turret (visible / near side).
    The turret is a prominent hemisphere jutting laterally."""
    # Base socket bulge
    grid.ellipsoid(98, 25, 51, 7, 7, 6, C["body_yellow_green"])
    # Protruding turret
    grid.sphere(100, 22, 51, 6, C["body_lime_green"])
    # Ring shadow around turret
    grid.sphere(100, 22, 51, 7, C["body_shadow_green"], hollow=True)


def piece_08_eye_turret_left(grid, rng):
    """Left eye turret (far side — partially visible in 3/4 iso)."""
    grid.ellipsoid(98, 43, 51, 7, 7, 6, C["body_yellow_green"])
    grid.sphere(100, 46, 51, 6, C["body_lime_green"])
    grid.sphere(100, 46, 51, 7, C["body_shadow_green"], hollow=True)


def piece_09_eye_detail(grid, rng):
    """Iris, pupil, and highlight for both eyes."""
    # Right eye
    grid.sphere(102, 19, 51, 4, C["eye_red_orange"])        # iris
    grid.sphere(103, 18, 51, 2.2, C["eye_dark_red"])         # inner iris
    grid.sphere(104, 17, 51, 1.3, C["eye_black"])            # pupil
    grid.set(105, 16, 52, C["eye_highlight"])                 # specular
    grid.set(104, 16, 53, C["eye_highlight"])

    # Left eye (far side — subtle)
    grid.sphere(102, 49, 51, 4, C["eye_red_orange"])
    grid.sphere(103, 50, 51, 2.2, C["eye_dark_red"])
    grid.sphere(104, 51, 51, 1.3, C["eye_black"])
    grid.set(105, 52, 52, C["eye_highlight"])


def _draw_limb(grid, joints, radii, colors):
    """Draw a segmented limb from shoulder to foot."""
    for i in range(len(joints)-1):
        p0, p1 = joints[i], joints[i+1]
        r0, r1 = radii[i], radii[i+1]
        c = colors[i]
        steps = max(3, int(dist3(p0, p1) * 1.6))
        for s in range(steps+1):
            t = s / steps
            p = lerp3(p0, p1, t)
            r = lerp(r0, r1, t)
            grid.sphere(p[0], p[1], p[2], max(1, r), c)


def piece_10_front_left_leg(grid, rng):
    """Near-side forelimb — shoulder to branch."""
    joints = [
        (80, 30, 40),  # shoulder
        (79, 28, 36),  # elbow
        (78, 29, 32),  # wrist
        (77, 32, 27),  # hand on branch
    ]
    _draw_limb(grid, joints, [4, 3.5, 3, 2.8],
               [C["body_lime_green"], C["body_yellow_green"],
                C["body_deep_green"], C["body_deep_green"]])


def piece_11_front_right_leg(grid, rng):
    """Far-side forelimb — darker, partially occluded."""
    joints = [
        (82, 42, 40),
        (81, 43, 36),
        (80, 42, 32),
        (79, 40, 28),
    ]
    _draw_limb(grid, joints, [4, 3.5, 3, 2.8],
               [C["body_deep_green"], C["body_shadow_green"],
                C["body_shadow_green"], C["body_shadow_green"]])


def piece_12_back_left_leg(grid, rng):
    """Near-side hindlimb."""
    joints = [
        (50, 30, 35),
        (49, 29, 31),
        (48, 30, 27),
        (47, 33, 23),
    ]
    _draw_limb(grid, joints, [4.5, 3.5, 3, 2.8],
               [C["body_lime_green"], C["body_lime_green"],
                C["body_deep_green"], C["body_deep_green"]])


def piece_13_back_right_leg(grid, rng):
    """Far-side hindlimb."""
    joints = [
        (52, 42, 35),
        (51, 43, 31),
        (50, 42, 27),
        (49, 40, 24),
    ]
    _draw_limb(grid, joints, [4.5, 3.5, 3, 2.8],
               [C["body_shadow_green"], C["body_shadow_green"],
                C["body_deep_green"], C["body_deep_green"]])


def piece_14_gripping_toes(grid, rng):
    """Zygodactyl toes wrapping around the branch.
    Each foot has two groups: 2 inner toes + 3 outer toes."""
    foot_defs = [
        # (foot_centre, branch_y_level, near_side_sign)
        ((77, 32, 26), 1),    # front-left
        ((79, 40, 27), -1),   # front-right
        ((47, 33, 22), 1),    # back-left
        ((49, 40, 23), -1),   # back-right
    ]
    for (fx, fy, fz), side in foot_defs:
        # Inner group (2 toes curling under branch)
        for d in range(-1, 1):
            grid.set(fx+d, fy, fz-1, C["claw_dark"])
            grid.set(fx+d, fy+side, fz-2, C["claw_dark"])
            grid.set(fx+d, fy, fz, C["body_deep_green"])
        # Outer group (3 toes on top)
        for d in range(-1, 2):
            grid.set(fx+d, fy-side, fz+1, C["body_deep_green"])
            grid.set(fx+d, fy-side, fz+2, C["claw_dark"])


def piece_15_spiral_tail(grid, rng):
    """Logarithmic spiral tail — 1.75 turns, decreasing radius,
    integrated smoothly from the body's rear."""
    # Anchor point (where tail meets body)
    anchor = (38, 36, 28)
    # Spiral parameters
    cx_spiral = 26
    cy_spiral = 36
    cz_spiral = 14
    turns = 1.75
    n_steps = 160
    spiral_radius_start = 18.0
    spiral_radius_end = 3.0
    tube_r_start = 7.0
    tube_r_end = 1.8

    prev = None
    for i in range(n_steps):
        t = i / (n_steps - 1)
        angle = t * turns * 2.0 * math.pi

        # Logarithmic spiral radius decay
        sr = lerp(spiral_radius_start, spiral_radius_end, t**0.75)

        # Position on spiral — XZ plane, centred at (cx, cz)
        px = cx_spiral + math.cos(angle) * sr * 0.7
        py = cy_spiral + math.sin(angle) * sr * 0.35  # slight Y wobble for 3D
        pz = cz_spiral + math.sin(angle) * sr * 0.85

        # Blend from anchor for the first 15% of the curve
        if t < 0.15:
            blend = t / 0.15
            px = lerp(anchor[0], px, blend)
            py = lerp(anchor[1], py, blend)
            pz = lerp(anchor[2], pz, blend)

        r = lerp(tube_r_start, tube_r_end, t)

        # Colour banding — alternating green / yellow / brown-red
        band_idx = int(angle / (math.pi * 0.4)) % 6
        band_colors = [
            C["body_lime_green"],
            C["body_yellow_green"],
            C["body_deep_green"],
            C["body_highlight_yellow"],
            C["spot_brown_red"],
            C["body_lime_green"],
        ]
        color = band_colors[band_idx]

        if prev is not None:
            d = dist3(prev, (px, py, pz))
            steps = max(2, int(d * 1.5))
            for s in range(1, steps+1):
                st = s / steps
                ip = lerp3(prev, (px, py, pz), st)
                ir = lerp(prev_r, r, st)
                grid.sphere(ip[0], ip[1], ip[2], max(1.0, ir), color)

        prev = (px, py, pz)
        prev_r = r


def piece_16_dorsal_spikes(grid, rng):
    """Small scale-spines along the dorsal ridge."""
    bk = body_backbone()
    pts = evaluate_catmull_chain(bk, 8)
    for i, pt in enumerate(pts):
        t = i / max(1, len(pts)-1)
        if t < 0.10 or t > 0.90:
            continue
        # Height of body at this position
        body_h = math.sin(t * math.pi) * 16
        x, y = int(round(pt[0])), int(round(pt[1]))
        z_top = int(round(pt[2] + body_h + 2))

        if i % 2 == 0:
            # Alternating green/yellow spikes
            spike_col = C["body_deep_green"] if rng.random() > 0.4 else C["body_highlight_yellow"]
            grid.set(x, y, z_top, spike_col)
            grid.set(x, y, z_top+1, spike_col)
            if rng.random() > 0.55:
                grid.set(x, y, z_top+2, C["body_shadow_green"])
            # Flanking shadow
            grid.set(x, y-1, z_top, C["body_shadow_green"])
            grid.set(x, y+1, z_top, C["body_shadow_green"])


def piece_17_cyan_lateral_stripe(grid, rng):
    """Irregular cyan / teal band along the visible flank.
    Follows the body curvature from shoulder to hip."""
    bk = body_backbone()
    pts = evaluate_catmull_chain(bk, 10)
    n = len(pts)
    for i, pt in enumerate(pts):
        t = i / max(1, n-1)
        if t < 0.12 or t > 0.88:
            continue
        # Intensity fades at edges
        intensity = math.sin((t - 0.12) / 0.76 * math.pi)
        if rng.random() > intensity * 0.85:
            continue
        x = int(round(pt[0]))
        # Apply on the near side (lower Y values)
        body_w = lerp(6, 11, math.sin(t * math.pi))
        y_near = int(round(pt[1] - body_w * 0.55))
        z_mid = int(round(pt[2] + math.sin(t * math.pi) * 4))

        width = 3 if rng.random() > 0.3 else 4
        for dy in range(-1, 2):
            for dz in range(-width, width+1):
                px, py, pz = x, y_near + dy, z_mid + dz
                if grid.get(px, py, pz) and is_surface(grid, px, py, pz):
                    col = C["stripe_cyan_light"] if rng.random() > 0.25 else C["stripe_cyan_shadow"]
                    grid.set(px, py, pz, col)


def piece_18_scale_noise(grid, rng):
    """Procedural granular scale dots across body, head, and tail."""
    for _ in range(1600):
        x = rng.randint(20, 120)
        y = rng.randint(18, 54)
        z = rng.randint(12, 68)
        if not is_surface(grid, x, y, z):
            continue
        base = grid.get(x, y, z)
        # Only modulate green-family voxels
        if base not in (C["body_lime_green"], C["body_yellow_green"],
                        C["body_deep_green"], C["body_highlight_yellow"]):
            continue
        roll = rng.random()
        if roll < 0.28:
            grid.set(x, y, z, C["spot_yellow"])
        elif roll < 0.48:
            grid.set(x, y, z, C["spot_light_green"])
        elif roll < 0.66:
            grid.set(x, y, z, C["body_deep_green"])
        elif roll < 0.80:
            grid.set(x, y, z, C["body_highlight_yellow"])
        else:
            grid.set(x, y, z, C["body_yellow_green"])


def piece_19_color_spots(grid, rng):
    """Irregular brown-red patches at anatomically plausible locations."""
    spot_defs = [
        # (cx, cy, cz, radius)
        (52, 32, 42, 4),
        (62, 29, 44, 5),
        (72, 30, 43, 4),
        (92, 31, 48, 3),
        (42, 34, 35, 3),
        (34, 38, 26, 4),
        (28, 38, 18, 3),
        (56, 40, 40, 3),
    ]
    for cx, cy, cz, r in spot_defs:
        for x in range(cx-r-1, cx+r+2):
            for y in range(cy-r-1, cy+r+2):
                for z in range(cz-r-1, cz+r+2):
                    if is_surface(grid, x, y, z):
                        d = math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2)
                        # Soft falloff
                        if d <= r * (0.7 + rng.random() * 0.5):
                            col = C["spot_brown_red"] if d < r * 0.55 else C["spot_dark_brown"]
                            grid.set(x, y, z, col)


def piece_20_shadow_pass(grid, rng):
    """Darken undersides and bottom-facing surfaces."""
    bk = body_backbone()
    pts = evaluate_catmull_chain(bk, 6)
    # Find the Z range of the belly
    for x in range(20, 122):
        for y in range(18, 54):
            for z in range(10, 38):
                c = grid.get(x, y, z)
                if c in (C["body_lime_green"], C["body_yellow_green"],
                         C["body_highlight_yellow"]):
                    if is_surface(grid, x, y, z):
                        # Check if bottom-facing (no voxel below)
                        if grid.get(x, y, z-1) == 0:
                            grid.set(x, y, z, C["body_shadow_green"])
                        elif rng.random() > 0.65:
                            grid.set(x, y, z, C["body_deep_green"])


def piece_21_highlight_pass(grid, rng):
    """Brighten dorsal / camera-facing (low-Y) surfaces."""
    for x in range(35, 115):
        for y in range(18, 36):
            for z in range(40, 70):
                c = grid.get(x, y, z)
                if c in (C["body_lime_green"], C["body_deep_green"]):
                    if is_surface(grid, x, y, z):
                        # Camera-facing surfaces (low Y = near side)
                        if grid.get(x, y-1, z) == 0 and rng.random() > 0.40:
                            grid.set(x, y, z, C["body_highlight_yellow"])
                        # Top-facing
                        elif grid.get(x, y, z+1) == 0 and rng.random() > 0.50:
                            grid.set(x, y, z, C["body_yellow_green"])


# ---------------------------------------------------------------------------
# Piece registry
# ---------------------------------------------------------------------------

PIECES = [
    ("01_branch",              piece_01_branch),
    ("02_body_main",           piece_02_body_main),
    ("03_back_arch",           piece_03_back_arch),
    ("04_head_main",           piece_04_head_main),
    ("05_head_casque",         piece_05_head_casque),
    ("06_snout",               piece_06_snout),
    ("07_eye_turret_right",    piece_07_eye_turret_right),
    ("08_eye_turret_left",     piece_08_eye_turret_left),
    ("09_eye_detail",          piece_09_eye_detail),
    ("10_front_left_leg",      piece_10_front_left_leg),
    ("11_front_right_leg",     piece_11_front_right_leg),
    ("12_back_left_leg",       piece_12_back_left_leg),
    ("13_back_right_leg",      piece_13_back_right_leg),
    ("14_gripping_toes",       piece_14_gripping_toes),
    ("15_spiral_tail",         piece_15_spiral_tail),
    ("16_dorsal_spikes",       piece_16_dorsal_spikes),
    ("17_cyan_lateral_stripe", piece_17_cyan_lateral_stripe),
    ("18_scale_noise",         piece_18_scale_noise),
    ("19_color_spots",         piece_19_color_spots),
    ("20_shadow_pass",         piece_20_shadow_pass),
    ("21_highlight_pass",      piece_21_highlight_pass),
]

# ---------------------------------------------------------------------------
# VOX export (MagicaVoxel format 150)
# ---------------------------------------------------------------------------

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
        # SIZE chunk
        size_data = struct.pack("<III", sx, sy, sz)
        content.extend(b"SIZE" + struct.pack("<II", len(size_data), 0) + size_data)
        # XYZI chunk
        xyzi = struct.pack("<I", len(voxels))
        for x, y, z, c in voxels:
            xyzi += struct.pack("<BBBB", x, y, z, c)
        content.extend(b"XYZI" + struct.pack("<II", len(xyzi), 0) + xyzi)
        # RGBA palette
        rgba = b"".join(struct.pack("<BBBB", r, g, b, a) for r, g, b, a in palette)
        content.extend(b"RGBA" + struct.pack("<II", len(rgba), 0) + rgba)
        # MAIN wrapper
        fh.write(b"MAIN" + struct.pack("<II", 0, len(content)) + content)


def export_manifest(path):
    manifest = {
        "name": "chameleon5_premium_asset",
        "version": 5,
        "assetType": "animal",
        "species": "panther_chameleon",
        "style": "premium_voxel_semi_realistic",
        "dimensions": {"x": SIZE_X, "y": SIZE_Y, "z": SIZE_Z},
        "seed": SEED,
        "pieces": [name for name, _ in PIECES],
        "palette": {name: "#{:02X}{:02X}{:02X}".format(*rgb) for name, rgb, _ in COLORS},
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def build_model():
    rng = random.Random(SEED)
    grid = Grid()
    for name, builder in PIECES:
        print(f"  Building {name} …")
        builder(grid, rng)
    return grid


def main():
    print("=== Chameleon 5 — Premium Voxel Generator ===")
    grid = build_model()
    voxels = grid.voxels()
    count = len(voxels)
    if count < 2000:
        print(f"ERROR: only {count} voxels generated — model is too sparse")
        return 1
    write_vox("chameleon5.vox", voxels, build_palette())
    export_manifest("chameleon5_manifest.json")
    print(f"[OK] chameleon5.vox          ({count:,} voxels)")
    print(f"[OK] chameleon5_manifest.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
