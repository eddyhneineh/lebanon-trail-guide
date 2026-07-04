# Lebanon Trail Guide

Lebanon Trail Guide is a static HTML, CSS, and vanilla JavaScript site for exploring hiking routes across Lebanon. It includes a responsive trail map, trail list, live trailhead weather conditions, Firebase-backed authentication, and community reviews.

## Author

Eddy Hneineh

## APIs Used

- OpenWeatherMap: current trailhead conditions based on each trail's latitude and longitude.
- Firebase: Authentication and Firestore storage for trail reviews.

## Custom Unique Requirement

The site includes a sticky footer that remains fixed to the bottom of the viewport while preserving page content spacing. It contains social links and direct contact information so the portfolio/contact details are always available without blocking the main experience.

## Map Features

The 2D map uses Leaflet with a satellite imagery view and a terrain layer toggle. It includes trail markers, city labels, scale controls, filters, and review loading from marker selections.

The 3D map uses Three.js to render an interactive Lebanon terrain view with trail markers. Users can switch into navigation mode to rotate, zoom, and pan the terrain, then select trails to view details and reviews.

## Setup and Run Locally

This project is a static site and does not require a build step.

1. Clone or download the project.
2. From the project root, start a local static server:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://127.0.0.1:8000/index.html` in a browser.
4. To use live weather, replace `OPENWEATHER_API_KEY` in `js/WeatherService.js` with a valid OpenWeatherMap API key.
5. Firebase Auth and Firestore use the configuration in `js/firebaseApp.js`.

## Deployment

The site is ready for Vercel as a static deployment from the project root. There is no package install, framework build, or output directory required. Internal assets use relative paths so the HTML files can be served directly.

## AI-Use Appendix

**a. Tools used and what for**

I used **Codex** (via a locally connected coding session) to scaffold and implement the front-end code for this project, including: initial project structure, trail data entries, the 3D (Three.js) and 2D (Leaflet) interactive maps, the filter panel, Firebase Authentication and Firestore-based review system, the OpenWeatherMap conditions page, responsive/mobile styling, and deployment configuration. I used **Claude** as a planning and debugging assistant — to structure the project into a clear sequence of build steps, explain git/GitHub workflow (branches, commits, pushing), walk through Firebase Console setup, and help diagnose errors as they came up.

**Prompts I gave Claude to help plan the work** (before turning them into the Codex prompts below):

1. *"give me a full outline"* — after deciding on the Lebanon Hiking & Trail Guide concept, I asked Claude to lay out the site structure, data plan, JS architecture, and a phased work plan.

2. *"can we make it to be a starting hero section and theres a 3d lebanon map in someway and then we press anywhere to browse and we get on this map the location of each trail where we can scroll and use the mouse to move around this 3d map... and we can press on each one and get some info on it and we can apply a filter..."* — I described the interactive 3D map/filter/review concept in my own words, and asked Claude to help turn it into a concrete, buildable layout with both frontend and backend components.

3. *"give me the prompts i should give codex to build the entire project"* — once the plan was set, I asked Claude to translate the outline into a specific sequence of step-by-step prompts I could feed into Codex.

**b. Actual prompts used in Codex**

1. *"Using Three.js (via CDN import), build a TrailMap3D ES6 class in /js/TrailMap3D.js that: creates a 3D scene representing Lebanon's rough geography... sets up a camera with OrbitControls so users can rotate, zoom, and pan around the map using the mouse... converts each trail's lat/lon into x/z coordinates on the 3D plane and places a marker at each location..."*

2. *"Integrate Firebase (Auth + Firestore) via the Firebase JS SDK CDN... Build an AuthManager ES6 class that handles email/password sign up and login via Firebase Auth... Build a ReviewManager ES6 class that reads reviews for the selected trail from a Firestore collection called 'reviews'... Shows an 'Add Review' form only if the user is logged in..."*

3. *"Wire 2D map marker clicks to trigger the reviews section... Clicking a marker on the 2D map currently only shows a Leaflet popup — it does not trigger the reviews section below the map like the 3D map's marker click does..."*

**c. Specific things the AI got wrong, and how I found and fixed them**

1. **ES6 module CORS failure when opening the site locally.** After building the 3D map, the page showed a blank map stuck on "Loading trails..." with no visible errors on the page itself. I opened the browser console (DevTools) and found the error: `Access to script at 'file:///...' has been blocked by CORS policy`. This happened because I was opening `index.html` directly by double-clicking it, and ES6 module imports (required for Three.js) are blocked by browsers when loaded via the `file://` protocol. I fixed this by serving the project through a local server (`npx serve`) instead of opening the file directly, which resolved the issue immediately.

2. **2D map marker clicks did not trigger the reviews feature.** After adding a 2D Leaflet map alongside the existing 3D map, I noticed that clicking a trail marker on the 2D view showed a popup with trail info, but did not open the reviews section below the map — this only worked when using the 3D map. I caught this by manually testing both views after the 2D map was added, since the AI's own automated tests had only checked marker/filter behavior, not review-triggering specifically. I asked the AI to wire the 2D map's click handler into the same `ReviewManager.showForTrail()` function already used by the 3D map, which fixed the gap and made the review feature work consistently regardless of which map view a user starts on.

3. **A filter drawer overlapping the map's layer switcher.** While testing the newly added 2D map's satellite/terrain toggle, I found that opening the filter panel visually covered Leaflet's layer control, making it unclickable. I found this by trying to switch layers with the filter drawer open and noticing nothing happened. The AI then repositioned the layer control to the opposite corner of the map to avoid the overlap.
