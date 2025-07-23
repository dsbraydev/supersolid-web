import * as THREE from "three";

export default function initWebGLDistortion({ container, canvas, image }) {
  if (!container || !canvas || !image) {
    console.error("Invalid inputs: container, canvas, or image missing");
    return;
  }

  // Configuration parameters
  const params = {
    falloff: 0.4,
    alpha: 1.1,
    dissipation: 0.965,
    distortionStrength: image.dataset.distortionStrength
      ? parseFloat(image.dataset.distortionStrength)
      : 0.08,
    chromaticAberration: 0.004,
    chromaticSpread: 1,
    velocityScale: 0.6,
    velocityDamping: 0.85,
    mouseRadius: 0.18,
    motionBlurStrength: 0.35,
    motionBlurDecay: 0.88,
    motionBlurThreshold: 0.5,
  };

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  console.log("Renderer initialized:", renderer.getContext());

  // Main scene and camera
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Flowmap scene and camera
  const flowmapScene = new THREE.Scene();
  const flowmapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Texture loading
  let texture;
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = "anonymous";
  texture = textureLoader.load(
    image.src,
    (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      console.log("Texture loaded:", tex.image.width, "x", tex.image.height);
      updateRenderTargets();
      resize();
      animate();
    },
    undefined,
    (err) => {
      console.error("Texture load failed:", err);
    }
  );

  // Render targets
  const rtParams = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    colorSpace: THREE.SRGBColorSpace,
  };
  let flowmapRT1, flowmapRT2, finalRT1, finalRT2;
  let currentFlowmapRT, previousFlowmapRT, currentFinalRT, previousFinalRT;

  function updateRenderTargets() {
    const flowmapSize = 128;
    const finalSize = Math.min(
      Math.max(container.clientWidth, container.clientHeight),
      512
    );
    flowmapRT1 = new THREE.WebGLRenderTarget(
      flowmapSize,
      flowmapSize,
      rtParams
    );
    flowmapRT2 = new THREE.WebGLRenderTarget(
      flowmapSize,
      flowmapSize,
      rtParams
    );
    finalRT1 = new THREE.WebGLRenderTarget(finalSize, finalSize, rtParams);
    finalRT2 = new THREE.WebGLRenderTarget(finalSize, finalSize, rtParams);
    currentFlowmapRT = flowmapRT1;
    previousFlowmapRT = flowmapRT2;
    currentFinalRT = finalRT1;
    previousFinalRT = finalRT2;
    console.log("Render targets initialized:", finalSize);
  }

  // Shaders
  const vertexShader = `
    uniform vec2 uImageScale;
    uniform vec2 uImageOffset;
    varying vec2 vUv;
    varying vec2 vImageUv;

    void main() {
      vUv = uv;
      vec2 centeredUv = (uv - 0.5) / uImageScale + uImageOffset;
      vImageUv = centeredUv + 0.5;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const flowmapFragmentShader = `
    uniform vec2 uMouse;
    uniform vec2 uVelocity;
    uniform vec2 uResolution;
    uniform float uFalloff;
    uniform float uAlpha;
    uniform float uDissipation;
    uniform float uAspect;
    uniform sampler2D uTexture;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(uTexture, uv);
      color.rgb *= uDissipation;

      vec2 cursor = uMouse;
      vec2 aspectUv = uv;
      aspectUv.x *= uAspect;
      cursor.x *= uAspect;

      float dist = distance(aspectUv, cursor);
      float influence = 1.0 - smoothstep(0.0, uFalloff, dist);

      vec2 velocityContribution = vec2(uVelocity.x, -uVelocity.y) * influence * uAlpha;
      color.rg += velocityContribution;
      color.b = length(color.rg) * 2.0;

      gl_FragColor = color;
    }
  `;

  const fragmentShader = `
    uniform sampler2D uLogo;
    uniform sampler2D uFlowmap;
    uniform sampler2D uPreviousFrame;
    uniform vec2 uImageScale;
    uniform vec2 uImageOffset;
    uniform float uDistortionStrength;
    uniform float uChromaticAberration;
    uniform float uChromaticSpread;
    uniform float uMotionBlurStrength;
    uniform float uMotionBlurDecay;
    uniform float uMotionBlurThreshold;
    uniform bool uIsFirstFrame;

    varying vec2 vUv;
    varying vec2 vImageUv;

    precision mediump float;

    void main() {
      vec2 uv = vUv;
      vec3 flow = texture2D(uFlowmap, uv).rgb;
      float flowMagnitude = length(flow.rg);

      vec2 distortedImageUv = vImageUv + flow.rg * uDistortionStrength * 0.5;

      float aberration = flow.b * uChromaticAberration;
      vec2 flowDir = flowMagnitude > 0.001 ? normalize(flow.rg) : vec2(0.0);

      vec2 redOffset = flowDir * aberration * uChromaticSpread;
      vec2 blueOffset = -redOffset;
      vec2 greenOffset = vec2(-flowDir.y, flowDir.x) * aberration * uChromaticSpread * 0.8;

      vec2 redUv = distortedImageUv + redOffset;
      vec2 greenUv = distortedImageUv + greenOffset;
      vec2 blueUv = distortedImageUv + blueOffset;

      bool redInBounds = (redUv.x >= 0.0 && redUv.x <= 1.0 && redUv.y >= 0.0 && redUv.y <= 1.0);
      bool greenInBounds = (greenUv.x >= 0.0 && greenUv.x <= 1.0 && greenUv.y >= 0.0 && greenUv.y <= 1.0);
      bool blueInBounds = (blueUv.x >= 0.0 && blueUv.x <= 1.0 && blueUv.y >= 0.0 && blueUv.y <= 1.0);
      bool centerInBounds = (distortedImageUv.x >= 0.0 && distortedImageUv.x <= 1.0 && distortedImageUv.y >= 0.0 && distortedImageUv.y <= 1.0);

      if (!redInBounds && !greenInBounds && !blueInBounds && !centerInBounds) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }

      vec4 centerSample = centerInBounds ? texture2D(uLogo, distortedImageUv) : vec4(0.0);

      float r = redInBounds ? texture2D(uLogo, redUv).r : centerSample.r;
      float g = greenInBounds ? texture2D(uLogo, greenUv).g : centerSample.g;
      float b = blueInBounds ? texture2D(uLogo, blueUv).b : centerSample.b;

      float alpha = centerSample.a;
      if (!centerInBounds) {
        alpha = 0.0;
        if (redInBounds) alpha = max(alpha, texture2D(uLogo, redUv).a);
        if (greenInBounds) alpha = max(alpha, texture2D(uLogo, greenUv).a);
        if (blueInBounds) alpha = max(alpha, texture2D(uLogo, blueUv).a);
      }

      if (alpha < 0.01) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }

      vec3 color = vec3(r, g, b);
      vec4 currentColor = vec4(color, alpha);

      if (!uIsFirstFrame && flowMagnitude > uMotionBlurThreshold) {
        vec4 previousColor = texture2D(uPreviousFrame, uv);
        float blurAmount = min(flowMagnitude * uMotionBlurStrength, 0.7);
        currentColor.rgb = mix(currentColor.rgb, previousColor.rgb, blurAmount * uMotionBlurDecay);
      }

      gl_FragColor = currentColor;
    }
  `;

  // Flowmap setup
  const flowmapGeometry = new THREE.PlaneGeometry(2, 2);
  const flowmapUniforms = {
    uMouse: { value: new THREE.Vector2(-1, -1) },
    uVelocity: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2() },
    uFalloff: { value: params.falloff },
    uAlpha: { value: params.alpha },
    uDissipation: { value: params.dissipation },
    uAspect: { value: 1 },
    uTexture: { value: null },
  };
  const flowmapMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: flowmapFragmentShader,
    uniforms: flowmapUniforms,
  });
  const flowmapMesh = new THREE.Mesh(flowmapGeometry, flowmapMaterial);
  flowmapScene.add(flowmapMesh);

  // Main scene setup
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uLogo: { value: texture },
    uFlowmap: { value: null },
    uPreviousFrame: { value: null },
    uImageScale: { value: new THREE.Vector2(1, 1) },
    uImageOffset: { value: new THREE.Vector2(0, 0) },
    uDistortionStrength: { value: params.distortionStrength },
    uChromaticAberration: { value: params.chromaticAberration },
    uChromaticSpread: { value: params.chromaticSpread },
    uMotionBlurStrength: { value: params.motionBlurStrength },
    uMotionBlurDecay: { value: params.motionBlurDecay },
    uMotionBlurThreshold: { value: params.motionBlurThreshold },
    uIsFirstFrame: { value: true },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Mouse tracking
  const mouse = {
    current: new THREE.Vector2(-1, -1),
    target: new THREE.Vector2(-1, -1),
    velocity: new THREE.Vector2(0, 0),
    lastPosition: new THREE.Vector2(-1, -1),
    smoothVelocity: new THREE.Vector2(0, 0),
  };

  function updateMouse(x, y) {
    const rect = container.getBoundingClientRect();
    const mx = (x - rect.left) / rect.width;
    const my = 1 - (y - rect.top) / rect.height;
    mouse.target.set(mx, my);
    console.log("Mouse updated:", mx, my);
  }

  function onMouseMove(event) {
    updateMouse(event.clientX, event.clientY);
  }

  function onTouchStart(event) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      updateMouse(touch.clientX, touch.clientY);
      mouse.current.copy(mouse.target);
      mouse.lastPosition.copy(mouse.target);
    }
  }

  function onTouchMove(event) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      updateMouse(touch.clientX, touch.clientY);
    }
  }

  function onTouchEnd() {
    mouse.target.set(-1, -1);
  }

  container.addEventListener("mousemove", onMouseMove, { passive: true });
  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: true });
  container.addEventListener("touchend", onTouchEnd, { passive: true });

  // Resize handling
  function resize() {
    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) {
      console.warn("Container has zero dimensions");
      return;
    }

    if (texture.image) {
      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const imgAspect = imgWidth / imgHeight;

      // Set canvas size to image’s natural dimensions, scaled down if needed
      const maxWidth = Math.min(clientWidth, imgWidth);
      const scale = maxWidth / imgWidth;
      const canvasWidth = imgWidth * scale;
      const canvasHeight = imgHeight * scale;

      renderer.setSize(canvasWidth, canvasHeight);
      flowmapUniforms.uResolution.value.set(canvasWidth, canvasHeight);
      flowmapUniforms.uAspect.value = canvasWidth / canvasHeight;

      // Adjust image scale to fit canvas
      let scaleX = 1;
      let scaleY = 1;
      const canvasAspect = canvasWidth / canvasHeight;
      if (imgAspect > canvasAspect) {
        scaleY = imgAspect / canvasAspect;
      } else {
        scaleX = canvasAspect / imgAspect;
      }

      uniforms.uImageScale.value.set(scaleX, scaleY);
      uniforms.uImageOffset.value.set(0, 0);

      const finalSize = Math.min(canvasWidth, 512);
      finalRT1.setSize(finalSize, finalSize);
      finalRT2.setSize(finalSize, finalSize);
      console.log(
        "Resized canvas:",
        canvasWidth,
        "x",
        canvasHeight,
        "Scale:",
        scaleX,
        scaleY
      );
    }
  }

  window.addEventListener("resize", resize);

  // Animation loop
  let frameId;
  function animate() {
    if (!texture.image) {
      console.warn("Texture not ready, skipping frame");
      frameId = requestAnimationFrame(animate);
      return;
    }

    // Update mouse
    mouse.lastPosition.copy(mouse.current);
    mouse.current.lerp(mouse.target, 0.7);
    const delta = new THREE.Vector2()
      .subVectors(mouse.current, mouse.lastPosition)
      .multiplyScalar(80);
    mouse.velocity.lerp(delta, 0.6);
    mouse.smoothVelocity.lerp(mouse.velocity, 0.3);
    mouse.velocity.multiplyScalar(params.velocityDamping);

    // Update flowmap
    flowmapUniforms.uMouse.value.copy(mouse.current);
    flowmapUniforms.uVelocity.value
      .copy(mouse.smoothVelocity)
      .multiplyScalar(params.velocityScale);
    flowmapUniforms.uTexture.value = previousFlowmapRT.texture;

    renderer.setRenderTarget(currentFlowmapRT);
    renderer.render(flowmapScene, flowmapCamera);

    // Update final render
    uniforms.uFlowmap.value = currentFlowmapRT.texture;
    uniforms.uPreviousFrame.value = previousFinalRT.texture;
    uniforms.uIsFirstFrame.value = false;

    renderer.setRenderTarget(currentFinalRT);
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    // Swap render targets
    [currentFlowmapRT, previousFlowmapRT] = [
      previousFlowmapRT,
      currentFlowmapRT,
    ];
    [currentFinalRT, previousFinalRT] = [previousFinalRT, currentFinalRT];

    frameId = requestAnimationFrame(animate);
  }

  // Cleanup
  const cleanup = () => {
    cancelAnimationFrame(frameId);
    container.removeEventListener("mousemove", onMouseMove);
    container.removeEventListener("touchstart", onTouchStart);
    container.removeEventListener("touchmove", onTouchMove);
    container.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("resize", resize);
    geometry.dispose();
    material.dispose();
    flowmapGeometry.dispose();
    flowmapMaterial.dispose();
    texture?.dispose();
    flowmapRT1?.dispose();
    flowmapRT2?.dispose();
    finalRT1?.dispose();
    finalRT2?.dispose();
    renderer.dispose();
    console.log("WebGL cleaned up");
  };

  return cleanup;
}
