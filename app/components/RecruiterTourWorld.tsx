'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, Text } from '@react-three/drei';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { Group, Mesh } from 'three';
import * as THREE from 'three';

const ARRIVE_DIST = 0.14;
const LERP = 4.2;

function stationPositions(count: number): [number, number, number][] {
  if (count <= 0) return [];
  const R = 4.35;
  const out: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = Math.PI * (0.72 - t * 1.44);
    const x = Math.sin(a) * R;
    const z = Math.cos(a) * R * 0.88 - 0.35;
    out.push([x, 0, z]);
  }
  return out;
}

function boardRotationY(x: number, z: number): number {
  return Math.atan2(x, z) + Math.PI;
}

function CameraRig({ robotRef }: { robotRef: RefObject<Group | null> }) {
  const ideal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const r = robotRef.current;
    if (!r) return;
    const cam = state.camera;
    ideal.set(r.position.x - 4.5, 6.2, r.position.z + 9.5);
    cam.position.lerp(ideal, 1 - Math.exp(-2.4 * dt));
    look.set(r.position.x, 0.95, r.position.z);
    cam.lookAt(look);
  });
  return null;
}

function GeoBot({
  groupRef,
  walkingRef,
}: {
  groupRef: RefObject<Group | null>;
  walkingRef: RefObject<boolean>;
}) {
  const legL = useRef<Mesh>(null);
  const legR = useRef<Mesh>(null);

  useFrame(state => {
    const moving = walkingRef.current;
    const t = state.clock.elapsedTime;
    const s = moving ? Math.sin(t * 13) * 0.42 : 0;
    if (legL.current) legL.current.rotation.x = moving ? s : THREE.MathUtils.lerp(legL.current.rotation.x, 0, 0.12);
    if (legR.current) legR.current.rotation.x = moving ? -s : THREE.MathUtils.lerp(legR.current.rotation.x, 0, 0.12);
  });

  const cyan = '#2ee8f5';
  const body = '#1a1838';
  const accent = '#b44fff';

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 1.38, 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.52, 0.38, 0.46]} />
        <meshStandardMaterial color={body} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 1.38, 0.24]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.08]} />
        <meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.85} metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[-0.1, 1.42, 0.24]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#001018" emissive={cyan} emissiveIntensity={1.2} />
      </mesh>
      <mesh castShadow position={[0.1, 1.42, 0.24]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#001018" emissive={cyan} emissiveIntensity={1.2} />
      </mesh>
      <mesh castShadow position={[0, 1.82, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 2.02, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#ff4fa3" emissive="#ff4fa3" emissiveIntensity={1.1} />
      </mesh>

      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[0.58, 0.72, 0.42]} />
        <meshStandardMaterial color={body} metalness={0.4} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0.23]}>
        <planeGeometry args={[0.32, 0.22]} />
        <meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.15} transparent opacity={0.9} />
      </mesh>

      <group position={[-0.38, 1.12, 0]} rotation={[0, 0, 0.25]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.07, 0.36, 6, 10]} />
          <meshStandardMaterial color="#2a2850" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
      <group position={[0.38, 1.12, 0]} rotation={[0, 0, -0.25]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.07, 0.36, 6, 10]} />
          <meshStandardMaterial color="#2a2850" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>

      <group ref={legL} position={[-0.16, 0.62, 0]}>
        <mesh castShadow position={[0, -0.28, 0]} rotation={[0.05, 0, 0]}>
          <capsuleGeometry args={[0.09, 0.52, 6, 10]} />
          <meshStandardMaterial color="#242344" metalness={0.25} roughness={0.55} />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.62, 0]}>
        <mesh castShadow position={[0, -0.28, 0]} rotation={[0.05, 0, 0]}>
          <capsuleGeometry args={[0.09, 0.52, 6, 10]} />
          <meshStandardMaterial color="#242344" metalness={0.25} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

function StationBoard({
  index,
  position,
  label,
  arrivedAt,
  walkTarget,
  onPick,
}: {
  index: number;
  position: [number, number, number];
  label: string;
  arrivedAt: number;
  walkTarget: number;
  onPick: (i: number) => void;
}) {
  const [x, , z] = position;
  const ry = boardRotationY(x, z);
  const isCurrent = arrivedAt === index;
  const isQueued = walkTarget === index && walkTarget !== arrivedAt;
  const emissive = isCurrent ? '#00f5ff' : isQueued ? '#b44fff' : '#1a6a72';

  return (
    <group position={position} rotation={[0, ry, 0]}>
      <mesh
        position={[0, 1.05, 0.07]}
        receiveShadow
        castShadow
        onClick={e => {
          e.stopPropagation();
          onPick(index);
        }}
        onPointerOver={e => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[2.35, 1.45, 0.14]} />
        <meshStandardMaterial
          color={isCurrent ? '#0a2530' : '#060818'}
          metalness={0.25}
          roughness={0.55}
          emissive={emissive}
          emissiveIntensity={isCurrent ? 0.45 : isQueued ? 0.35 : 0.12}
        />
      </mesh>
      <mesh position={[0, 1.05, 0.15]}>
        <planeGeometry args={[2.05, 1.15]} />
        <meshStandardMaterial color="#02040c" metalness={0.15} roughness={0.85} />
      </mesh>
      <Text position={[0, 1.35, 0.16]} fontSize={0.19} color="#b8f7ff" anchorX="center" anchorY="middle" maxWidth={1.9}>
        {label}
      </Text>
      <Text position={[0, 0.82, 0.16]} fontSize={0.11} color="rgba(0,245,255,0.55)" anchorX="center" anchorY="middle">
        {isCurrent ? '● LIVE' : 'TAP TO VISIT'}
      </Text>
    </group>
  );
}

function TourScene({
  walkTarget,
  arrivedAt,
  boardTabs,
  onStationPick,
  onBotArrived,
}: {
  walkTarget: number;
  arrivedAt: number;
  boardTabs: string[];
  onStationPick: (i: number) => void;
  onBotArrived: (i: number) => void;
}) {
  const positions = useMemo(() => stationPositions(boardTabs.length), [boardTabs.length]);
  const robotRef = useRef<Group>(null);
  const walkingRef = useRef(false);
  const allowArrive = useRef(true);
  const cbRef = useRef(onBotArrived);

  useEffect(() => {
    cbRef.current = onBotArrived;
  }, [onBotArrived]);

  useLayoutEffect(() => {
    const bot = robotRef.current;
    const p0 = positions[0];
    if (bot && p0) {
      bot.position.set(p0[0], 0, p0[2]);
      bot.rotation.y = 0;
    }
  }, [positions]);

  useEffect(() => {
    allowArrive.current = true;
  }, [walkTarget]);

  useFrame((_, dt) => {
    const bot = robotRef.current;
    if (!bot || positions.length === 0) return;
    const [tx, , tz] = positions[walkTarget] ?? positions[0];
    const k = 1 - Math.exp(-LERP * dt);
    bot.position.x = THREE.MathUtils.lerp(bot.position.x, tx, k);
    bot.position.z = THREE.MathUtils.lerp(bot.position.z, tz, k);

    const dx = tx - bot.position.x;
    const dz = tz - bot.position.z;
    const dist = Math.hypot(dx, dz);
    walkingRef.current = dist > 0.09;

    if (dist > 0.06) {
      const face = Math.atan2(dx, dz);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, face, 1 - Math.exp(-5 * dt));
    }

    if (dist < ARRIVE_DIST && allowArrive.current) {
      allowArrive.current = false;
      cbRef.current(walkTarget);
    }
    if (dist > 0.28) allowArrive.current = true;
  });

  return (
    <>
      <color attach="background" args={['#030208']} />
      <fog attach="fog" args={['#030208', 12, 38]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[-6, 8, -4]} intensity={0.55} color="#b44fff" />
      <pointLight position={[4, 3, 6]} intensity={0.4} color="#00f5ff" />

      <Grid
        position={[0, -0.01, 0]}
        infiniteGrid
        fadeDistance={28}
        fadeStrength={1}
        sectionSize={3.5}
        sectionThickness={1}
        sectionColor="#0c3a44"
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#0a2228"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#05040f" metalness={0.1} roughness={0.92} />
      </mesh>

      {positions.map((pos, i) => (
        <StationBoard
          key={boardTabs[i] ?? i}
          index={i}
          position={pos}
          label={boardTabs[i] ?? `Stop ${i + 1}`}
          arrivedAt={arrivedAt}
          walkTarget={walkTarget}
          onPick={onStationPick}
        />
      ))}

      <GeoBot groupRef={robotRef} walkingRef={walkingRef} />
      <CameraRig robotRef={robotRef} />
    </>
  );
}

export type RecruiterTourWorldProps = {
  walkTarget: number;
  arrivedAt: number;
  boardTabs: string[];
  onStationPick: (i: number) => void;
  onBotArrived: (i: number) => void;
  className?: string;
};

export default function RecruiterTourWorld({
  walkTarget,
  arrivedAt,
  boardTabs,
  onStationPick,
  onBotArrived,
  className,
}: RecruiterTourWorldProps) {
  const onPick = useCallback(
    (i: number) => {
      onStationPick(i);
    },
    [onStationPick],
  );

  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 42, near: 0.1, far: 80, position: [-5, 6.5, 11] }}
      >
        <TourScene walkTarget={walkTarget} arrivedAt={arrivedAt} boardTabs={boardTabs} onStationPick={onPick} onBotArrived={onBotArrived} />
      </Canvas>
    </div>
  );
}
