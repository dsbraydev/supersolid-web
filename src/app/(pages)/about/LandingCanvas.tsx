"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LandingCanvas({ imageSrc }: any) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Container or canvas ref is null");
      return;
    }
    if (!imageSrc) {
      console.error("imageSrc prop is undefined or empty");
      return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Check WebGL context availability
    //@ts-expect-error
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported or context creation failed");
      return;
    }

    // Configuration parameters
    const params = {
      falloff: 0.3,
      alpha: 0.6,
      dissipation: 0.965,
      distortionStrength: 0.08,
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

    // Main scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Flowmap scene and camera
    const flowmapScene = new THREE.Scene();
    const flowmapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Texture loading
    let texture: THREE.Texture | null = null;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";
    texture = textureLoader.load(
      imageSrc,
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
        console.error("Texture load failed:", err, "imageSrc:", imageSrc);
        setTimeout(() => {
          textureLoader.load(imageSrc, (tex) => {
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            texture = tex;
            console.log(
              "Texture retry loaded:",
              tex.image.width,
              "x",
              tex.image.height
            );
            updateRenderTargets();
            resize();
            animate();
          });
        }, 1000);
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
    let flowmapRT1:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;
    let flowmapRT2:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;
    let finalRT1: THREE.WebGLRenderTarget<THREE.Texture> | null = null;
    let finalRT2: THREE.WebGLRenderTarget<THREE.Texture> | null = null;
    let currentFlowmapRT:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;
    let previousFlowmapRT:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;
    let currentFinalRT:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;
    let previousFinalRT:
      | THREE.WebGLRenderTarget<THREE.Texture>
      | THREE.WebGLRenderTarget<THREE.Texture[]>
      | null = null;

    function updateRenderTargets() {
      const flowmapSize = 128;
      const finalSize = Math.min(
        //@ts-expect-error
        Math.max(container.clientWidth, container.clientHeight),
        512
      );
      //@ts-expect-error
      flowmapRT1 = new THREE.WebGLRenderTarget(
        flowmapSize,
        flowmapSize,
        rtParams
      );
      //@ts-expect-error
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

    function updateMouse(x: number, y: number) {
      //@ts-expect-error
      const rect = container.getBoundingClientRect();
      const mx = (x - rect.left) / rect.width;
      const my = 1 - (y - rect.top) / rect.height;
      mouse.target.set(mx, my);
    }

    function onMouseMove(event: { clientX: number; clientY: number }) {
      updateMouse(event.clientX, event.clientY);
    }

    function onTouchStart(event: { touches: string | any[] }) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        updateMouse(touch.clientX, touch.clientY);
        mouse.current.copy(mouse.target);
        mouse.lastPosition.copy(mouse.target);
      }
    }

    function onTouchMove(event: { touches: string | any[] }) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        updateMouse(touch.clientX, touch.clientY);
      }
    }

    function onTouchEnd() {
      mouse.target.set(-1, -1);
    }
    //@ts-expect-error
    container.addEventListener("mousemove", onMouseMove, { passive: true });
    //@ts-expect-error
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    //@ts-expect-error
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    //@ts-expect-error
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    // Resize handling
    let resizeTimeout: string | number | NodeJS.Timeout | undefined;
    function resize() {
      if (!texture || !texture.image) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer.setSize(width, height);
      //@ts-expect-error
      canvas.style.width = `${width}px`;
      //@ts-expect-error
      canvas.style.height = `${height}px`;

      flowmapUniforms.uResolution.value.set(width, height);
      flowmapUniforms.uAspect.value = width / height;

      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const imgAspect = imgWidth / imgHeight;

      const canvasAspect = width / height;

      // 90% of the available width — creates left/right padding
      const horizontalPadding = 0.9;

      let scaleX = 1;
      let scaleY = 1;

      if (imgAspect > canvasAspect) {
        // Wider image — scale to fit width with horizontal padding
        scaleX = horizontalPadding;
        scaleY = horizontalPadding * (canvasAspect / imgAspect);
      } else {
        // Taller image — scale to fit height with horizontal padding
        scaleY = horizontalPadding;
        scaleX = horizontalPadding * (imgAspect / canvasAspect);
      }

      uniforms.uImageScale.value.set(scaleX, scaleY);

      // No offset needed if the shader uses center-aligned scaling
      uniforms.uImageOffset.value.set(0, 0);

      const finalSize = Math.min(width, height, 512);
      finalRT1?.setSize(finalSize, finalSize);
      finalRT2?.setSize(finalSize, finalSize);
    }

    window.addEventListener(
      "resize",
      () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 100);
      },
      { passive: true }
    );

    // Animation loop
    let frameId: number;
    function animate() {
      if (
        !texture?.image ||
        !currentFlowmapRT ||
        !previousFlowmapRT ||
        !currentFinalRT ||
        !previousFinalRT
      ) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      mouse.lastPosition.copy(mouse.current);
      mouse.current.lerp(mouse.target, 0.7);
      const delta = new THREE.Vector2()
        .subVectors(mouse.current, mouse.lastPosition)
        .multiplyScalar(80);
      mouse.velocity.lerp(delta, 0.6);
      mouse.smoothVelocity.lerp(mouse.velocity, 0.3);
      mouse.velocity.multiplyScalar(params.velocityDamping);

      flowmapUniforms.uMouse.value.copy(mouse.current);
      flowmapUniforms.uVelocity.value
        .copy(mouse.smoothVelocity)
        .multiplyScalar(params.velocityScale);
      //@ts-expect-error
      flowmapUniforms.uTexture.value = previousFlowmapRT.texture;

      renderer.setRenderTarget(currentFlowmapRT);
      renderer.render(flowmapScene, flowmapCamera);
      //@ts-expect-error
      uniforms.uFlowmap.value = currentFlowmapRT.texture;
      //@ts-expect-error
      uniforms.uPreviousFrame.value = previousFinalRT.texture;
      uniforms.uIsFirstFrame.value = false;

      renderer.setRenderTarget(currentFinalRT);
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      [currentFlowmapRT, previousFlowmapRT] = [
        previousFlowmapRT,
        currentFlowmapRT,
      ];
      [currentFinalRT, previousFinalRT] = [previousFinalRT, currentFinalRT];

      frameId = requestAnimationFrame(animate);
    }

    // Initial resize
    setTimeout(resize, 0);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(resizeTimeout);
      //@ts-expect-error
      container.removeEventListener("mousemove", onMouseMove);
      //@ts-expect-error
      container.removeEventListener("touchstart", onTouchStart);
      //@ts-expect-error
      container.removeEventListener("touchmove", onTouchMove);
      //@ts-expect-error
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
    };
  }, [imageSrc]);

  return (
    <section
      style={{
        height: "calc(100vh - 210px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <section style={{ height: "100vh", width: "100vw" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative", // not fixed!
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </section>
    </section>
  );
}
