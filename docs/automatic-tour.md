# Automatic exhibit tour

The visitor view starts an automatic tour after 60 seconds without pointer, touch, wheel, scroll or keyboard activity. Pressing **G** starts it immediately; pressing G again or interacting with the page stops it and leaves the current exhibit under manual control. G is ignored as a shortcut inside editable fields. The tour is disabled on admin routes and stops when the tab becomes hidden.

The tour visits available catalog entries in display order and loops:

1. Load an exhibit and allow five seconds for its intro.
2. Frame its bounding sphere, then complete a full 360-degree orbit over 24 seconds.
3. Show each enabled hotspot for 6.5 seconds, with a stationary close-up framed around its highlighted geometry. Approach from model +Z; thin flat parts are viewed toward their broad face (for example, the horizontal transformer ring is viewed from above). Leave room beside the part for its explanation panel.
4. Return to the full-exhibit framing and complete another 360-degree orbit over 24 seconds.
5. Return to the catalog for 2.5 seconds and open the next exhibit.

Camera transitions take 1.6 seconds. Orbits use elapsed time and explicit camera positions rather than OrbitControls' indefinite auto-rotation, so each orbit completes exactly one turn. User camera controls and damping settings are restored when the tour is interrupted.

Unavailable entries are skipped. Failed loads advance after the catalog pause. Interaction during loading invalidates that tour request before a late model can be attached. Existing model caching is reused. On exit, camera tweens and automatic hotspot presentation stop and previous orbit settings are restored.

Timing defaults live in `client/src/Experience/UI/AutomaticTour.js`. The badge at the bottom of the page indicates that the tour is active. Audio playback remains subject to browser autoplay permissions.

Verification:

```powershell
cd client
node tests/automatic-tour.test.cjs
npm run build
```
