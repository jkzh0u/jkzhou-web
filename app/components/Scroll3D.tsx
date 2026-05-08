'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function CameraModel() {
  const groupRef = useRef<THREE.Group>(null)

  const { scene } = useGLTF('/3dModel/Polaroid_Camera/Polaroid_Camera.gltf')

useFrame(() => {
  if (!groupRef.current) return

  const maxScroll =
    document.body.scrollHeight - window.innerHeight

  const raw =
    maxScroll > 0 ? window.scrollY / maxScroll : 0

  // smoother easing
  const scroll = Math.min(raw * 3, 1)

  // rotate
  groupRef.current.rotation.y = scroll * Math.PI * 1.3

  // slight tilt
  groupRef.current.rotation.x = scroll * 0.15

  // move left
  groupRef.current.position.x = scroll * -2

  // scale down slightly as it leaves
  const scale = 1 - scroll * 0.25
  groupRef.current.scale.set(scale, scale, scale)
})

  return (
    <group ref={groupRef}>
      <Center>
        <group scale={.7}>
          <primitive object={scene} />
        </group>
      </Center>
    </group>
  )
}

export default function ScrollScene() {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={2} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <CameraModel />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/3dModel/Polaroid_Camera/Polaroid_Camera.gltf')