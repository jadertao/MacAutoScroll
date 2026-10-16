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

// Function to check if an element is overflow hidden
function isElementOverflowHidden(element) {
  const styles = getComputedStyle(element);
  const result = {
    horizontal: styles.overflowX === 'hidden' || styles.overflowX === 'clip',
    vertical: styles.overflowY === 'hidden' || styles.overflowY === 'clip',
  };

  return result;
}

// Function to check if an element has a scrollbar
function isElementScrollable(element) {
  if (element) {
    function checkScrollBar(element, dir) {
      dir = dir === 'vertical' ? 'scrollTop' : 'scrollLeft';

      let res = !!element[dir];

      if (!res) {
        element[dir] = 1;
        res = !!element[dir];
        element[dir] = 0;
      }

      return res;
    }

    const hasOverflow = isElementOverflowHidden(element);
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