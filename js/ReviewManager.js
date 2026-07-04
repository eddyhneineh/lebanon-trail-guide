import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export default class ReviewManager {
  constructor({
    db,
    authManager,
    container = document.querySelector("#trail-reviews")
  } = {}) {
    this.db = db;
    this.authManager = authManager;
    this.container = container;
    this.selectedTrail = null;
    this.reviews = [];
    this.isLoading = false;

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  init() {
    if (!this.container) {
      return;
    }

    this.container.hidden = true;
    this.container.addEventListener("submit", this.handleSubmit);

    this.authManager?.subscribe(() => {
      if (this.selectedTrail) {
        this.render();
      }
    });
  }

  async showForTrail(trail) {
    if (!this.container || !trail) {
      return;
    }

    this.selectedTrail = trail;
    this.container.hidden = false;
    this.isLoading = true;
    this.render();

    try {
      this.reviews = await this.fetchReviews(trail.id);
    } catch (error) {
      console.error("Review load failed", error);
      this.reviews = null;
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  clear() {
    this.selectedTrail = null;
    this.reviews = [];

    if (this.container) {
      this.container.hidden = true;
      this.container.innerHTML = "";
    }
  }

  async fetchReviews(trailId) {
    const reviewQuery = query(
      collection(this.db, "reviews"),
      where("trailId", "==", trailId)
    );
    const snapshot = await getDocs(reviewQuery);

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => this.getTimestampMs(b.timestamp) - this.getTimestampMs(a.timestamp));
  }

  render() {
    if (!this.container || !this.selectedTrail) {
      return;
    }

    this.container.innerHTML = `
      <div class="container py-5">
        <div class="section-heading reviews-heading">
          <p class="eyebrow">Trail reviews</p>
          <h2>${this.escapeHtml(this.selectedTrail.name)}</h2>
        </div>
        <div class="row g-4">
          <div class="col-lg-7">
            <div class="reviews-list" aria-live="polite">
              ${this.renderReviews()}
            </div>
          </div>
          <div class="col-lg-5">
            ${this.renderReviewForm()}
          </div>
        </div>
      </div>
    `;
  }

  renderReviews() {
    if (this.isLoading) {
      return '<div class="review-empty">Loading reviews...</div>';
    }

    if (this.reviews === null) {
      return '<div class="review-empty">Unable to load reviews. Add your Firebase config and check Firestore access.</div>';
    }

    if (!this.reviews.length) {
      return '<div class="review-empty">No reviews yet for this trail.</div>';
    }

    return this.reviews.map((review) => `
      <article class="review-card">
        <div class="review-card-header">
          <strong>${this.escapeHtml(review.userName || "Trail member")}</strong>
          <span class="review-stars" aria-label="${Number(review.rating) || 0} out of 5 stars">
            ${this.renderStars(Number(review.rating) || 0)}
          </span>
        </div>
        <p>${this.escapeHtml(review.comment || "")}</p>
        <small>${this.formatDate(review.timestamp)}</small>
      </article>
    `).join("");
  }

  renderReviewForm() {
    const user = this.authManager?.getCurrentUser();

    if (!user) {
      return `
        <div class="review-form-panel">
          <h3>Add a review</h3>
          <p class="mb-3">Log in to add a review for this trail.</p>
          <button class="btn btn-primary" type="button" data-auth-login-button>Log in</button>
        </div>
      `;
    }

    return `
      <form class="review-form-panel" data-review-form>
        <h3>Add a review</h3>
        <fieldset class="review-rating" aria-label="Rating">
          ${[5, 4, 3, 2, 1].map((rating) => `
            <input type="radio" id="reviewRating${rating}" name="rating" value="${rating}" ${rating === 5 ? "checked" : ""}>
            <label for="reviewRating${rating}" title="${rating} stars">
              <i class="bi bi-star-fill" aria-hidden="true"></i>
              <span class="visually-hidden">${rating} stars</span>
            </label>
          `).join("")}
        </fieldset>
        <label class="form-label" for="reviewComment">Comment</label>
        <textarea class="form-control" id="reviewComment" name="comment" rows="4" maxlength="800" required></textarea>
        <button class="btn btn-primary mt-3" type="submit">Submit review</button>
      </form>
    `;
  }

  async handleSubmit(event) {
    const form = event.target.closest("[data-review-form]");

    if (!form || !this.selectedTrail) {
      return;
    }

    event.preventDefault();
    const user = this.authManager?.getCurrentUser();

    if (!user) {
      this.authManager?.showLoginModal();
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const comment = String(formData.get("comment")).trim();
    const rating = Number(formData.get("rating"));

    if (!comment || !rating) {
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await addDoc(collection(this.db, "reviews"), {
        trailId: this.selectedTrail.id,
        userId: user.uid,
        userName: user.displayName || user.email || "Trail member",
        rating,
        comment,
        timestamp: serverTimestamp()
      });

      form.reset();
      await this.showForTrail(this.selectedTrail);
    } catch (error) {
      console.error("Review submit failed", error);
      const errorTarget = document.createElement("div");
      errorTarget.className = "alert alert-danger mt-3";
      errorTarget.textContent = "Unable to submit review. Check your Firebase config and Firestore rules.";
      form.append(errorTarget);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit review";
    }
  }

  renderStars(rating) {
    return [1, 2, 3, 4, 5].map((star) => `
      <i class="bi ${star <= rating ? "bi-star-fill" : "bi-star"}" aria-hidden="true"></i>
    `).join("");
  }

  formatDate(timestamp) {
    const milliseconds = this.getTimestampMs(timestamp);

    if (!milliseconds) {
      return "Just now";
    }

    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(milliseconds));
  }

  getTimestampMs(timestamp) {
    if (!timestamp) {
      return 0;
    }

    if (typeof timestamp.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (timestamp.seconds) {
      return timestamp.seconds * 1000;
    }

    return Date.parse(timestamp) || 0;
  }

  escapeHtml(value) {
    const escapeTarget = document.createElement("div");
    escapeTarget.textContent = String(value);
    return escapeTarget.innerHTML;
  }
}
