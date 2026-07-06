import * as THREE from "three";

/** Unit vector along the classic 1:1:1 isometric viewing axis (≈35.26° above ground). */
const ISO_AXIS = new THREE.Vector3(1, 1, 1).normalize();

/** Default distance from the look-at target to the camera along {@link ISO_AXIS}. */
export const ISO_CAMERA_DISTANCE = 14.7;

const _offset = new THREE.Vector3();

/** Polar angle for OrbitControls (radians), matching {@link ISO_AXIS}. */
export const ISO_POLAR_ANGLE = Math.acos(ISO_AXIS.y);

export const ISO_POLAR_SLACK = THREE.MathUtils.degToRad(8);

/** Horizontal yaw for pre-drawn isometric sprites facing the default camera. */
export const ISO_SPRITE_Y = Math.PI / 4;

export function getIsometricOffset(
  distance = ISO_CAMERA_DISTANCE,
  target = _offset,
): THREE.Vector3 {
  return target.copy(ISO_AXIS).multiplyScalar(distance);
}

export function setIsometricCameraPosition(
  camera: THREE.Camera,
  targetX: number,
  targetZ: number,
  distance = ISO_CAMERA_DISTANCE,
): void {
  const offset = getIsometricOffset(distance);
  camera.position.set(targetX + offset.x, offset.y, targetZ + offset.z);
  camera.lookAt(targetX, 0, targetZ);
}
