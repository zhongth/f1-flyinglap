import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════
   Wind-tunnel smoke + laser-streamline effect
   ──────────────────────────────────────────────────────────────
   • 35 000 GPU particles  — dense, small, opaque smoke
   • 10 laser streamlines  — bright lines showing flow direction
   • Car-body deflection   — ellipsoid approximation
   • Wake upward billowing — matching real wind-tunnel behaviour
   ══════════════════════════════════════════════════════════════ */

/* ── Shared GLSL: Simplex 3-D noise (Ashima Arts / Ian McEwan) ── */
const NOISE_GLSL = /* glsl */ `
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

/* ── Shared GLSL: car-body deflection ── */
const CAR_DEFLECT_GLSL = /* glsl */ `
vec3 carDeflect(vec3 pos) {
  // Main body ellipsoid
  vec3 carC = vec3(0.0, 0.45, 0.0);
  vec3 axes = vec3(4.8, 0.85, 1.4);
  vec3 rel  = (pos - carC) / axes;
  float eDist = length(rel);

  if (eDist < 1.6) {
    float push = smoothstep(1.6, 0.6, eDist) * 1.4;
    vec3 dir = normalize(rel);
    dir.x *= 0.12;                       // don't push fore/aft much
    if (pos.y < 0.25) dir.y *= 0.3;     // ground-effect: don't push up too much
    dir = normalize(dir);
    pos += dir * axes * push * 0.45;
  }

  // Cockpit / airbox bump
  vec3 cockC = vec3(-0.3, 1.05, 0.0);
  vec3 cockA = vec3(1.6, 0.55, 0.55);
  vec3 cockR = (pos - cockC) / cockA;
  float cockD = length(cockR);
  if (cockD < 1.3) {
    float push = smoothstep(1.3, 0.5, cockD) * 0.8;
    vec3 dir = normalize(cockR);
    dir.x *= 0.1;
    dir = normalize(dir);
    pos += dir * cockA * push * 0.35;
  }

  // Clamp to floor
  pos.y = max(pos.y, 0.003);
  return pos;
}
`;

/* ═══════════════════════════════════════
   SMOKE PARTICLE SHADERS
   ═══════════════════════════════════════ */

const smokeVert = /* glsl */ `
${NOISE_GLSL}
${CAR_DEFLECT_GLSL}

attribute vec3 aRakePos;
attribute vec4 aRandom;

uniform float uTime;
uniform float uWindStrength;
uniform float uPixelRatio;

varying float vOpacity;
varying float vLife;

void main() {
  float speed = 4.0 * (0.55 + aRandom.x * 0.9);
  float totalDist = 28.0;
  float startX = -8.0;

  float life = mod(uTime * speed + aRandom.w * totalDist, totalDist);
  float progress = life / totalDist;

  vec3 pos;
  pos.x = startX + life;
  pos.y = aRakePos.y;
  pos.z = aRakePos.z;

  // ── Turbulence (2-octave FBM) ──
  float turbZone = smoothstep(-3.0, 4.0, pos.x);
  float wakeTurb = smoothstep(2.5, 9.0, pos.x) * 2.5;
  float turbAmt  = (turbZone * 0.35 + wakeTurb) * (0.35 + aRandom.y * 0.65);

  float nt  = uTime * 0.35;
  vec3  np  = vec3(pos.x * 0.22, aRandom.y * 8.0 + pos.z * 0.3, nt);
  float ny1 = snoise(np);
  float nz1 = snoise(np + vec3(31.7, 47.2, 0.0));
  float nx1 = snoise(np + vec3(74.1, 13.8, 0.0));
  vec3  np2 = np * 2.3 + vec3(100.0);
  float ny2 = snoise(np2) * 0.35;
  float nz2 = snoise(np2 + vec3(31.7, 47.2, 0.0)) * 0.35;

  pos.y += (ny1 + ny2) * turbAmt * 1.1;
  pos.z += (nz1 + nz2) * turbAmt * 0.8;
  pos.x += nx1 * turbAmt * 0.2;

  // ── Car body deflection ──
  pos = carDeflect(pos);

  // ── Wake: upward billowing + lateral spread ──
  float wakeZone = smoothstep(2.0, 9.0, pos.x);
  pos.y += wakeZone * progress * 1.0 * (0.2 + aRandom.y * 0.8);
  pos.z += aRakePos.z * wakeZone * 0.45;

  // ── Wake vortex ──
  float vortexReg = smoothstep(3.0, 7.0, pos.x) * smoothstep(16.0, 7.0, pos.x);
  if (vortexReg > 0.01) {
    float va = uTime * 2.0 + aRandom.z * 6.2832;
    float vr = vortexReg * 0.45 * (0.3 + aRandom.y * 0.7);
    pos.y += sin(va) * vr;
    pos.z += cos(va) * vr;
  }

  pos.y = max(pos.y, 0.003);

  // ── Opacity ──
  float fadeIn  = smoothstep(0.0, 0.04, progress);
  float fadeOut = smoothstep(1.0, 0.55, progress);

  // Denser near car surface
  vec3 surfRel = (pos - vec3(0.0, 0.45, 0.0)) / vec3(4.8, 0.85, 1.4);
  float surfDist = length(surfRel);
  float nearSurf = smoothstep(0.5, 0.0, surfDist - 1.0);

  vOpacity = fadeIn * fadeOut * uWindStrength * (0.55 + nearSurf * 0.6);
  vLife = progress;

  // ── Point size — small + dense ──
  float sz = mix(0.03, 0.12, progress);
  sz *= (0.5 + aRandom.x * 1.0);
  sz *= (1.0 + wakeTurb * 0.35);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = sz * (550.0 * uPixelRatio / -mv.z);
  gl_PointSize = max(gl_PointSize, 0.5);
}
`;

const smokeFrag = /* glsl */ `
varying float vOpacity;
varying float vLife;

void main() {
  float dist = length(gl_PointCoord - 0.5) * 2.0;
  if (dist > 1.0) discard;

  float alpha = exp(-dist * dist * 2.0);

  // White-cool → warm gray
  vec3 col = mix(vec3(0.85, 0.87, 0.92), vec3(0.50, 0.51, 0.53), vLife);

  gl_FragColor = vec4(col, alpha * vOpacity * 0.14);
}
`;

/* ═══════════════════════════════════════
   LASER STREAMLINE SHADERS
   ═══════════════════════════════════════ */

/* Shared streamline displacement + traveling-pulse logic.
   Expects: pos (vec3), lineY (float), lineZ (float),
   uniforms uTime, uWindStrength, uWindFront to be in scope.
   Writes vBrightness, vOpacity (must be declared as varyings). */
const STREAMLINE_BODY_GLSL = /* glsl */ `
  float progress = (pos.x + 8.0) / 26.0;

  // Turbulence — cleaner than smoke
  float turbZone = smoothstep(0.12, 0.50, progress);
  float wakeTurb = smoothstep(0.42, 0.82, progress) * 1.8;
  float turbAmt  = (turbZone * 0.18 + wakeTurb) * 0.32;

  float nt = uTime * 0.35;
  float ny = snoise(vec3(pos.x * 0.25, lineY * 3.0 + lineZ * 2.0, nt));
  float nz = snoise(vec3(pos.x * 0.25, lineY * 3.0 + lineZ * 2.0 + 50.0, nt));

  pos.y += ny * turbAmt;
  pos.z += nz * turbAmt * 0.22;

  pos = carDeflect(pos);

  // Wake rise
  float wakeZone = smoothstep(0.42, 0.82, progress);
  pos.y += wakeZone * 0.38 * (lineY * 0.3);

  // ── Traveling brightness pulse (3 overlapping waves) ──
  float phaseYZ = lineY * 4.0 + lineZ * 5.0;
  float p1 = sin((progress * 8.0  - uTime * 2.0 ) + phaseYZ       ) * 0.5 + 0.5;
  float p2 = sin((progress * 5.0  - uTime * 1.3 ) + phaseYZ * 1.9 ) * 0.5 + 0.5;
  float p3 = sin((progress * 13.0 - uTime * 3.5 ) + phaseYZ * 3.1 ) * 0.5 + 0.5;
  vBrightness = 0.08 + 0.92 * (p1 * 0.4 + p2 * 0.35 + p3 * 0.25);

  float fadeIn  = smoothstep(0.0, 0.03, progress);
  float fadeOut = smoothstep(1.0, 0.68, progress);
  vOpacity = fadeIn * fadeOut * uWindStrength;

  // ── Wind front — beam extends forward over time ──
  float behindFront = smoothstep(uWindFront, uWindFront - 3.0, pos.x);
  vOpacity *= behindFront;
`;

/* ── Crisp center-line shader ── */
const lineVert = /* glsl */ `
${NOISE_GLSL}
${CAR_DEFLECT_GLSL}

uniform float uTime;
uniform float uWindStrength;
uniform float uWindFront;

varying float vBrightness;
varying float vOpacity;

void main() {
  vec3 pos = position;
  float lineY = pos.y;
  float lineZ = pos.z;
  ${STREAMLINE_BODY_GLSL}
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const lineFrag = /* glsl */ `
uniform vec3 uTeamColor;

varying float vBrightness;
varying float vOpacity;

void main() {
  vec3 baseCol = mix(vec3(0.45, 0.55, 0.85), vec3(1.0, 1.0, 1.0), vBrightness);
  vec3 col = mix(baseCol, uTeamColor, 0.18);
  gl_FragColor = vec4(col, vOpacity * (0.15 + vBrightness * 0.45));
}
`;

/* ── Glow halo shader (Points along streamline paths) ── */
const glowVert = /* glsl */ `
${NOISE_GLSL}
${CAR_DEFLECT_GLSL}

attribute float aLineY;
attribute float aLineZ;

uniform float uTime;
uniform float uWindStrength;
uniform float uWindFront;
uniform float uPixelRatio;

varying float vBrightness;
varying float vOpacity;

void main() {
  vec3 pos = position;
  float lineY = aLineY;
  float lineZ = aLineZ;
  ${STREAMLINE_BODY_GLSL}

  float sz = mix(0.28, 0.50, wakeZone * 0.25);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = sz * (480.0 * uPixelRatio / -mv.z);
  gl_PointSize = max(gl_PointSize, 1.5);
}
`;

const glowFrag = /* glsl */ `
uniform vec3 uTeamColor;

varying float vBrightness;
varying float vOpacity;

void main() {
  float dist = length(gl_PointCoord - 0.5) * 2.0;
  if (dist > 1.0) discard;

  float alpha = exp(-dist * dist * 1.6);

  vec3 baseCol = mix(vec3(0.35, 0.48, 0.82), vec3(0.92, 0.95, 1.0), vBrightness);
  vec3 col = mix(baseCol, uTeamColor, 0.18);
  gl_FragColor = vec4(col, alpha * vOpacity * vBrightness * 0.18);
}
`;

/* ═══════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════ */

const PARTICLE_COUNT = 35_000;
const RAKE_SPAN_Z = 3.2;
const RAKE_YS = [
  0.01, 0.03, 0.07, 0.12,
  0.20, 0.30, 0.42,
  0.56, 0.72, 0.88,
  1.05, 1.20, 1.38,
  1.58, 1.80, 2.05,
  2.35, 2.70, 3.10, 3.50,
];

// 5 horizontal Z-strips (visible from top-down) × 6 Y-heights each
const STREAMLINE_ZS = [-2.0, -1.0, 0, 1.0, 2.0];
const STREAMLINE_YS = [0.35, 0.70, 1.05, 1.45, 1.90, 2.50];
const LINE_SUB_OFFSETS = [-0.006, 0, 0.006];
const VERTS_PER_LINE = 160;
const GLOW_PTS_PER_LINE = 200;
const LINE_X_START = -8;
const LINE_X_END = 18;
/** Wind-front travel speed at full wind (world-units / second) */
const WIND_FRONT_SPEED = 14;

/** Max simulated wind-tunnel speed (km/h) */
export const WIND_SPEED_MAX_KMH = 250;

/* ═══════════════════════════════════════
   EFFECT CLASS
   ═══════════════════════════════════════ */

export class WindTunnelEffect {
  private container: THREE.Group;
  private smokeMat: THREE.ShaderMaterial;
  private lineUniforms: Record<string, THREE.IUniform>;
  private lineMaterials: THREE.ShaderMaterial[] = [];
  private _running = false;
  private windDistance = 0;

  constructor() {
    this.container = new THREE.Group();

    /* ── Smoke particles ── */
    const count = PARTICLE_COUNT;
    const perLine = Math.floor(count / RAKE_YS.length);
    const rakePos = new Float32Array(count * 3);
    const rands = new Float32Array(count * 4);

    for (let line = 0; line < RAKE_YS.length; line++) {
      const baseY = RAKE_YS[line];
      for (let i = 0; i < perLine; i++) {
        const idx = line * perLine + i;
        if (idx >= count) break;
        const i3 = idx * 3;
        const i4 = idx * 4;
        rakePos[i3] = 0;
        rakePos[i3 + 1] = baseY + (Math.random() - 0.5) * 0.04;
        rakePos[i3 + 2] = (Math.random() - 0.5) * 2 * RAKE_SPAN_Z;
        rands[i4] = Math.random();
        rands[i4 + 1] = Math.random();
        rands[i4 + 2] = Math.random();
        rands[i4 + 3] = Math.random();
      }
    }

    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3),
    );
    smokeGeo.setAttribute(
      "aRakePos",
      new THREE.Float32BufferAttribute(rakePos, 3),
    );
    smokeGeo.setAttribute(
      "aRandom",
      new THREE.Float32BufferAttribute(rands, 4),
    );

    this.smokeMat = new THREE.ShaderMaterial({
      vertexShader: smokeVert,
      fragmentShader: smokeFrag,
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const smoke = new THREE.Points(smokeGeo, this.smokeMat);
    smoke.frustumCulled = false;
    this.container.add(smoke);

    /* ── Laser streamlines — 5 Z-strips × 6 Y-heights ── */
    this.lineUniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: 0 },
      uWindFront: { value: LINE_X_START },
      uTeamColor: { value: new THREE.Color(1, 1, 1) },
    };

    const lineMat = new THREE.ShaderMaterial({
      vertexShader: lineVert,
      fragmentShader: lineFrag,
      uniforms: this.lineUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lineMaterials.push(lineMat);

    for (const baseZ of STREAMLINE_ZS) {
      for (const baseY of STREAMLINE_YS) {
        for (const dy of LINE_SUB_OFFSETS) {
          const positions = new Float32Array(VERTS_PER_LINE * 3);
          for (let v = 0; v < VERTS_PER_LINE; v++) {
            const t = v / (VERTS_PER_LINE - 1);
            positions[v * 3] =
              LINE_X_START + t * (LINE_X_END - LINE_X_START);
            positions[v * 3 + 1] = baseY + dy;
            positions[v * 3 + 2] = baseZ;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3),
          );
          const line = new THREE.Line(geo, lineMat);
          line.frustumCulled = false;
          this.container.add(line);
        }
      }
    }

    /* ── Glow halo — Points along every streamline path ── */
    const totalStreamlines = STREAMLINE_ZS.length * STREAMLINE_YS.length;
    const glowCount = GLOW_PTS_PER_LINE * totalStreamlines;
    const glowPos = new Float32Array(glowCount * 3);
    const glowLineY = new Float32Array(glowCount);
    const glowLineZ = new Float32Array(glowCount);

    let gi = 0;
    for (const baseZ of STREAMLINE_ZS) {
      for (const baseY of STREAMLINE_YS) {
        for (let p = 0; p < GLOW_PTS_PER_LINE; p++) {
          const t = p / (GLOW_PTS_PER_LINE - 1);
          glowPos[gi * 3] =
            LINE_X_START + t * (LINE_X_END - LINE_X_START);
          glowPos[gi * 3 + 1] = baseY;
          glowPos[gi * 3 + 2] = baseZ;
          glowLineY[gi] = baseY;
          glowLineZ[gi] = baseZ;
          gi++;
        }
      }
    }

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(glowPos, 3),
    );
    glowGeo.setAttribute(
      "aLineY",
      new THREE.Float32BufferAttribute(glowLineY, 1),
    );
    glowGeo.setAttribute(
      "aLineZ",
      new THREE.Float32BufferAttribute(glowLineZ, 1),
    );

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      uniforms: {
        uTime: this.lineUniforms.uTime,
        uWindStrength: this.lineUniforms.uWindStrength,
        uWindFront: this.lineUniforms.uWindFront,
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.lineMaterials.push(glowMat);

    const glowPoints = new THREE.Points(glowGeo, glowMat);
    glowPoints.frustumCulled = false;
    this.container.add(glowPoints);
  }

  /* ── Public API ── */

  get mesh(): THREE.Group {
    return this.container;
  }

  get isActive(): boolean {
    return this._running || this.windStrength > 0.001;
  }

  get windStrength(): number {
    return this.smokeMat.uniforms.uWindStrength.value;
  }

  set windStrength(v: number) {
    this.smokeMat.uniforms.uWindStrength.value = v;
    this.lineUniforms.uWindStrength.value = v;
  }

  get windSpeedKmh(): number {
    return Math.round(this.windStrength * WIND_SPEED_MAX_KMH);
  }

  setTeamColor(color: THREE.Color) {
    this.lineUniforms.uTeamColor.value.copy(color);
  }

  start() {
    this._running = true;
    this.windDistance = 0;
    this.lineUniforms.uWindFront.value = LINE_X_START;
  }

  stop() {
    this._running = false;
  }

  update(delta: number) {
    if (!this.isActive) return;
    const t = this.smokeMat.uniforms.uTime.value + delta;
    this.smokeMat.uniforms.uTime.value = t;
    this.lineUniforms.uTime.value = t;

    // Advance wind front proportional to current wind strength
    this.windDistance += this.windStrength * WIND_FRONT_SPEED * delta;
    const maxTravel = LINE_X_END - LINE_X_START + 5; // overshoot buffer
    if (this.windDistance > maxTravel) this.windDistance = maxTravel;
    this.lineUniforms.uWindFront.value = LINE_X_START + this.windDistance;
  }

  dispose() {
    this.container.traverse((child) => {
      if (child instanceof THREE.Points || child instanceof THREE.Line) {
        child.geometry.dispose();
      }
    });
    this.smokeMat.dispose();
    for (const mat of this.lineMaterials) mat.dispose();
  }
}
