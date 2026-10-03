/** Isolated WebGL water surface. No layout work happens in the animation loop. */
const canvas = document.getElementById('water-canvas');
const stage = document.getElementById('water-stage');
const control = document.getElementById('water-motion');
const hint = document.getElementById('water-instruction');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
let cleanup = () => {};

if (!gl) {
  control.hidden = true;
  hint.textContent = 'Water, seen differently.';
} else {
  try { cleanup = initWater(gl); }
  catch (error) {
    canvas.classList.remove('ready');
    control.hidden = true;
    hint.textContent = 'Water, seen differently.';
    console.warn('Water renderer unavailable; using the still-water fallback.', error.message);
  }
}
window.addEventListener('pagehide', () => cleanup(), { once: true });

function initWater(gl) {
  const vertex = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragment = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D waterTexture;
    uniform vec2 resolution;
    uniform vec2 imageSize;
    uniform float time;
    uniform vec4 ripples[16];

    // Crossed wave trains form a surface normal; pointer impulses travel outwards.
    float heightAt(vec2 p) {
      float t = time * 0.3;
      float h = sin(p.x * 7.1 + p.y * 4.3 + t) * 0.019;
      h += sin(p.x * -3.8 + p.y * 8.4 - t * 1.3) * 0.013;
      h += sin(p.x * 13.5 + p.y * 17.2 + t * 0.7) * 0.006;
      h += sin(p.x * 25.2 - p.y * 20.7 - t * 1.2) * 0.0025;
      for (int i = 0; i < 16; i++) {
        vec4 r = ripples[i];
        float age = time - r.z;
        if (r.w > 0.0 && age >= 0.0 && age < 5.0) {
          float d = distance(p, r.xy);
          float front = d - age * 0.23;
          float envelope = exp(-front * front * 55.0) * exp(-age * 0.67);
          h += sin(front * 54.0) * envelope * r.w * 0.022;
        }
      }
      return h;
    }

    void main() {
      float aspect = resolution.x / resolution.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
      float e = 0.002;
      float h = heightAt(p);
      vec2 slope = vec2(heightAt(p + vec2(e, 0.0)) - h,
                        heightAt(p + vec2(0.0, e)) - h) / e;
      vec2 uv = vUv;
      float imageAspect = imageSize.x / imageSize.y;
      if (aspect > imageAspect) uv.y = (uv.y - 0.5) * imageAspect / aspect + 0.5;
      else uv.x = (uv.x - 0.5) * aspect / imageAspect + 0.5;
      uv += slope * 0.027;
      uv += vec2(sin(time * 0.075), cos(time * 0.055)) * 0.009;
      vec3 water = texture2D(waterTexture, clamp(uv, 0.005, 0.995)).rgb;
      vec3 normal = normalize(vec3(-slope * 1.1, 1.0));
      vec3 light = normalize(vec3(-0.55, 0.8, 1.2));
      float diffuse = max(dot(normal, light), 0.0);
      float reflection = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 55.0);
      water *= 0.92 + diffuse * 0.26;
      water += vec3(0.56, 0.78, 0.89) * reflection * 0.11;
      // Lift the blues without washing out the image's natural specular detail.
      water = mix(water, vec3(0.10, 0.34, 0.47), 0.13);
      gl_FragColor = vec4(water, 1.0);
    }
  `;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['waterTexture','resolution','imageSize','time','ripples[0]'].map(n => [n, gl.getUniformLocation(program, n)]));
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uniforms.waterTexture, 0);

  const impulses = new Float32Array(16 * 4);
  let impulseIndex = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let request = 0;
  let visible = true;
  let ready = false;
  let destroyed = false;
  let paused = reducedMotion.matches;
  let lastPointer = 0;
  let width = 1, height = 1;
  const image = new Image();

  function resize() {
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    width = box.width;
    height = box.height;
    // A bounded pixel budget keeps the shader light on mobile and high-DPI displays.
    const ratio = Math.min(devicePixelRatio || 1, 1.5, 1500 / width);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, width, height);
    if (ready) draw();
  }
  function draw() {
    if (!ready || destroyed) return;
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform4fv(uniforms['ripples[0]'], impulses);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function frame(now) {
    request = 0;
    if (!ready || paused || !visible || document.hidden || destroyed) return;
    if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, 0.04);
    lastFrame = now;
    draw();
    request = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(request);
    request = 0;
    lastFrame = 0;
    if (ready && !paused && visible && !document.hidden && !destroyed) request = requestAnimationFrame(frame);
  }
  function addRipple(event, strength) {
    if (!ready || paused || !visible) return;
    const bounds = stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / width - 0.5) * width / height;
    const y = 0.5 - (event.clientY - bounds.top) / height;
    impulses.set([x, y, elapsed, strength], impulseIndex * 4);
    impulseIndex = (impulseIndex + 1) % 16;
  }
  function onMove(event) {
    if (event.pointerType === 'touch') return;
    if (performance.now() - lastPointer < 75) return;
    lastPointer = performance.now();
    addRipple(event, 0.32);
  }
  function onDown(event) {
    if (event.target.closest('a,button')) return;
    addRipple(event, 0.9);
  }
  function updateControl() {
    control.setAttribute('aria-pressed', String(paused));
    control.setAttribute('aria-label', paused ? 'Play water animation' : 'Pause water animation');
    control.querySelector('span').textContent = paused ? 'Play motion' : 'Pause motion';
    control.querySelector('path').setAttribute('d', paused ? 'M5 3l7 5-7 5Z' : 'M5 3v10M11 3v10');
    hint.textContent = paused ? 'A moment of stillness.' : matchMedia('(pointer: coarse)').matches ? 'Touch the water.' : 'Move gently. Make ripples.';
  }
  function toggle() { paused = !paused; updateControl(); sync(); }
  function onReduced() { paused = reducedMotion.matches; updateControl(); sync(); }
  function onRoute(event) { visible = event.detail === 'home'; resize(); sync(); }
  function onLost(event) {
    event.preventDefault();
    cancelAnimationFrame(request);
    ready = false;
    canvas.classList.remove('ready');
    control.hidden = true;
    hint.textContent = 'Water, seen differently.';
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.01 });
  observer.observe(stage);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerdown', onDown, { passive: true });
  control.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('waha:route', onRoute);
  reducedMotion.addEventListener('change', onReduced);
  canvas.addEventListener('webglcontextlost', onLost);
  image.onload = () => {
    if (destroyed) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform2f(uniforms.imageSize, image.width, image.height);
    ready = true;
    resize();
    draw();
    canvas.classList.add('ready');
    canvas.dataset.renderer = 'webgl';
    updateControl();
    sync();
  };
  image.onerror = () => { control.hidden = true; hint.textContent = 'Water, seen differently.'; };
  image.src = new URL('assets/water-hero.png', import.meta.url).href;
  updateControl();
  resize();
  return () => {
    destroyed = true;
    cancelAnimationFrame(request);
    observer.disconnect();
    resizeObserver.disconnect();
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerdown', onDown);
    control.removeEventListener('click', toggle);
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('waha:route', onRoute);
    reducedMotion.removeEventListener('change', onReduced);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.deleteTexture(texture);
    gl.deleteBuffer(vertices);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  };
}
