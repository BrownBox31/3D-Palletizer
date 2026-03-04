import * as React from 'react';
import {  useFrame } from '@react-three/fiber';
import { Box as DreiBox, Cylinder, Edges } from '@react-three/drei';
import * as THREE from 'three';
type GroupProps = React.JSX.IntrinsicElements['group'];


type RobotProps = GroupProps & {
  /** Auto animation toggle */
  auto?: boolean;
  /** Joint angles (radians). If `auto` is true, these are ignored */
  baseYaw?: number;      // J1
  shoulder?: number;     // J2
  elbow?: number;        // J3
  wristPitch?: number;   // J4
  wristYaw?: number;     // J5
  gripper?: number;      // 0..1 (open..closed)
};

const metal = (color: string) => (
  <meshStandardMaterial color={color} roughness={0.45} metalness={0.6} />
);

/**
 * Modern, compact SCARA/6-axis hybrid robot in RC12 spirit.
 * Hierarchical joints: Base -> Shoulder -> Elbow -> Wrist -> Gripper.
 */
export default function AnimatedRC12Robot({
  auto = true,
  baseYaw = 0,
  shoulder = 0.35,
  elbow = -0.65,
  wristPitch = 0.35,
  wristYaw = 0,
  gripper = 0.35,
  ...groupProps
}: RobotProps) {
  // Groups for joints
  const baseRef = React.useRef<THREE.Group>(null!);
  const shoulderRef = React.useRef<THREE.Group>(null!);
  const elbowRef = React.useRef<THREE.Group>(null!);
  const wristRef = React.useRef<THREE.Group>(null!);
  const toolRef = React.useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!auto) return;
    const t = clock.getElapsedTime();

    // Smooth looping motion with small phase offsets
    const j1 = Math.sin(t * 0.4) * 0.7;         // base yaw
    const j2 = 0.45 + Math.sin(t * 0.7 + 0.3) * 0.35; // shoulder
    const j3 = -0.8 + Math.sin(t * 0.8 + 1.2) * 0.45; // elbow
    const j4 = 0.25 + Math.sin(t * 1.0 + 2.0) * 0.35; // wrist pitch
    const j5 = Math.sin(t * 0.9 + 0.8) * 0.6;         // wrist yaw
    const g  = 0.25 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.5; // 0..1

    // Apply
    if (baseRef.current) baseRef.current.rotation.y = j1;
    if (shoulderRef.current) shoulderRef.current.rotation.z = j2;
    if (elbowRef.current) elbowRef.current.rotation.z = j3;
    if (wristRef.current) {
      wristRef.current.rotation.z = j4;
      wristRef.current.rotation.y = j5;
    }
    // gripper open/close -> 0..1 maps to 0..0.03 gap
    const gap = THREE.MathUtils.lerp(0.03, 0.002, g);
    setGripperGap(toolRef.current, gap);
  });

  // Manual control if auto=false
  React.useEffect(() => {
    if (auto) return;
    baseRef.current.rotation.y = baseYaw;
    shoulderRef.current.rotation.z = shoulder;
    elbowRef.current.rotation.z = elbow;
    wristRef.current.rotation.z = wristPitch;
    wristRef.current.rotation.y = wristYaw;
    setGripperGap(toolRef.current, THREE.MathUtils.lerp(0.03, 0.002, gripper));
  }, [auto, baseYaw, shoulder, elbow, wristPitch, wristYaw, gripper]);

  /** Position gripper fingers around tool center with the requested gap */
  function setGripperGap(tool: THREE.Group, gap: number) {
    if (!tool) return;
    const left = tool.getObjectByName('gripLeft') as THREE.Mesh;
    const right = tool.getObjectByName('gripRight') as THREE.Mesh;
    if (left && right) {
      left.position.x = -gap / 2;
      right.position.x = gap / 2;
    }
  }

  // Sizes
  const baseH = 2;
  const columnH = 16;
  const shoulderLen = 14;
  const elbowLen = 12;
  const wristLen = 6;

  return (
    <group {...groupProps}>

      {/* —— Base & Column —— */}
      <group ref={baseRef} position={[0, 0, 0]}>
        {/* Base disc */}
        <Cylinder args={[8, 8, baseH, 48]} position={[0, baseH / 2, 0]} castShadow receiveShadow>
          {metal('#3f4752')}
        </Cylinder>

        {/* Slew ring garnish */}
        <Cylinder args={[8.6, 8.6, 0.3, 48]} position={[0, baseH + 0.15, 0]}>
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.7} />
        </Cylinder>

        {/* Column */}
        <DreiBox args={[3.2, columnH, 3.2]} position={[0, baseH + columnH / 2, 0]} castShadow receiveShadow>
          {metal('#6b7280')}
        </DreiBox>

        {/* Shoulder mount (rotation in Z) */}
        <group ref={shoulderRef} position={[0, baseH + columnH, 0]}>
          {/* Shoulder hub */}
          <Cylinder args={[3.2, 3.2, 2.2, 36]} rotation={[Math.PI / 2, 0, 0]}>
            {metal('#4b5563')}
          </Cylinder>

          {/* Upper arm */}
          <DreiBox args={[shoulderLen, 2.2, 2.2]} position={[shoulderLen / 2, 0, 0]} castShadow receiveShadow>
            {metal('#ff6f3f')}
          </DreiBox>

          {/* —— Elbow joint —— */}
          <group ref={elbowRef} position={[shoulderLen, 0, 0]}>
            {/* Elbow hub */}
            <Cylinder args={[2.6, 2.6, 2, 30]} rotation={[Math.PI / 2, 0, 0]}>
              {metal('#4b5563')}
            </Cylinder>

            {/* Forearm */}
            <DreiBox args={[elbowLen, 2, 2]} position={[elbowLen / 2, 0, 0]} castShadow receiveShadow>
              {metal('#ff944d')}
            </DreiBox>

            {/* —— Wrist cluster —— */}
            <group ref={wristRef} position={[elbowLen, 0, 0]}>
              {/* Wrist pitch block */}
              <DreiBox args={[1.8, 2, 2]} castShadow receiveShadow>
                {metal('#64748b')}
              </DreiBox>

              {/* Wrist link */}
              <DreiBox args={[wristLen, 1.4, 1.4]} position={[wristLen / 2 + 1.2, 0, 0]} castShadow receiveShadow>
                {metal('#94a3b8')}
              </DreiBox>

              {/* —— Tooling & Gripper —— */}
              <group ref={toolRef} position={[wristLen + 1.2 + 0.9, 0, 0]}>
                <Cylinder args={[1.2, 1.2, 0.5, 24]} rotation={[0, 0, Math.PI / 2]}>
                  <meshStandardMaterial color="#a3b3c3" roughness={0.35} metalness={0.8} />
                </Cylinder>

                <DreiBox name="gripLeft" args={[0.6, 2.2, 0.4]} position={[-0.015, -1.1, 0]} castShadow receiveShadow>
                  {metal('#cbd5e1')}
                </DreiBox>
                <DreiBox name="gripRight" args={[0.6, 2.2, 0.4]} position={[+0.015, -1.1, 0]} castShadow receiveShadow>
                  {metal('#cbd5e1')}
                </DreiBox>
              </group>
            </group>
          </group>
        </group>
      </group>
      <Cylinder args={[9.5, 9.5, 0.1, 48]} position={[0, 0.05, 0]}>
        <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.35} roughness={0.9} />
      </Cylinder>

      <Edges scale={1.001} color="#000000" />
    </group>
  );
}
