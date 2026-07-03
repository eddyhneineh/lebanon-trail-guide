export default class TrailMap3D {
  constructor(container, detailTarget) {
    this.container = container;
    this.detailTarget = detailTarget;
    this.plane = null;
  }

  init() {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = "";
    this.plane = document.createElement("div");
    this.plane.className = "map-plane";
    this.container.append(this.plane);
  }

  render(trails) {
    if (!this.plane) {
      this.init();
    }

    this.plane.querySelectorAll(".trail-marker").forEach((marker) => marker.remove());
    trails.forEach((trail) => this.plane.append(this.createMarker(trail)));

    if (trails.length) {
      this.showTrail(trails[0]);
    } else if (this.detailTarget) {
      this.detailTarget.textContent = "No trails match the selected filters.";
    }
  }

  createMarker(trail) {
    const marker = document.createElement("button");
    const point = trail.mapPoint;
    marker.className = "trail-marker";
    marker.type = "button";
    marker.style.left = `${point.x}%`;
    marker.style.top = `${point.y}%`;
    marker.setAttribute("aria-label", trail.name);
    marker.title = trail.name;
    marker.addEventListener("click", () => this.showTrail(trail));
    return marker;
  }

  showTrail(trail) {
    if (!this.detailTarget) {
      return;
    }

    this.detailTarget.innerHTML = `
      <strong>${trail.name}</strong>
      <p class="mb-1">${trail.description}</p>
      <small class="text-muted">${trail.metaLine}</small>
    `;
  }

  resetView() {
    if (!this.plane) {
      return;
    }

    this.plane.animate(
      [
        { transform: "rotateX(62deg) rotateZ(-8deg) scale(1.02)" },
        { transform: "rotateX(62deg) rotateZ(-8deg) scale(1)" }
      ],
      { duration: 280, easing: "ease-out" }
    );
  }
}
