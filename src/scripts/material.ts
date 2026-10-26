export function initMaterialLab() {
  const canvas = document.querySelector<HTMLCanvasElement>("#material-canvas");
  const panel = document.querySelector<HTMLElement>(".lab");
  if (!canvas || !panel) return;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: true });
  const buttons = [...panel.querySelectorAll<HTMLButtonElement>("[data-mode]")];
  const slider = panel.querySelector<HTMLInputElement>("#roughness")!;
  const output = panel.querySelector<HTMLOutputElement>("#roughness-value")!;
  const status = panel.querySelector<HTMLElement>("#render-status")!;
  if (!gl) {
    status.textContent = "静态预览";
    canvas.hidden = true;
    buttons.forEach((button) => (button.disabled = true));
    slider.disabled = true;
    return;
  }
  const vertex = `attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment = `precision highp float;
    uniform vec2 resolution;
    uniform float rotation, roughness, mode, dark;
    vec3 environment(vec3 r){
      float soft=pow(max(dot(r,normalize(vec3(-1.,2.,2.))),0.),12.);
      float strip=pow(max(0.,1.-abs(r.x*.8+r.z*.25)),48.);
      return vec3(.06+.22*max(r.y,0.)+.9*soft+.65*strip);
    }
    void main(){
      vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/resolution.y;
      vec3 ro=vec3(sin(rotation)*4.4,1.8,cos(rotation)*4.4);
      vec3 target=vec3(0.,.12,0.);
      vec3 fw=normalize(target-ro),right=normalize(cross(fw,vec3(0.,1.,0.))),up=cross(right,fw);
      vec3 rd=normalize(fw*2.75+right*uv.x+up*uv.y);
      vec3 center=vec3(0.,.15,0.), oc=ro-center;
      float b=dot(oc,rd),c=dot(oc,oc)-1.,disc=b*b-c;
      vec3 bg=mix(vec3(1.),vec3(.149),dark), col=bg;
      float ground=(-.86-ro.y)/rd.y;
      if(ground>0.){
        vec3 q=ro+rd*ground;
        vec2 grid=abs(fract(q.xz*1.35+.5)-.5);
        float line=1.-smoothstep(.012,.03,min(grid.x,grid.y));
        float fade=exp(-length(q.xz)*.22)*.16;
        float shadow=exp(-dot(q.xz,q.xz)*1.35)*.22;
        col=mix(bg,mix(vec3(.25),vec3(.72),dark),line*fade);
        col=mix(col,bg*.55,shadow);
      }
      if(disc>0.){
        float t=-b-sqrt(disc);
        if(t>0.){
          vec3 pos=ro+rd*t,n=normalize(pos-center);
          float waves=sin(n.y*33.+n.x*8.)*.016;
          n=normalize(n+vec3(waves,0.,waves));
          vec3 light=normalize(vec3(-2.,3.,3.)),view=-rd;
          float ndl=max(dot(n,light),0.);
          float spec=pow(max(dot(n,normalize(light+view)),0.),mix(190.,5.,roughness));
          float fres=pow(1.-max(dot(n,view),0.),4.);
          vec3 reflection=environment(reflect(rd,n));
          vec3 clay=vec3(.11+.57*ndl)+vec3(spec*(1.-roughness)*.5)+reflection*.1+fres*.14;
          vec3 metal=reflection*(1.-roughness*.45)+vec3(spec*.7)+fres*.3;
          col=mode<.5?clay:metal;
          if(mode>1.5){
            float u=atan(n.z,n.x)/6.283185+.5,v=acos(clamp(n.y,-1.,1.))/3.141593;
            vec2 g=abs(fract(vec2(u*24.,v*16.))-.5);
            float wire=smoothstep(.45,.49,max(g.x,g.y));
            col=mix(vec3(.025+.08*ndl),vec3(.85+.15*ndl),wire);
          }
          col=pow(max(col,vec3(0.)),vec3(.8));
        }
      }
      gl_FragColor=vec4(clamp(col,0.,1.),1.);
    }`;
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      return null;
    }
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex),
    fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) {
    canvas.hidden = true;
    status.textContent = "静态预览";
    buttons.forEach((b) => (b.disabled = true));
    slider.disabled = true;
    return;
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.hidden = true;
    status.textContent = "静态预览";
    buttons.forEach((b) => (b.disabled = true));
    slider.disabled = true;
    return;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const attributePosition = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(attributePosition);
  gl.vertexAttribPointer(attributePosition, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(
    ["resolution", "rotation", "roughness", "mode", "dark"].map((key) => [
      key,
      gl.getUniformLocation(program, key),
    ]),
  );
  let angle = 0.55,
    material = 0,
    dragging = false,
    lastX = 0;
  function draw() {
    if (gl!.isContextLost()) return;
    const rect = canvas!.getBoundingClientRect(),
      scale = Math.min(devicePixelRatio, 2);
    const width = Math.round(rect.width * scale),
      height = Math.round(rect.height * scale);
    if (!width || !height) return;
    if (canvas!.width !== width || canvas!.height !== height) {
      canvas!.width = width;
      canvas!.height = height;
    }
    gl!.viewport(0, 0, width, height);
    gl!.uniform2f(uniforms.resolution, width, height);
    gl!.uniform1f(uniforms.rotation, angle);
    gl!.uniform1f(uniforms.roughness, Number(slider.value));
    gl!.uniform1f(uniforms.mode, material);
    gl!.uniform1f(
      uniforms.dark,
      document.documentElement.dataset.theme === "dark" ? 1 : 0,
    );
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
  }
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      material = Number(button.dataset.mode);
      slider.disabled = material === 2;
      buttons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      draw();
    }),
  );
  slider.addEventListener("input", () => {
    output.value = Number(slider.value).toFixed(2);
    draw();
  });
  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (dragging) {
      angle += (event.clientX - lastX) * 0.012;
      lastX = event.clientX;
      draw();
    }
  });
  canvas.addEventListener("pointerup", () => (dragging = false));
  canvas.addEventListener("pointercancel", () => (dragging = false));
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    canvas.hidden = true;
    panel.classList.remove("webgl-ready");
    status.textContent = "静态预览";
    buttons.forEach((button) => (button.disabled = true));
    slider.disabled = true;
  });
  canvas.addEventListener("webglcontextrestored", () => location.reload());
  new ResizeObserver(draw).observe(canvas);
  window.addEventListener("ta-theme-change", draw);
  status.textContent = "实时渲染";
  panel.classList.add("webgl-ready");
  draw();
}
