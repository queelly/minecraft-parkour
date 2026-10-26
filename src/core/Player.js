import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * Контроллер игрока с аутентичной физикой Minecraft Parkour + CS2 3D-ножами в руках:
 * - Точка `this.position` — это стопы игрока (`feetY`), глаза на `position.y + 1.62`.
 * - Синхронизирован с `WeaponViewModel`: при нажатии `F` запускает спин ножа на пальце,
 *   при клике ЛКМ — режущий взмах, при прыжке — подброс ножа.
 */
export class Player {
  constructor(camera, domElement, physics, audio, weaponViewModel) {
    this.camera = camera;
    this.domElement = domElement;
    this.physics = physics;
    this.audio = audio;
    this.weaponViewModel = weaponViewModel;

    this.controls = new PointerLockControls(this.camera, this.domElement);

    this.position = new THREE.Vector3(0, 2.0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.eyeHeight = 1.62;

    this.walkSpeed = 4.7;
    this.sprintSpeed = 6.6;
    this.gravity = 27.0;
    this.jumpForce = 9.0;
    this.doubleJumpForce = 8.3;

    this.coyoteTimeMax = 0.12;
    this.timeSinceGrounded = 0;
    this.onGround = false;
    this.canDoubleJump = true;

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();

    this.walkCycle = 0;
  }

  lockPointer(isMobile) {
    if (!isMobile && !this.controls.isLocked) {
      try {
        this.controls.lock();
      } catch (_) {}
    }
  }

  unlockPointer() {
    if (this.controls.isLocked) {
      try {
        this.controls.unlock();
      } catch (_) {}
    }
  }

  spawnAt(targetPos, yawAngle = 0) {
    this.position.copy(targetPos);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.timeSinceGrounded = 0;
    this.canDoubleJump = true;

    this.euler.set(0, yawAngle, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
    this._syncCameraPosition(0);

    // Эффектная прокрутка ножа при спавне на карте!
    if (this.weaponViewModel) {
      this.weaponViewModel.triggerInspect();
    }
  }

  update(delta, input, level) {
    // 1. Мобильный свайп-обзор
    const touchLook = input.consumeTouchLook();
    if (touchLook.dx !== 0 || touchLook.dy !== 0) {
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= touchLook.dx * 0.0045;
      this.euler.x = Math.max(
        -Math.PI / 2 + 0.08,
        Math.min(Math.PI / 2 - 0.08, this.euler.x - touchLook.dy * 0.0045)
      );
      this.camera.quaternion.setFromEuler(this.euler);
    }

    // 2. Анимации ножа по нажатию F (осмотр) и ЛКМ (удар)
    if (input.consumeInspect() && this.weaponViewModel) {
      this.weaponViewModel.triggerInspect();
      this.audio.playClick();
    }
    if (input.consumeSlash() && this.weaponViewModel) {
      this.weaponViewModel.triggerSlash();
      this.audio.playJump(true);
    }

    // 3. Векторы направления камеры
    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() > 0.0001) {
      this._forward.normalize();
    } else {
      this._forward.set(0, 0, -1);
    }
    this._right.crossVectors(this._forward, this.camera.up).normalize();

    const moveVec = input.getMovementVector();
    const isMoving = Math.hypot(moveVec.x, moveVec.z) > 0.05;
    const isSprinting = input.keys.sprint && moveVec.z > 0.1;
    const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    const targetVx = (this._right.x * moveVec.x + this._forward.x * moveVec.z) * speed;
    const targetVz = (this._right.z * moveVec.x + this._forward.z * moveVec.z) * speed;

    if (this.onGround) {
      const groundSnap = isMoving ? 28.0 : 38.0;
      const blend = Math.min(1.0, groundSnap * delta);
      this.velocity.x += (targetVx - this.velocity.x) * blend;
      this.velocity.z += (targetVz - this.velocity.z) * blend;
      if (!isMoving && Math.hypot(this.velocity.x, this.velocity.z) < 0.08) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    } else {
      const airControl = 12.0;
      const blend = Math.min(1.0, airControl * delta);
      this.velocity.x += (targetVx - this.velocity.x) * blend;
      this.velocity.z += (targetVz - this.velocity.z) * blend;
    }

    // 4. Coyote Time
    if (this.onGround) {
      this.timeSinceGrounded = 0;
      this.canDoubleJump = true;
    } else {
      this.timeSinceGrounded += delta;
    }

    // 5. Прыжок (одиночный + авто-прыжок при зажатом Пробеле + Double Jump в воздухе)
    const jumpJustPressed = input.consumeJump();
    const jumpHeldOnGround = input.keys.jumpHeld && this.onGround;

    if (jumpJustPressed || jumpHeldOnGround) {
      if (this.onGround || this.timeSinceGrounded <= this.coyoteTimeMax) {
        this.velocity.y = this.jumpForce;
        if (isSprinting) {
          this.velocity.x *= 1.12;
          this.velocity.z *= 1.12;
        }
        this.onGround = false;
        this.timeSinceGrounded = this.coyoteTimeMax + 1;
        this.canDoubleJump = true;
        if (this.weaponViewModel) this.weaponViewModel.triggerJumpImpulse();
        this.audio.playJump(false);
      } else if (jumpJustPressed && this.canDoubleJump) {
        this.velocity.y = this.doubleJumpForce;
        this.canDoubleJump = false;
        if (this.weaponViewModel) this.weaponViewModel.triggerSlash();
        this.audio.playJump(true);
      }
    }

    // 6. Гравитация и перемещение с AABB-коллизией
    this.velocity.y = Math.max(-34.0, this.velocity.y - this.gravity * delta);

    const collisionState = this.physics.moveAndCollide(
      this.position,
      this.velocity,
      delta,
      level.solidBlocks,
      this.onGround
    );

    this.onGround = collisionState.onGround;
    if (collisionState.landedThisFrame) {
      this.audio.playLand();
    }

    // 7. Динамический FOV при спринте
    const targetFov = isSprinting ? 84 : 75;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 10);
      this.camera.updateProjectionMatrix();
    }

    // 8. Синхронизация камеры и 3D-модели ножа
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && horizontalSpeed > 0.5) {
      this.walkCycle += delta * horizontalSpeed * 2.1;
    }

    const bobY = this.onGround && horizontalSpeed > 0.5 ? Math.sin(this.walkCycle * 2) * 0.036 : 0;
    this._syncCameraPosition(bobY);

    if (this.weaponViewModel) {
      this.weaponViewModel.update(delta, horizontalSpeed, this.onGround, this.velocity.y);
    }
  }

  _syncCameraPosition(bobY = 0) {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight + bobY,
      this.position.z
    );
  }

  getYaw() {
    this.euler.setFromQuaternion(this.camera.quaternion);
    return this.euler.y;
  }
}
