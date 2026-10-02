// <waha-water intensity="0..1" speed="1" sand="0..1" ripples="true">: clear shallow water seen from above.
// Currents come from domain-warped noise. The cursor drags a wake through a small wave simulation
// (WebGL2 + float textures). Browsers without that get simple expanding rings instead.
(() => {
  if (customElements.get('waha-water')) return;
  const N = 10;
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  // One step of the 2D wave equation. r = height now, g = height last step.
  // The cursor pushes the surface down along the segment it moved through, which leaves a wake.
  const SIM_FS = `precision highp float;
uniform sampler2D s;uniform vec2 px;uniform vec2 p0;uniform vec2 p1;uniform float str;uniform float rad;
void main(){
 vec2 fc=gl_FragCoord.xy,uv=fc*px;
 vec4 c=texture2D(s,uv);
 float n=texture2D(s,uv+vec2(px.x,0.)).r+texture2D(s,uv-vec2(px.x,0.)).r+texture2D(s,uv+vec2(0.,px.y)).r+texture2D(s,uv-vec2(0.,px.y)).r;
 float h=(n*.5-c.g)*.986;
 vec2 pa=fc-p0,ba=p1-p0;
 float d=length(pa-ba*clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.));
 h-=str*exp(-d*d/(rad*rad));
 gl_FragColor=vec4(h,c.r,0.,1.);
}`;
  const FS = `precision highp float;
uniform vec2 r;uniform float t;uniform float rt;uniform float k;uniform float sa;
uniform vec4 rp[${N}];
uniform sampler2D hm;uniform vec2 hp;uniform float hk;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
float caus(vec2 p,float T){
 vec2 q=p*3.;float c=0.;
 for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.3+T*1.7),cos(q.x*1.1-T*1.3))*.55;c+=1./(1.+28.*abs(sin(q.x+q.y)));q*=1.35;}
 return c/3.;}
void main(){
 vec2 px=gl_FragCoord.xy;vec2 uv=px/r;vec2 p=(px-.5*r)/r.y*1.6;
 vec2 disp=vec2(0.);float ring=0.;
 for(int i=0;i<${N};i++){
  vec4 R=rp[i];float age=rt-R.z;
  if(age>0.&&age<2.6){
   vec2 d=(px-R.xy)/r.y;float dist=length(d);float rad=age*.32;
   float env=exp(-pow((dist-rad)*14.,2.))*(1.-age/2.6)*R.w;
   float wv=sin((dist-rad)*70.)*env;
   disp+=d/(dist+1e-4)*wv*.05;ring+=wv;}
 }
 if(hk>0.){
  float hl=texture2D(hm,uv-vec2(hp.x,0.)).r,hr=texture2D(hm,uv+vec2(hp.x,0.)).r;
  float hd=texture2D(hm,uv-vec2(0.,hp.y)).r,hu=texture2D(hm,uv+vec2(0.,hp.y)).r;
  vec2 g=vec2(hr-hl,hu-hd)*hk;
  disp+=g*.12;ring+=(g.x-g.y)*3.;
 }
 p+=disp;
 float T=t*.035;
 p+=vec2(T*1.1,-T*.55);
 vec2 q=vec2(fbm(p+vec2(0.,T)),fbm(p+vec2(5.2,1.3)-T));
 vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+T*1.4),fbm(p+3.*q+vec2(8.3,2.8)-T*1.1));
 float f=fbm(p+3.*w);
 vec3 deep=vec3(.05,.42,.55),mid=vec3(.10,.64,.74),shal=vec3(.45,.89,.88),sand=vec3(.93,.86,.68),foam=vec3(.92,1.,.99);
 vec3 c=mix(deep,mid,smoothstep(.2,.65,f));
 c=mix(c,shal,smoothstep(.5,.9,f+length(w)*.15)*.75);
 float sb=smoothstep(.54,.76,fbm(p*.45+w*.35+vec2(3.1,7.7)))*sa;
 c=mix(c,mix(shal,sand,.7),sb*.85);
 float cs=caus(p+w*.6,t*.12);
 c+=foam*pow(cs,1.8)*.6*(.5+.5*smoothstep(.3,.8,f));
 c+=foam*ring*.22+foam*abs(ring)*.12;
 float v=smoothstep(1.3,.2,length((uv-.5)*vec2(1.1,1.4)));
 c*=mix(.92,1.03,v);
 c=mix(vec3(.04,.36,.48),c,k);
 gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;
  class WahaWater extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>:host{display:block;position:absolute;inset:0;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,#4FC3C8,#1B8EA3 70%)}canvas{width:100%;height:100%;display:block}</style><canvas></canvas>';
      const cv = root.querySelector('canvas');
      const opts = { antialias: false, depth: false };
      const gl = cv.getContext('webgl2', opts) || cv.getContext('webgl', opts);
      if (!gl) return;
      const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const sh = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
      const link = fs => {
        const p = gl.createProgram();
        gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
        return { p, U: n => gl.getUniformLocation(p, n) };
      };
      const main = link(FS);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const uR = main.U('r'), uT = main.U('t'), uRT = main.U('rt'), uK = main.U('k'), uS = main.U('sa'), uP = main.U('rp');
      const uHM = main.U('hm'), uHP = main.U('hp'), uHK = main.U('hk');
      const rip = new Float32Array(N * 4).fill(-99); let ri = 0;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scale = 0.5;

      const tex = () => {
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        return t;
      };
      // The sampler needs something bound even when there's no simulation.
      const blank = tex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

      // Wave simulation: two half-float textures we ping-pong between, at half the canvas resolution.
      let sim = null;
      if (isGL2 && !reduce && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))) {
        const s = link(SIM_FS);
        sim = { p: s.p, uS: s.U('s'), uPx: s.U('px'), uP0: s.U('p0'), uP1: s.U('p1'), uStr: s.U('str'), uRad: s.U('rad'),
          tex: [tex(), tex()], fb: [gl.createFramebuffer(), gl.createFramebuffer()], i: 0, w: 0, h: 0 };
      }
      const simSize = () => {
        const w = Math.max(1, cv.width / 2 | 0), h = Math.max(1, cv.height / 2 | 0);
        if (!sim || (sim.w === w && sim.h === h)) return;
        sim.w = w; sim.h = h;
        for (let j = 0; j < 2 && sim; j++) {
          gl.bindTexture(gl.TEXTURE_2D, sim.tex[j]);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fb[j]);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sim.tex[j], 0);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) sim = null;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };
      const size = () => { const w = Math.max(1, cv.clientWidth * scale | 0), h = Math.max(1, cv.clientHeight * scale | 0);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } simSize(); };
      this._ro = new ResizeObserver(size); this._ro.observe(cv);
      let visible = true, last = performance.now(), time = 40 + Math.random() * 20, real = 0, lx = -1e4, ly = -1e4, lt = 0;
      this._io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }); this._io.observe(this);

      // Pointer in 0..1 with y pointing up, or null when it's off the canvas.
      const norm = e => {
        const b = cv.getBoundingClientRect();
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) return null;
        return [(e.clientX - b.left) / b.width, (b.bottom - e.clientY) / b.height];
      };
      let cur = null, prev = null, splash = 0;
      const addRipple = (e, strength, force) => {
        if (reduce || this.getAttribute('ripples') === 'false') return;
        const q = norm(e); if (!q) return;
        if (sim) { cur = q; if (force) splash = strength; return; }
        const x = q[0] * cv.width, y = q[1] * cv.height;
        if (!force && (Math.hypot(x - lx, y - ly) < cv.height * 0.06 || real - lt < 0.07)) return;
        lx = x; ly = y; lt = real;
        rip.set([x, y, real, strength], ri * 4); ri = (ri + 1) % N;
      };
      this._mv = e => addRipple(e, 0.55, false);
      this._dn = e => addRipple(e, 1.3, true);
      addEventListener('pointermove', this._mv, { passive: true });
      addEventListener('pointerdown', this._dn, { passive: true });

      const step = (p0, p1, str, rad) => {
        const dst = 1 - sim.i;
        gl.useProgram(sim.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fb[dst]);
        gl.viewport(0, 0, sim.w, sim.h);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sim.tex[sim.i]);
        gl.uniform1i(sim.uS, 0); gl.uniform2f(sim.uPx, 1 / sim.w, 1 / sim.h);
        gl.uniform2f(sim.uP0, p0[0], p0[1]); gl.uniform2f(sim.uP1, p1[0], p1[1]);
        gl.uniform1f(sim.uStr, str); gl.uniform1f(sim.uRad, rad);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        sim.i = dst;
      };
      // Fixed 60 Hz steps so waves travel at the same speed on 60 Hz and 144 Hz screens.
      let acc = 0;
      const simulate = dt => {
        acc = Math.min(acc + dt, 3 / 60);
        let p0 = [0, 0], p1 = [0, 0], str = 0, rad = sim.h * 0.022;
        if (cur) {
          const a = prev || cur;
          p0 = [a[0] * sim.w, a[1] * sim.h]; p1 = [cur[0] * sim.w, cur[1] * sim.h];
          const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          // A big jump means the pointer left and came back elsewhere. Don't streak across the screen.
          if (len > sim.h * 0.3) p0 = p1;
          else str = Math.min(len * 0.035, 0.45);
          if (splash) { str += splash * 0.6; rad *= 1.6; splash = 0; }
          prev = cur;
        }
        while (acc >= 1 / 60) { acc -= 1 / 60; step(p0, p1, str, rad); str = 0; }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };

      const draw = () => {
        gl.useProgram(main.p);
        gl.viewport(0, 0, cv.width, cv.height);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sim ? sim.tex[sim.i] : blank);
        gl.uniform1i(uHM, 0); gl.uniform2f(uHP, sim ? 1 / sim.w : 0, sim ? 1 / sim.h : 0); gl.uniform1f(uHK, sim ? 1 : 0);
        gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, time); gl.uniform1f(uRT, real);
        gl.uniform1f(uK, parseFloat(this.getAttribute('intensity') ?? '1'));
        gl.uniform1f(uS, parseFloat(this.getAttribute('sand') ?? '0.5'));
        gl.uniform4fv(uP, rip);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const loop = now => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (visible) {
          real += dt; time += dt * parseFloat(this.getAttribute('speed') ?? '1'); size();
          if (sim) simulate(dt);
          draw();
        }
        this._raf = requestAnimationFrame(loop);
      };
      size(); draw();
      if (!reduce) this._raf = requestAnimationFrame(loop);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._ro?.disconnect(); this._io?.disconnect();
      removeEventListener('pointermove', this._mv); removeEventListener('pointerdown', this._dn);
      this._init = false; if (this.shadowRoot) this.shadowRoot.innerHTML = '';
    }
  }
  customElements.define('waha-water', WahaWater);
})();
