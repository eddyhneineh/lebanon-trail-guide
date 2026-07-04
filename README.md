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

<!-- To be completed manually by the author before submission -->
