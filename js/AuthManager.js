export default class AuthManager {
  constructor(storageKey = "lebanonTrailGuideUser") {
    this.storageKey = storageKey;
  }

  getCurrentUser() {
    const savedUser = window.localStorage.getItem(this.storageKey);
    return savedUser ? JSON.parse(savedUser) : null;
  }

  signIn(displayName) {
    const user = { displayName, signedInAt: new Date().toISOString() };
    window.localStorage.setItem(this.storageKey, JSON.stringify(user));
    return user;
  }

  signOut() {
    window.localStorage.removeItem(this.storageKey);
  }
}
