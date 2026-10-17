// Function to stop auto-scrolling
function stopScrolling() {
  if (autoScrollEnabled) {
    autoScrollEnabled = false;
    if (scrollInterval) {
      clearInterval(scrollInterval);
    }

    if (scrollOverlay) {
      removeOverlay();
    }

    restoreScrollSnapping();

    if (updateScrollSpeed) {
      document.removeEventListener('mousemove', updateScrollSpeed);
    }
    window.removeEventListener('blur', stopScrolling);
    document.removeEventListener('mousedown', stopScrolling, true);
    document.removeEventListener('keydown', stopScrolling, true);
    document.removeEventListener('wheel', preventScrolling, true);
    document.removeEventListener('keydown', preventScrolling, true);
  }

  // Always safe to run, also cleans up when called while already stopped
  if (stopScrollOnMouseUp) {
    document.removeEventListener('mouseup', stopScrollOnMouseUp);
  }
}

// ---------------------------------------------------------------------------
// Programmatic scrolling can be animated ("scroll-behavior: smooth") or
// snapped ("scroll-snap-type") by the page itself. Both would slow the
// auto-scroll down, so they are neutralized on the scroll containers while
// auto-scroll is active and restored afterwards.
// ---------------------------------------------------------------------------

let scrollSnapOverrides = [];

function neutralizeScrollSnapping(targetElement) {
  restoreScrollSnapping();

  const elements = [targetElement, document.documentElement, document.body];

  for (const element of elements) {
    if (!element || !element.style) {
      continue;
    }

    scrollSnapOverrides.push({
      element: element,
      scrollBehavior: element.style.getPropertyValue('scroll-behavior'),
      scrollSnapType: element.style.getPropertyValue('scroll-snap-type'),
    });

    element.style.setProperty('scroll-behavior', 'auto', 'important');
    element.style.setProperty('scroll-snap-type', 'none', 'important');
  }
}

function restoreScrollSnapping() {
  for (const override of scrollSnapOverrides) {
    // Setting a property to an empty string removes the inline declaration
    override.element.style.setProperty('scroll-behavior', override.scrollBehavior);
    override.element.style.setProperty('scroll-snap-type', override.scrollSnapType);
  }
  scrollSnapOverrides = [];
}

// Force instant scroll behavior on an element for a short moment and return
// the previous inline declaration so it can be restored afterwards
function forceInstantScrollBehavior(element) {
  if (!element || !element.style) {
    return null;
  }

  const saved = {
    value: element.style.getPropertyValue('scroll-behavior'),
    priority: element.style.getPropertyPriority('scroll-behavior'),
  };
  element.style.setProperty('scroll-behavior', 'auto', 'important');
  return saved;
}

function restoreScrollBehavior(element, saved) {
  if (!element || !element.style || !saved) {
    return;
  }
  element.style.setProperty('scroll-behavior', saved.value, saved.priority);
}

// Function to check if an element has a scrollbar
function isElementScrollable(element) {
  if (element) {
    function checkScrollBar(element, dir) {
      dir = dir === 'vertical' ? 'scrollTop' : 'scrollLeft';

      let res = !!element[dir];

      if (!res) {
        // "scroll-behavior: smooth" animates the scroll, so the property
        // would not change synchronously and the check would report a
        // scrollable element as not scrollable. Force instant behavior
        // while probing.
        const savedBehavior = forceInstantScrollBehavior(element);
        element[dir] = 1;
        res = !!element[dir];
        element[dir] = 0;
        restoreScrollBehavior(element, savedBehavior);
      }

      return res;
    }

    const styles = getComputedStyle(element);
    const hasOverflow = {
      horizontal: styles.overflowX === 'hidden' || styles.overflowX === 'clip',
      vertical: styles.overflowY === 'hidden' || styles.overflowY === 'clip',
    };
    const hasVerticalScrollbar =
      checkScrollBar(element, 'vertical') && !hasOverflow.vertical;
    const hasHorizontalScrollbar =
      checkScrollBar(element, 'horizontal') && !hasOverflow.horizontal;

    if (hasHorizontalScrollbar && hasVerticalScrollbar) {
      return 'both';
    } else if (hasHorizontalScrollbar) {
      return 'horizontal';
    } else if (hasVerticalScrollbar) {
      return 'vertical';
    }
    return 'none';
  }
}

// Find the closest scrollable ancestor element
function findClosestScrollableElement(element) {
  let scrollable = isElementScrollable(element);
  while (scrollable === 'none' && element) {
    // Check if the element is a shadow host
    element = element.parentElement || element.parentNode.host;
    scrollable = isElementScrollable(element);
  }

  if (!element) {
    return null;
  }

  return element;
}

// Prevent scrolling
function preventScrolling(e) {
  e.preventDefault();
  e.stopPropagation();
}