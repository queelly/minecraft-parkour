/**
 * Универсальный менеджер ввода для десктопа и мобильных устройств:
 * - Десктоп: WASD / Стрелки (движение), Space (прыжок / авто-прыжок при зажатии), Shift (спринт),
 *   F (крутка/осмотр ножа CS2), ЛКМ (взмах ножом), R (рестарт), Esc (пауза).
 * - Мобильные: Виртуальный джойстик слева, кнопки Прыжок, Спринт и Осмотр ножа справа, свайп для обзора.
 */
export class Input {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jumpHeld: false
    };

    this.jumpPressed = false;
    this.restartPressed = false;
    this.pausePressed = false;
    this.inspectPressed = false;
    this.slashPressed = false;

    this.joyX = 0;
    this.joyY = 0;

    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;

    this.isMobile = this._detectMobile();

    this._initKeyboard();
    this._initMouse();
    this._initMobileControls();
  }

  _detectMobile() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 820
    );
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'Space':
          this.keys.jumpHeld = true;
          if (!e.repeat) {
            this.jumpPressed = true;
          }
          break;
        case 'KeyF':
          if (!e.repeat) {
            this.inspectPressed = true;
          }
          break;
        case 'KeyR':
          if (!e.repeat) {
            this.restartPressed = true;
          }
          break;
        case 'Escape':
          if (!e.repeat) {
            this.pausePressed = true;
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
        case 'Space':
          this.keys.jumpHeld = false;
          break;
      }
    });

    window.addEventListener('blur', () => {
      this.resetState();
    });
  }

  _initMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement) {
        this.slashPressed = true;
      }
    });
  }

  _initMobileControls() {
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    const lookZone = document.getElementById('touch-look-zone');
    const jumpBtn = document.getElementById('btn-mobile-jump');
    const sprintBtn = document.getElementById('btn-mobile-sprint');
    const inspectBtn = document.getElementById('btn-mobile-inspect');
    const pauseBtn = document.getElementById('btn-mobile-pause');

    if (!joyZone || !lookZone) return;

    let joyTouchId = null;
    const maxRadius = 42;

    const updateJoystick = (clientX, clientY) => {
      const rect = joyZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      if (joyKnob) {
        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      this.joyX = dx / maxRadius;
      this.joyY = -dy / maxRadius;
    };

    const resetJoystick = () => {
      joyTouchId = null;
      this.joyX = 0;
      this.joyY = 0;
      if (joyKnob) {
        joyKnob.style.transform = 'translate(0px, 0px)';
      }
    };

    joyZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      joyTouchId = touch.identifier;
      updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyTouchId) {
          updateJoystick(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    joyZone.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          resetJoystick();
          break;
        }
      }
    });
    joyZone.addEventListener('touchcancel', resetJoystick);

    let lookTouchId = null;
    let lastLookX = 0;
    let lastLookY = 0;

    lookZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchId) {
          this.touchLookDeltaX += t.clientX - lastLookX;
          this.touchLookDeltaY += t.clientY - lastLookY;
          lastLookX = t.clientX;
          lastLookY = t.clientY;
          break;
        }
      }
    }, { passive: false });

    const endLook = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
          break;
        }
      }
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);

    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.jumpHeld = true;
        this.jumpPressed = true;
      }, { passive: false });
      jumpBtn.addEventListener('touchend', () => {
        this.keys.jumpHeld = false;
      });
      jumpBtn.addEventListener('mousedown', () => {
        this.jumpPressed = true;
      });
    }

    if (sprintBtn) {
      sprintBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys.sprint = true;
      }, { passive: false });
      sprintBtn.addEventListener('touchend', () => {
        this.keys.sprint = false;
      });
    }

    if (inspectBtn) {
      inspectBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.inspectPressed = true;
      }, { passive: false });
      inspectBtn.addEventListener('click', () => {
        this.inspectPressed = true;
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.pausePressed = true;
      });
    }
  }

  getMovementVector() {
    let moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0) + this.joyX;
    let moveZ = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0) + this.joyY;

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    return { x: moveX, z: moveZ };
  }

  consumeJump() {
    const val = this.jumpPressed;
    this.jumpPressed = false;
    return val;
  }

  consumeInspect() {
    const val = this.inspectPressed;
    this.inspectPressed = false;
    return val;
  }

  consumeSlash() {
    const val = this.slashPressed;
    this.slashPressed = false;
    return val;
  }

  consumeRestart() {
    const val = this.restartPressed;
    this.restartPressed = false;
    return val;
  }

  consumePause() {
    const val = this.pausePressed;
    this.pausePressed = false;
    return val;
  }

  consumeTouchLook() {
    const dx = this.touchLookDeltaX;
    const dy = this.touchLookDeltaY;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    return { dx, dy };
  }

  resetState() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.keys.jumpHeld = false;
    this.jumpPressed = false;
    this.inspectPressed = false;
    this.slashPressed = false;
    this.joyX = 0;
    this.joyY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
  }
}
