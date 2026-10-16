// General variables
let autoScrollEnabled = false;
let defaultCursor = autoScrollSvg;
let scrollInterval, scrollOverlay;
let updateScrollSpeed; // Keep reference to remove listener
let stopScrollOnMouseUp; // Keep reference to remove listener

// Function to create an overlay
function createOverlay(type) {
  scrollOverlay = document.createElement('div');
  scrollOverlay.style.position = 'fixed';
  scrollOverlay.style.top = '0';
  scrollOverlay.style.left = '0';
  scrollOverlay.style.width = '100%';
  scrollOverlay.style.height = '100%';
  scrollOverlay.style.zIndex = '9999';
  scrollOverlay.style.cursor = `url("${defaultCursor}"), none`;
  scrollOverlay.style.background = 'rgba(0, 0, 0, 0)';
  scrollOverlay.classList.add('scrollOverlay');
  document.body.appendChild(scrollOverlay);
}

// Function to remove the overlay
function removeOverlay() {
  if (scrollOverlay) {
    scrollOverlay.remove();
  }
}

// ---------------------------------------------------------------------------
// Hold indicator
// A small circle shown at the click point while the middle button is held
// down. It fills up over the long press duration to tell the user that
// keeping the button pressed will activate auto-scroll.
// ---------------------------------------------------------------------------

let holdIndicator = null;
let holdIndicatorFill = null;

// Create the indicator centered on (x, y)
function createHoldIndicator(x, y) {
  removeHoldIndicator();

  holdIndicator = document.createElement('div');
  holdIndicator.classList.add('masHoldIndicator');
  holdIndicator.style.position = 'fixed';
  holdIndicator.style.left = x + 'px';
  holdIndicator.style.top = y + 'px';
  holdIndicator.style.width = '34px';
  holdIndicator.style.height = '34px';
  holdIndicator.style.margin = '-17px 0 0 -17px';
  holdIndicator.style.zIndex = '2147483647';
  holdIndicator.style.pointerEvents = 'none';
  holdIndicator.style.borderRadius = '50%';
  holdIndicator.style.boxSizing = 'border-box';
  holdIndicator.style.border = '2px solid rgba(0, 0, 0, 0.35)';
  holdIndicator.style.background = 'rgba(255, 255, 255, 0.55)';
  holdIndicator.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.25)';

  holdIndicatorFill = document.createElement('div');
  holdIndicatorFill.style.width = '100%';
  holdIndicatorFill.style.height = '100%';
  holdIndicatorFill.style.borderRadius = '50%';
  holdIndicatorFill.style.background = 'rgba(0, 0, 0, 0.45)';
  holdIndicatorFill.style.transform = 'scale(0)';
  holdIndicator.appendChild(holdIndicatorFill);

  (document.body || document.documentElement).appendChild(holdIndicator);
}

// Update the fill of the indicator, progress is 0..1
function updateHoldIndicator(progress) {
  if (holdIndicatorFill) {
    const clamped = Math.max(0, Math.min(1, progress));
    const scale = 0.05 + 0.95 * clamped;
    holdIndicatorFill.style.transform = 'scale(' + scale + ')';
  }
}

// Function to remove the hold indicator
function removeHoldIndicator() {
  if (holdIndicator) {
    holdIndicator.remove();
    holdIndicator = null;
    holdIndicatorFill = null;
  }
}
