// Auto-scroll functionality for middle mouse button click
// Auto-scroll only activates after the middle button has been held down
// for the configured long press duration (1s by default).

// Movement (in px) that cancels a pending long press. This keeps middle
// button drag gestures of websites working.
const HOLD_CANCEL_DISTANCE = 15;

// Delay before the progress indicator appears, so that quick middle clicks
// stay completely unobtrusive
const HOLD_INDICATOR_DELAY = 120;

// The pending long press, null when the middle button is not being held
let pendingHold = null;

// Attach the main listener once the settings are available
initSettings(function () {
  document.addEventListener('mousedown', onMiddleMouseDown, true);
});

function onMiddleMouseDown(event) {
  // stop scrolling on any click
  if (autoScrollEnabled && event.button !== 1) {
    stopScrolling();
    return;
  }

  const targetElement = findClosestScrollableElement(event.target);
  const scrollbarDirection = isElementScrollable(targetElement);

  // Middle mouse button is button 1
  if (event.button === 1 && scrollbarDirection !== 'none' && targetElement) {
    // If autoscroll is already enabled, a middle click should stop it.

    if (autoScrollEnabled) {
      stopScrolling();
      event.preventDefault();
      return;
    }

    // Only arm the long press when the extension is enabled for this domain
    if (!isAutoScrollAllowedHere()) {
      return;
    }

    // Safety: never arm two holds at once
    if (pendingHold) {
      pendingHold.cancel();
    }

    startAutoScrollHold(event, targetElement, scrollbarDirection);
  }
}

// Cancel a pending long press, e.g. when the settings change mid-hold
function cancelAutoScrollHold() {
  if (pendingHold) {
    pendingHold.cancel();
  }
}

// Arm the long press: wait for the duration, show a progress indicator and
// activate auto-scroll when the button is still held down.
function startAutoScrollHold(event, targetElement, scrollbarDirection) {
  const duration = getLongPressDuration();
  const startX = event.clientX;
  const startY = event.clientY;
  const startTime = performance.now();

  const onHoldMouseMove = function (e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy > HOLD_CANCEL_DISTANCE * HOLD_CANCEL_DISTANCE) {
      cancel();
    }
  };

  // Releasing the middle button too early is a normal click: do nothing
  const onHoldMouseUp = function (e) {
    if (e.button === 1) {
      cancel();
    }
  };

  const onHoldMouseDown = function (e) {
    if (e.button !== 1) {
      cancel();
    }
  };

  const onHoldKeyDown = function () {
    cancel();
  };

  const onHoldWheel = function () {
    cancel();
  };

  const onHoldBlur = function () {
    cancel();
  };

  function removeHoldListeners() {
    document.removeEventListener('mousemove', onHoldMouseMove, true);
    document.removeEventListener('mouseup', onHoldMouseUp, true);
    document.removeEventListener('mousedown', onHoldMouseDown, true);
    document.removeEventListener('keydown', onHoldKeyDown, true);
    document.removeEventListener('wheel', onHoldWheel, true);
    window.removeEventListener('blur', onHoldBlur);
  }

  // Release every resource held by the pending long press
  function teardownHold() {
    if (hold.timer) {
      clearTimeout(hold.timer);
      hold.timer = null;
    }
    if (hold.indicatorTimer) {
      clearTimeout(hold.indicatorTimer);
      hold.indicatorTimer = null;
    }
    if (hold.animationFrame) {
      cancelAnimationFrame(hold.animationFrame);
      hold.animationFrame = null;
    }
    removeHoldListeners();
    removeHoldIndicator();
  }

  // Abort the hold without activating auto-scroll
  function cancel() {
    if (pendingHold !== hold) {
      return;
    }
    pendingHold = null;
    teardownHold();
  }

  // The button was held long enough: activate auto-scroll
  function activate() {
    if (pendingHold !== hold) {
      return;
    }
    pendingHold = null;
    teardownHold();

    // Check if the event has been prevented by the website, the settings
    // may also have changed while the button was held down
    if (event.defaultPrevented || !isAutoScrollAllowedHere()) {
      return;
    }

    startScrolling(event, targetElement, scrollbarDirection);
  }

  const hold = {
    cancel: cancel,
    activate: activate,
    timer: null,
    indicatorTimer: null,
    animationFrame: null,
  };
  pendingHold = hold;

  document.addEventListener('mousemove', onHoldMouseMove, true);
  document.addEventListener('mouseup', onHoldMouseUp, true);
  document.addEventListener('mousedown', onHoldMouseDown, true);
  document.addEventListener('keydown', onHoldKeyDown, true);
  document.addEventListener('wheel', onHoldWheel, true);
  window.addEventListener('blur', onHoldBlur);

  // Only show the progress indicator once the press is clearly intentional
  hold.indicatorTimer = setTimeout(function () {
    if (pendingHold === hold) {
      createHoldIndicator(startX, startY);
    }
  }, HOLD_INDICATOR_DELAY);

  // The timer is the authoritative trigger, so activation never depends on
  // the render loop being available
  hold.timer = setTimeout(function () {
    if (pendingHold === hold) {
      activate();
    }
  }, duration);

  // requestAnimationFrame only animates the indicator
  function holdLoop(now) {
    if (pendingHold !== hold) {
      return;
    }

    updateHoldIndicator(Math.min(1, (now - startTime) / duration));
    hold.animationFrame = requestAnimationFrame(holdLoop);
  }

  hold.animationFrame = requestAnimationFrame(holdLoop);
}

// Activate auto-scroll mode
function startScrolling(event, targetElement, scrollbarDirection) {
  defaultCursor = autoScrollSvg;
  if (scrollbarDirection === 'horizontal') {
    defaultCursor = horizontalScrollSvg;
  } else if (scrollbarDirection === 'vertical') {
    defaultCursor = verticalScrollSvg;
  }

  // Original Mouse positions
  const originalMouseY = event.clientY;
  const originalMouseX = event.clientX;

  let hasScrolled = false;

  // Scroll speed
  let scrollSpeedX = 0;
  let scrollSpeedY = 0;

  // Direction flags
  // 0 = no scroll, 1 = scrolling, -1 = scrolling opposite direction
  let scrollingDirection = {
    upDown: 0,
    leftRight: 0,
  };

  // Update the scroll speed based on mouse movement
  updateScrollSpeed = function (e) {
    // Calculate the change in mouse position
    const deltaY = e.clientY - originalMouseY;
    const deltaX = e.clientX - originalMouseX;

    // Get screen dimensions
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    // Calculate percentage of screen moved (0-1 range)
    const percentageY = Math.abs(deltaY) / screenHeight;
    const percentageX = Math.abs(deltaX) / screenWidth;

    // Calculate the scroll speed based on percentage of screen moved
    // Only start scrolling if movement exceeds the dead zone percentage
    if (percentageY < deadZonePercentage || scrollbarDirection === 'horizontal') {
      scrollSpeedY = 0;
    } else {
      // Calculate effective percentage after removing dead zone
      const effectivePercentageY = percentageY - deadZonePercentage;

      // Scale to maximum speed, maintaining direction
      const direction = deltaY > 0 ? 1 : -1;
      scrollSpeedY =
        direction * Math.min(maxSpeed, effectivePercentageY * maxSpeed * 2);
    }

    // Same logic for horizontal movement
    if (percentageX < deadZonePercentage || scrollbarDirection === 'vertical') {
      scrollSpeedX = 0;
    } else {
      // Calculate effective percentage after removing dead zone
      const effectivePercentageX = percentageX - deadZonePercentage;

      // Scale to maximum speed, maintaining direction
      const direction = deltaX > 0 ? 1 : -1;
      scrollSpeedX =
        direction * Math.min(maxSpeed, effectivePercentageX * maxSpeed * 2);
    }

    updateSpeedDirection();
  };

  // Function to update scrolling direction based on speed
  function updateSpeedDirection() {
    if (scrollSpeedY > 0) {
      scrollingDirection.upDown = 1; // Scrolling down
    } else if (scrollSpeedY < 0) {
      scrollingDirection.upDown = -1; // Scrolling up
    } else {
      scrollingDirection.upDown = 0; // No vertical scroll
    }

    if (scrollSpeedX > 0) {
      scrollingDirection.leftRight = 1; // Scrolling right
    } else if (scrollSpeedX < 0) {
      scrollingDirection.leftRight = -1; // Scrolling left
    } else {
      scrollingDirection.leftRight = 0; // No horizontal scroll
    }

    if (scrollingDirection.upDown !== 0 || scrollingDirection.leftRight !== 0) {
      hasScrolled = true;
    }

    // Set the cursor depending on the scroll direction
    if (
      scrollingDirection.upDown === 0 &&
      scrollingDirection.leftRight === 0
    ) {
      scrollOverlay.style.cursor = `url("${defaultCursor}"), none`;
    } else if (
      scrollingDirection.upDown === 1 &&
      scrollingDirection.leftRight === 0
    ) {
      scrollOverlay.style.cursor = `url("${bottomSvg}"), none`;
    } else if (
      scrollingDirection.upDown === -1 &&
      scrollingDirection.leftRight === 0
    ) {
      scrollOverlay.style.cursor = `url("${topSvg}"), none`;
    } else if (
      scrollingDirection.upDown === 0 &&
      scrollingDirection.leftRight === 1
    ) {
      scrollOverlay.style.cursor = `url("${rightSvg}"), none`;
    } else if (
      scrollingDirection.upDown === 0 &&
      scrollingDirection.leftRight === -1
    ) {
      scrollOverlay.style.cursor = `url("${leftSvg}"), none`;
    } else if (
      scrollingDirection.upDown === 1 &&
      scrollingDirection.leftRight === 1
    ) {
      scrollOverlay.style.cursor = `url("${bottomRightSvg}"), none`;
    } else if (
      scrollingDirection.upDown === 1 &&
      scrollingDirection.leftRight === -1
    ) {
      scrollOverlay.style.cursor = `url("${bottomLeftSvg}"), none`;
    } else if (
      scrollingDirection.upDown === -1 &&
      scrollingDirection.leftRight === 1
    ) {
      scrollOverlay.style.cursor = `url("${topRightSvg}"), none`;
    } else if (
      scrollingDirection.upDown === -1 &&
      scrollingDirection.leftRight === -1
    ) {
      scrollOverlay.style.cursor = `url("${topLeftSvg}"), none`;
    }
  }

  event.preventDefault();

  autoScrollEnabled = true;

  // create an overlay for the autoscroll
  createOverlay(scrollbarDirection);

  // Scroll the page continuously
  scrollInterval = setInterval(function () {
    targetElement.scrollBy(scrollSpeedX, scrollSpeedY);
  }, 10);

  // Listen for mouse movements and switching to another tab
  document.addEventListener('mousemove', updateScrollSpeed);
  window.addEventListener('blur', stopScrolling, { once: true });
  document.addEventListener('keydown', stopScrolling, {
    once: true,
    capture: true,
  });
  document.addEventListener('mousedown', stopScrolling, {
    once: true,
    capture: true,
  });
  document.addEventListener('wheel', preventScrolling, {
    capture: true,
    passive: false,
  });
  document.addEventListener('keydown', preventScrolling, { capture: true });

  // Stop scrolling on mouse up once the user has scrolled, e.g. they held
  // the button, scrolled and then let go
  stopScrollOnMouseUp = function () {
    if (hasScrolled) {
      stopScrolling();
    }
  };
  document.addEventListener('mouseup', stopScrollOnMouseUp);
}
