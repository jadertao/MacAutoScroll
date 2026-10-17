# MacAutoScroll
An extension that brings Windows-style middle-click auto-scrolling to Mac and Linux browsers.

[Chrome Web Store Link](https://chromewebstore.google.com/detail/mac-autoscroll/femlmfpifefkfnpodfflonahfggcahda)

## Principles
This extension is supposed to be faithful to the original feature as much as possible

## Features

* **Middle-click auto-scrolling**: Click and hold the middle mouse button for 1 second to activate auto-scroll mode
* **Directional scrolling**: Move your mouse in any direction to control scroll speed and direction
* **Speed control**: Scroll speed increases based on how far you move the mouse from the initial click point
* **Configurable domains**: Use regular expressions to choose which websites auto-scroll works on (see Settings below)

## Installation

1. Press the blue button `<> Code`.
2. Hover over the `Download Zip` button and click it to download the ZIP version of this repository.

### &nbsp;&nbsp;&nbsp;Or

Use the `git clone` command to copy it onto your computer:
```bash
git clone https://github.com/Spark4444/MacAutoScroll
```
3. Go to the extensions tab in your browser.
4. Enable developer mode in the top-right corner.
5. Press the "Load unpacked" button and select the `MacAoutScroll` folder from the downloaded files (the one inside the main `MacAutoScroll` folder). That's it!

## Usage

* **Activating auto-scroll**: Press and hold the middle mouse button for 1 second on any webpage that has scrollable content. A small circle at the click point fills up while you hold the button; auto-scroll starts as soon as it is full
* **Controlling direction and speed**: 
  - Move your mouse away from the initial click point to start scrolling
  - The further you move the mouse, the faster the scrolling becomes
  - Move up/down to scroll vertically, left/right to scroll horizontally
  - Move diagonally to scroll in both directions simultaneously
* **Visual indicators**: The cursor will change to show arrows indicating the current scroll direction
* **Stopping auto-scroll**: 
  - Right click anywhere on the page
  - Switch to another tab or window
  - Move the mouse back to the center (dead zone)

A quick middle click (shorter than 1 second) is left untouched, so opening links in
new tabs, middle-click paste and middle-drag gestures of websites keep working.

## Settings

Right click the extension icon and choose "Options" (or open the extension details
page and click "Extension options") to configure:

* **Enable extension**: master switch
* **Long press duration**: how long the middle button must be held before
  auto-scroll activates (100 - 5000 ms, default 1000 ms)
* **Active domains**: one regular expression per line, matched against the
  domain (hostname) in the address bar. Lines starting with `#` are comments,
  and an empty list means every website. Examples:

  ```
  example\.com$          # example.com and any subdomain
  .*\.google\.com$       # all google.com subdomains
  (^|\.)zhihu\.com$      # zhihu.com and its subdomains
  ```

  The settings page validates each pattern and includes a tester where you can
  type a domain to see whether auto-scroll would be active there.

## How It Works

* **Event Detection**: The extension listens for middle mouse button clicks (button 1) on all web pages

* **Overlay Creation**: When activated, creates an invisible overlay that captures mouse movements

* **Speed Calculation**: Calculates scroll speed based on mouse distance from the initial click point

* **Dead Zone**:  The extension uses a 4% screen size dead zone to make the hitboxes of the initial click point larger so it's easier to navigate back to the center and to use the single direction movements.

* **Direction Mapping**: Maps mouse movement to 8 different scroll directions with corresponding cursor icons

* **Smooth Scrolling**: Uses `setInterval` for smooth, continuous scrolling at 10ms intervals, always with `behavior: "instant"` so a page level `scroll-behavior: smooth` cannot slow it down
* **Page Scroll Interference**: While auto-scroll is active, `scroll-behavior: smooth` and `scroll-snap-type` of the scroll container are temporarily neutralized (and restored afterwards), because both would otherwise animate or snap every scroll step and make the auto-scroll feel slow or get stuck

* **Auto-cleanup**: Automatically stops scrolling when the user clicks, switches tabs, or moves the mouse to the center

### Current state of this project
Finished