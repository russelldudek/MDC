(() => {
  'use strict';
  const { clamp, mix, colorForStress } = window.__MDCGPU;

  function createWebGL2Backend(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const vertexSource = `#version 300 es
      precision highp float;
      const vec2 positions[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
      void main(){ gl_Position=vec4(positions[gl_VertexID],0.,1.); }`;
    const fragmentSource = `#version 300 es
      precision highp float;
      out vec4 outColor;
      uniform vec2 uResolution; uniform float uTime; uniform float uProgress; uniform vec2 uPointer; uniform float uFounder; uniform float uStress[6];
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
      vec3 stressColor(float s){ vec3 calm=vec3(.306,.667,.616), watch=vec3(.863,.659,.290), risk=vec3(.871,.357,.302); return s<.5?mix(calm,watch,s*2.):mix(watch,risk,(s-.5)*2.); }
      float curve(float x){ float sag=0.; for(int i=0;i<6;i++){ float nx=mix(.10,.90,float(i)/5.); float dx=(x-nx)/.13; sag+=uStress[i]*exp(-dx*dx)*.055; } return .365+sag; }
      float beamD(vec2 p){ float d=1.; vec2 prev=vec2(.075,curve(.075)); for(int i=1;i<=42;i++){ float x=mix(.075,.925,float(i)/42.); vec2 n=vec2(x,curve(x)); d=min(d,seg(p,prev,n)); prev=n; } return d; }
      void main(){
        vec2 uv=gl_FragCoord.xy/uResolution; uv.y=1.-uv.y; uv+=uPointer*vec2(.007,.005);
        float aspect=uResolution.x/max(uResolution.y,1.); vec2 c=vec2((uv.x-.5)*aspect,uv.y-.5);
        vec3 color=mix(vec3(.032,.063,.106),vec3(.010,.020,.034),smoothstep(-.45,.52,c.y));
        float vignette=smoothstep(.78,.18,length(c*vec2(.82,1.))); color*=.60+.40*vignette;
        float gy=abs(fract((uv.y-.50)*16.)-.5), gx=abs(fract((uv.x-.5)*(11.+uv.y*8.))-.5);
        float grid=smoothstep(.035,0.,min(gx,gy))*smoothstep(.48,.86,uv.y); color+=vec3(.09,.14,.18)*grid*.36;
        float baseTop=.765, baseBottom=.875; float left=mix(.105,.035,smoothstep(baseTop,baseBottom,uv.y));
        float base=step(baseTop,uv.y)*step(uv.y,baseBottom)*step(left,uv.x)*step(uv.x,1.-left); float depth=smoothstep(baseTop,baseBottom,uv.y);
        color=mix(color,mix(vec3(.095,.13,.13),vec3(.025,.055,.060),depth),base*.94);
        float edge=smoothstep(.006,0.,abs(uv.y-baseTop))*step(.075,uv.x)*step(uv.x,.925); color+=vec3(.866,.502,.267)*edge*.9;
        float bd=beamD(uv), glow=exp(-bd*95.), core=smoothstep(.013,.003,bd); color+=vec3(.866,.502,.267)*glow*.32; color=mix(color,vec3(.86,.53,.31),core*.92);
        float maxS=0.; int weak=0;
        for(int i=0;i<6;i++){ float x=mix(.10,.90,float(i)/5.); float s=uStress[i]; if(s>maxS){maxS=s;weak=i;} float top=curve(x)+.017; float w=mix(.013,.020,uv.y); float vertical=step(abs(uv.x-x),w)*step(top,uv.y)*step(uv.y,baseTop); vec3 sc=stressColor(s); float fade=mix(.95,.48,smoothstep(top,baseTop,uv.y)); color=mix(color,sc*fade,vertical*.92); float nd=distance(uv,vec2(x,curve(x))); color+=sc*exp(-nd*75.)*(.22+s*.18); color=mix(color,sc+vec3(.15),smoothstep(.017,.006,nd)); float foot=smoothstep(.033,.028,abs(uv.x-x))*smoothstep(.012,0.,abs(uv.y-baseTop)); color=mix(color,sc*.72,foot); }
        float px=mix(.075,.925,uProgress), py=curve(px), pd=distance(uv,vec2(px,py)); vec3 pc=mix(vec3(.866,.502,.267),vec3(.95,.86,.66),uProgress); color+=pc*exp(-pd*70.)*(.55+.15*sin(uTime*6.)); color=mix(color,pc,smoothstep(.015,.004,pd));
        float wx=mix(.10,.90,float(weak)/5.); float br=seg(uv,vec2(.94,.17),vec2(wx,curve(wx)+.008)); float bm=smoothstep(.010,.003,br)*uFounder; color+=vec3(.87,.35,.30)*exp(-br*68.)*uFounder*.18; color=mix(color,vec3(.96,.34,.27),bm*.95);
        float scan=smoothstep(.008,0.,abs(uv.y-(.22+.006*sin(uTime*.7))))*.035; color+=vec3(.55,.69,.74)*scan;
        outColor=vec4(pow(color,vec3(.92)),1.);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const uniforms = {
        resolution: gl.getUniformLocation(program, 'uResolution'), time: gl.getUniformLocation(program, 'uTime'),
        progress: gl.getUniformLocation(program, 'uProgress'), pointer: gl.getUniformLocation(program, 'uPointer'),
        founder: gl.getUniformLocation(program, 'uFounder'), stress: gl.getUniformLocation(program, 'uStress[0]')
      };
      let width = 0, height = 0;
      return {
        mode: 'webgl2',
        draw(frame) {
          const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const nextWidth = Math.max(2, Math.round(rect.width * dpr)); const nextHeight = Math.max(2, Math.round(rect.height * dpr));
          if (nextWidth !== width || nextHeight !== height) { width = nextWidth; height = nextHeight; canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
          gl.useProgram(program); gl.uniform2f(uniforms.resolution, width, height); gl.uniform1f(uniforms.time, frame.time); gl.uniform1f(uniforms.progress, frame.progress); gl.uniform2f(uniforms.pointer, frame.pointer[0], frame.pointer[1]); gl.uniform1f(uniforms.founder, frame.founder); gl.uniform1fv(uniforms.stress, frame.stress); gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
      };
    } catch (error) {
      console.warn('WebGL2 engagement renderer failed:', error);
      return null;
    }
  }

  function createCanvasBackend(canvas) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;
    let width = 0, height = 0, dpr = 1;
    const point = (x, y) => [x * width, y * height];
    const curve = (x, stress) => {
      let sag = 0;
      stress.forEach((value, index) => {
        const nodeX = mix(0.10, 0.90, index / 5);
        const dx = (x - nodeX) / 0.13;
        sag += value * Math.exp(-dx * dx) * 0.055;
      });
      return 0.365 + sag;
    };
    function resize() {
      const rect = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(2, Math.round(rect.width * dpr)); const nextHeight = Math.max(2, Math.round(rect.height * dpr));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight; canvas.width = width; canvas.height = height;
    }
    return {
      mode: 'canvas2d-fallback',
      draw(frame) {
        resize();
        context.setTransform(1, 0, 0, 1, 0, 0);
        const bg = context.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#0d2034'); bg.addColorStop(0.55, '#08131f'); bg.addColorStop(1, '#040a11');
        context.fillStyle = bg; context.fillRect(0, 0, width, height);
        context.save(); context.translate(frame.pointer[0] * width * 0.006, frame.pointer[1] * height * 0.006);

        context.strokeStyle = 'rgba(117,156,175,.11)'; context.lineWidth = Math.max(1, dpr * 0.7);
        for (let y = 0.52; y < 0.88; y += 0.035) { context.beginPath(); context.moveTo(width * (0.03 + (y - 0.52) * 0.18), y * height); context.lineTo(width * (0.97 - (y - 0.52) * 0.18), y * height); context.stroke(); }
        for (let i = 0; i < 13; i += 1) { const x = i / 12; context.beginPath(); context.moveTo(width * (0.5 + (x - 0.5) * 0.55), height * 0.52); context.lineTo(width * (0.5 + (x - 0.5) * 0.96), height * 0.88); context.stroke(); }

        const baseTop = 0.765, baseBottom = 0.875;
        context.beginPath(); context.moveTo(...point(0.105, baseTop)); context.lineTo(...point(0.895, baseTop)); context.lineTo(...point(0.965, baseBottom)); context.lineTo(...point(0.035, baseBottom)); context.closePath();
        const base = context.createLinearGradient(0, baseTop * height, 0, baseBottom * height); base.addColorStop(0, '#17302f'); base.addColorStop(1, '#071317'); context.fillStyle = base; context.fill();
        context.strokeStyle = '#dd8044'; context.lineWidth = 2 * dpr; context.beginPath(); context.moveTo(...point(0.105, baseTop)); context.lineTo(...point(0.895, baseTop)); context.stroke();

        let weakIndex = 0; frame.stress.forEach((value, index) => { if (value > frame.stress[weakIndex]) weakIndex = index; });
        frame.stress.forEach((stress, index) => {
          const x = mix(0.10, 0.90, index / 5); const topY = curve(x, frame.stress); const rgb = colorForStress(stress).map((value) => Math.round(value * 255)); const color = `rgb(${rgb.join(',')})`;
          const supportGradient = context.createLinearGradient(0, topY * height, 0, baseTop * height); supportGradient.addColorStop(0, color); supportGradient.addColorStop(1, `rgba(${rgb.join(',')},.38)`);
          context.fillStyle = supportGradient; context.fillRect(x * width - width * 0.012, topY * height + height * 0.014, width * 0.024, (baseTop - topY) * height - height * 0.014);
          context.fillStyle = color; context.shadowColor = color; context.shadowBlur = 22 * dpr; context.beginPath(); context.arc(x * width, topY * height, width * 0.012, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
          context.fillRect(x * width - width * 0.032, baseTop * height - dpr, width * 0.064, dpr * 4);
        });

        context.lineCap = 'round'; context.lineJoin = 'round';
        context.beginPath();
        for (let i = 0; i <= 80; i += 1) { const x = mix(0.075, 0.925, i / 80); const y = curve(x, frame.stress); if (i === 0) context.moveTo(x * width, y * height); else context.lineTo(x * width, y * height); }
        context.strokeStyle = 'rgba(221,128,68,.18)'; context.lineWidth = 18 * dpr; context.shadowColor = '#dd8044'; context.shadowBlur = 20 * dpr; context.stroke();
        context.strokeStyle = '#df8750'; context.lineWidth = 5 * dpr; context.shadowBlur = 0; context.stroke();

        if (frame.founder > 0.02) {
          const weakX = mix(0.10, 0.90, weakIndex / 5), weakY = curve(weakX, frame.stress);
          context.globalAlpha = frame.founder; context.strokeStyle = '#f15a49'; context.lineWidth = 4 * dpr; context.shadowColor = '#f15a49'; context.shadowBlur = 18 * dpr;
          context.beginPath(); context.moveTo(...point(0.94, 0.17)); context.lineTo(...point(weakX, weakY)); context.stroke(); context.shadowBlur = 0; context.globalAlpha = 1;
        }

        const packetX = mix(0.075, 0.925, frame.progress), packetY = curve(packetX, frame.stress);
        const halo = context.createRadialGradient(packetX * width, packetY * height, 0, packetX * width, packetY * height, width * 0.045);
        halo.addColorStop(0, 'rgba(255,232,190,.95)'); halo.addColorStop(0.18, 'rgba(221,128,68,.85)'); halo.addColorStop(1, 'rgba(221,128,68,0)');
        context.fillStyle = halo; context.beginPath(); context.arc(packetX * width, packetY * height, width * 0.045, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#ffe2ad'; context.beginPath(); context.arc(packetX * width, packetY * height, width * 0.0075, 0, Math.PI * 2); context.fill();
        context.restore();
      }
    };
  }


  Object.assign(window.__MDCGPU, { createWebGL2Backend, createCanvasBackend });
})();
