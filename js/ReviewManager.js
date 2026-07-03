export default class ReviewManager {
  constructor(storageKey = "lebanonTrailGuideReviews") {
    this.storageKey = storageKey;
  }

  getReviews(trailId) {
    return this.getAllReviews().filter((review) => review.trailId === trailId);
  }

  addReview(trailId, author, rating, body) {
    const review = {
      id: crypto.randomUUID(),
      trailId,
      author,
      rating: Number(rating),
      body,
      createdAt: new Date().toISOString()
    };
    const reviews = [...this.getAllReviews(), review];
    window.localStorage.setItem(this.storageKey, JSON.stringify(reviews));
    return review;
  }

  getAllReviews() {
    const savedReviews = window.localStorage.getItem(this.storageKey);
    return savedReviews ? JSON.parse(savedReviews) : [];
  }
}
