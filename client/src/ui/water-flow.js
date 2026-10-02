// <waha-water intensity="0..1" speed="1" sand="0..1" ripples="true">: clear shallow water seen from above,
// with cursor ripples (WebGL). Ported as-is from the Claude Design file water-flow.js.
(() => {
  if (customElements.get('waha-water')) return;
  const N = 10;
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 r;uniform float t;uniform float rt;uniform float k;uniform float sa;
uniform vec4 rp[${N}];
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
      const gl = cv.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
      if (!gl) return;
      const sh = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr); gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = n => gl.getUniformLocation(pr, n);
      const uR = U('r'), uT = U('t'), uRT = U('rt'), uK = U('k'), uS = U('sa'), uP = U('rp');
      const rip = new Float32Array(N * 4).fill(-99); let ri = 0;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scale = 0.5;
      const size = () => { const w = Math.max(1, cv.clientWidth * scale | 0), h = Math.max(1, cv.clientHeight * scale | 0);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); } };
      this._ro = new ResizeObserver(size); this._ro.observe(cv);
      let visible = true, last = performance.now(), time = 40 + Math.random() * 20, real = 0, lx = -1e4, ly = -1e4, lt = 0;
      this._io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }); this._io.observe(this);
      const addRipple = (e, strength, force) => {
        if (reduce || this.getAttribute('ripples') === 'false') return;
        const b = cv.getBoundingClientRect();
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) return;
        const x = (e.clientX - b.left) * cv.width / b.width, y = (b.bottom - e.clientY) * cv.height / b.height;
        if (!force && (Math.hypot(x - lx, y - ly) < cv.height * 0.06 || real - lt < 0.07)) return;
        lx = x; ly = y; lt = real;
        rip.set([x, y, real, strength], ri * 4); ri = (ri + 1) % N;
      };
      this._mv = e => addRipple(e, 0.55, false);
      this._dn = e => addRipple(e, 1.3, true);
      addEventListener('pointermove', this._mv, { passive: true });
      addEventListener('pointerdown', this._dn, { passive: true });
      const draw = () => {
        gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, time); gl.uniform1f(uRT, real);
        gl.uniform1f(uK, parseFloat(this.getAttribute('intensity') ?? '1'));
        gl.uniform1f(uS, parseFloat(this.getAttribute('sand') ?? '0.5'));
        gl.uniform4fv(uP, rip);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const loop = now => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (visible) { real += dt; time += dt * parseFloat(this.getAttribute('speed') ?? '1'); size(); draw(); }
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
