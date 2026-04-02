(function () {
  console.log('[INTERACTION] Loaded');

  function waitForModel() {
    if (!window.__BARQ_MODEL__) {
      requestAnimationFrame(waitForModel);
      return;
    }

    init(window.__BARQ_MODEL__);
  }

  function init(model) {
    console.log('[INTERACTION] Model detected');

    const scene = window.__BARQ_SCENE__;
    const camera = window.__BARQ_CAMERA__;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const legs = {};
    let hoveredLeg = null;

    model.traverse((child) => {
    if (child.name && child.name.startsWith('Coxal_Joint_')) {

        const key = child.name.split('_')[2];

        // 🔥 CREATE WRAPPER GROUP (this fixes EVERYTHING)
        const wrapper = new THREE.Group();
        wrapper.name = 'WRAPPER_' + child.name;

        // insert wrapper at same level
        child.parent.add(wrapper);
        wrapper.position.copy(child.position);
        wrapper.rotation.copy(child.rotation);

        // re-parent leg into wrapper
        wrapper.add(child);
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);

        legs[key] = wrapper;

        wrapper.userData.originalPosition = wrapper.position.clone();
        wrapper.userData.originalScale = wrapper.scale.clone();
    }
    });

    function getLeg(obj) {
      while (obj) {
        if (obj.name && obj.name.startsWith('Coxal_Joint_')) return obj;
        obj = obj.parent;
      }
      return null;
    }

    // ─── Animation loop override ───
    function animateInteraction() {
      requestAnimationFrame(animateInteraction);

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      if (hits.length > 0) {
        hoveredLeg = getLeg(hits[0].object);
      } else {
        hoveredLeg = null;
      }

      Object.values(legs).forEach((leg) => {
        const active = leg === hoveredLeg;

        const targetPos = leg.userData.originalPosition.clone();
        const targetScale = new THREE.Vector3(1, 1, 1);

        if (active) {
          targetPos.z += 0.6;
          targetPos.y += 0.2;
          targetScale.set(1.2, 1.2, 1.2);
        }

        leg.position.lerp(targetPos, 0.08);
        leg.scale.lerp(targetScale, 0.08);

        if (active) {
          leg.rotation.y += 0.02;
        } else {
          leg.rotation.y *= 0.9;
        }
      });

      // ─── Dim others ───
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.transparent = true;
          child.material.opacity = 0.15;
        }
      });

      if (hoveredLeg) {
        hoveredLeg.traverse((child) => {
          if (child.isMesh) {
            child.material.opacity = 1;
          }
        });
      }

      document.body.style.cursor = hoveredLeg ? 'pointer' : 'default';
    }

    animateInteraction();
  }

  waitForModel();
})();