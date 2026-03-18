import * as THREE from "three";
import {
  Canvas,
  type GroupProps,
  useFrame,
  useLoader,
} from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import {
  CustomBlending,
  OneFactor,
  SRGBColorSpace,
  SrcAlphaFactor,
} from "three";
import CameraControls from "camera-controls";
import appIconDarkUrl from "../static/img/hero/app_icon_dark.jpg";
import appIconUrl from "../static/img/hero/app_icon.jpg";
import glowUrl from "../static/img/hero/glow3.png";
import logoUrl from "../static/img/hero/logo_420b.obj";
import normalsUrl from "../static/img/hero/normals_420_512.png";
import recordingUrl from "../static/img/hero/recording.mp4";
import roughnessUrl from "../static/img/hero/roughness_420.png";

let webglAvailable = true;

try {
  const canvas = document.createElement("canvas");
  webglAvailable = !!(
    window.WebGLRenderingContext &&
    (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
  );
} catch {
  webglAvailable = false;
}

CameraControls.install({ THREE });

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Vec3Tuple = [number, number, number];
type ColorMode = "light" | "dark";

interface ControlsProps {
  pos?: THREE.Vector3;
  look?: THREE.Vector3;
  lookAt: Vec3Tuple;
  destPosition: Vec3Tuple;
}

function Controls({
  pos = new THREE.Vector3(),
  look = new THREE.Vector3(),
  lookAt,
  destPosition,
}: ControlsProps): null {
  useFrame((state) => {
    pos.set(destPosition[0], destPosition[1], destPosition[2]);
    look.set(lookAt[0], lookAt[1], lookAt[2]);

    state.camera.position.lerp(pos, 0.05);
    state.camera.updateProjectionMatrix();
    state.camera.lookAt(look);
  });

  return null;
}

const screenSize = 2.05;
const screenRatio = 160 / 144;

const CELEBRATE_DURATION_MS = 1100;
const CELEBRATE_DURATION_S = CELEBRATE_DURATION_MS / 1000;

interface SceneProps extends GroupProps {
  colorMode: ColorMode;
  isCelebrating: boolean;
  onCelebratingComplete: () => void;
}

function Scene({
  colorMode,
  isCelebrating,
  onCelebratingComplete,
  ...groupProps
}: SceneProps): JSX.Element {
  const ref = useRef<THREE.Group>(null);

  const lastIsCelebrating = useRef(false);
  const celebrateStartTime = useRef<number | null>(null);

  const baseRotationZ = useRef(0);
  const basePosition = useRef(new THREE.Vector3());
  const baseScale = useRef(new THREE.Vector3(1, 1, 1));

  useFrame((state) => {
    const group = ref.current;
    if (!group) return;

    if (isCelebrating !== lastIsCelebrating.current) {
      lastIsCelebrating.current = isCelebrating;

      if (isCelebrating) {
        baseRotationZ.current = group.rotation.z;
        basePosition.current.copy(group.position);
        baseScale.current.copy(group.scale);
        celebrateStartTime.current = state.clock.getElapsedTime();
      }
    }

    if (!isCelebrating || celebrateStartTime.current === null) {
      return;
    }

    const t = state.clock.getElapsedTime() - celebrateStartTime.current;

    if (t >= CELEBRATE_DURATION_S) {
      group.rotation.z = baseRotationZ.current;
      group.position.copy(basePosition.current);
      group.scale.copy(baseScale.current);
      celebrateStartTime.current = null;
      onCelebratingComplete();
      return;
    }

    const progress = t / CELEBRATE_DURATION_S;
    const eased = easeInOutCubic(progress);
    const envelope = Math.sin(progress * Math.PI);

    const fullTurn = Math.PI * 2;
    group.rotation.z = baseRotationZ.current - fullTurn * eased;

    const zPushBack = 0.9;
    const shrink = 0.18;
    const bounce = 0.18;

    group.position.z = basePosition.current.z - zPushBack * envelope;
    group.position.y =
      basePosition.current.y + Math.sin(progress * Math.PI) * bounce * 0.5;

    const s = 1 - shrink * envelope;
    group.scale.set(
      baseScale.current.x * s,
      baseScale.current.y * s,
      baseScale.current.z * s,
    );
  });

  const textureUrl = colorMode === "dark" ? appIconDarkUrl : appIconUrl;

  const obj = useLoader(OBJLoader, logoUrl);
  const texture = useLoader(TextureLoader, textureUrl);
  const normals = useLoader(TextureLoader, normalsUrl);
  const roughness = useLoader(TextureLoader, roughnessUrl);
  const glow = useLoader(TextureLoader, glowUrl);

  texture.colorSpace = SRGBColorSpace;

  const [video] = useState<HTMLVideoElement>(() => {
    const vid = document.createElement("video");
    vid.src = recordingUrl;
    vid.crossOrigin = "anonymous";
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    void vid.play();
    return vid;
  });

  useEffect(() => {
    return () => {
      video.pause();
    };
  }, [video]);

  const geometry = useMemo<THREE.BufferGeometry | undefined>(() => {
    let meshGeometry: THREE.BufferGeometry | undefined;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        meshGeometry = child.geometry;
      }
    });

    return meshGeometry;
  }, [obj]);

  if (!geometry) {
    return <group ref={ref} {...groupProps} />;
  }

  return (
    <group ref={ref} {...groupProps}>
      <group rotation={[Math.PI * 0.5, 0, 0]}>
        <mesh geometry={geometry} scale={1}>
          <meshStandardMaterial
            map={texture}
            normalMap={normals}
            roughnessMap={roughness}
            roughness={0.7}
            normalScale={new THREE.Vector2(0.3, 0.3)}
          />
        </mesh>

        <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, 0.55, -0.26]}>
          <planeGeometry args={[screenSize, screenSize / screenRatio]} />
          <meshStandardMaterial
            roughness={0.2}
            depthTest={false}
            depthWrite={false}
          >
            <videoTexture attach="map" args={[video]} />
          </meshStandardMaterial>
        </mesh>
      </group>

      <Billboard
        position={[-1.4, 0.57, 0.56]}
        follow
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <mesh>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial
            map={glow}
            polygonOffset
            polygonOffsetFactor={-500}
            depthTest={false}
            depthWrite={false}
            blending={CustomBlending}
            blendSrc={SrcAlphaFactor}
            blendDst={OneFactor}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

const distance = 10;
const initialPos: Vec3Tuple = [-3, -2, 9];

interface GB3DProps {
  colorMode: ColorMode;
}

export const GB3D = ({ colorMode }: GB3DProps): JSX.Element => {
  const [pos, setPos] = useState<Vec3Tuple>(initialPos);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const triggerCelebrate = useCallback(() => {
    setIsCelebrating((prev) => {
      if (prev) return prev;
      return true;
    });
  }, []);

  const onCelebratingComplete = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isCelebrating || e.touches.length === 0) {
        return;
      }

      const touch = e.touches[0];
      const angle = 0.3 + -1.3 * clamp01(touch.pageX / window.innerWidth);

      setPos([
        distance * Math.sin(angle),
        -2 + clamp01(touch.pageY / window.innerHeight) * 8,
        distance * Math.cos(angle),
      ]);
    },
    [isCelebrating],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isCelebrating) {
        return;
      }

      if (e.pageX >= window.innerWidth - 50) {
        setPos(initialPos);
        return;
      }

      const angle = 0.6 + -1.3 * clamp01(e.pageX / window.innerWidth);

      setPos([
        distance * Math.sin(angle),
        -2 + clamp01(e.pageY / window.innerHeight) * 8,
        distance * Math.cos(angle),
      ]);
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isCelebrating]);

  const fallback = <div>FALLBACK</div>;

  if (!webglAvailable) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <Canvas
        camera={{
          fov: 32,
          near: 0.1,
          far: 1000,
          position: initialPos,
        }}
        onTouchMove={(e) => onTouchMove(e.nativeEvent)}
        onPointerDown={triggerCelebrate}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[-5, 2, -10]} intensity={1.2} decay={0.01} />
        <pointLight position={[3, 2.2, 3]} intensity={4} decay={0.000001} />

        <Scene
          colorMode={colorMode}
          isCelebrating={isCelebrating}
          onCelebratingComplete={onCelebratingComplete}
        />

        <Controls destPosition={pos} lookAt={[0, -0.1, 0]} />
      </Canvas>
    </Suspense>
  );
};
