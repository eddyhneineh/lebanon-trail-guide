import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export default class AuthManager {
  constructor({
    auth,
    loginButtonSelector = "[data-auth-login-button]",
    modalId = "authModal"
  } = {}) {
    this.auth = auth;
    this.loginButtonSelector = loginButtonSelector;
    this.modalId = modalId;
    this.currentUser = null;
    this.modal = null;
    this.modalElement = null;
    this.userControls = null;
    this.authMode = "login";
    this.subscribers = new Set();

    this.handleAuthSubmit = this.handleAuthSubmit.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  init() {
    if (!this.auth) {
      return;
    }

    this.renderModal();
    this.renderUserControls();
    document.addEventListener("click", this.handleDocumentClick);

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this.updateNavbar();
      this.notifySubscribers();
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.currentUser);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.currentUser));
  }

  renderModal() {
    if (document.querySelector(`#${this.modalId}`)) {
      this.modalElement = document.querySelector(`#${this.modalId}`);
      this.modal = new bootstrap.Modal(this.modalElement);
      return;
    }

    this.modalElement = document.createElement("div");
    this.modalElement.className = "modal fade";
    this.modalElement.id = this.modalId;
    this.modalElement.tabIndex = -1;
    this.modalElement.setAttribute("aria-labelledby", `${this.modalId}Label`);
    this.modalElement.setAttribute("aria-hidden", "true");
    this.modalElement.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content auth-modal">
          <div class="modal-header">
            <div>
              <p class="eyebrow mb-1">Trail community</p>
              <h1 class="modal-title fs-4" id="${this.modalId}Label">Log in</h1>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form data-auth-form>
            <div class="modal-body">
              <div class="alert alert-danger d-none" data-auth-error role="alert"></div>
              <div class="mb-3 d-none" data-auth-name-field>
                <label class="form-label" for="authDisplayName">Name</label>
                <input class="form-control" id="authDisplayName" name="displayName" type="text" autocomplete="name">
              </div>
              <div class="mb-3">
                <label class="form-label" for="authEmail">Email</label>
                <input class="form-control" id="authEmail" name="email" type="email" autocomplete="email" required>
              </div>
              <div class="mb-3">
                <label class="form-label" for="authPassword">Password</label>
                <input class="form-control" id="authPassword" name="password" type="password" autocomplete="current-password" minlength="6" required>
              </div>
            </div>
            <div class="modal-footer justify-content-between">
              <button class="btn btn-link px-0" type="button" data-auth-mode-toggle>Create account</button>
              <button class="btn btn-primary" type="submit" data-auth-submit>Log in</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.append(this.modalElement);
    this.modal = new bootstrap.Modal(this.modalElement);
    this.modalElement.querySelector("[data-auth-form]").addEventListener("submit", this.handleAuthSubmit);
    this.modalElement.querySelector("[data-auth-mode-toggle]").addEventListener("click", () => {
      this.setAuthMode(this.authMode === "login" ? "signup" : "login");
    });
  }

  renderUserControls() {
    const loginButton = this.getLoginButtons()[0];

    if (!loginButton || this.userControls) {
      this.updateNavbar();
      return;
    }

    this.userControls = document.createElement("div");
    this.userControls.className = "auth-user-nav d-none ms-lg-3 mt-3 mt-lg-0";
    this.userControls.innerHTML = `
      <span class="auth-user-name" data-auth-user-name></span>
      <button class="btn btn-light btn-sm" type="button" data-auth-logout>Logout</button>
    `;
    loginButton.after(this.userControls);
    this.userControls.querySelector("[data-auth-logout]").addEventListener("click", () => this.logout());
    this.updateNavbar();
  }

  getLoginButtons() {
    return Array.from(document.querySelectorAll(this.loginButtonSelector));
  }

  handleDocumentClick(event) {
    const loginButton = event.target.closest(this.loginButtonSelector);

    if (!loginButton) {
      return;
    }

    event.preventDefault();
    this.showLoginModal();
  }

  showLoginModal(mode = "login") {
    this.setAuthMode(mode);
    this.modal?.show();
  }

  setAuthMode(mode) {
    this.authMode = mode;
    const isSignup = mode === "signup";
    const title = this.modalElement.querySelector(".modal-title");
    const nameField = this.modalElement.querySelector("[data-auth-name-field]");
    const nameInput = this.modalElement.querySelector("#authDisplayName");
    const submitButton = this.modalElement.querySelector("[data-auth-submit]");
    const toggleButton = this.modalElement.querySelector("[data-auth-mode-toggle]");
    const passwordInput = this.modalElement.querySelector("#authPassword");

    title.textContent = isSignup ? "Create account" : "Log in";
    nameField.classList.toggle("d-none", !isSignup);
    nameInput.required = isSignup;
    submitButton.textContent = isSignup ? "Sign up" : "Log in";
    toggleButton.textContent = isSignup ? "Use existing account" : "Create account";
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    this.clearError();
  }

  async handleAuthSubmit(event) {
    event.preventDefault();
    this.clearError();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));
    const displayName = String(formData.get("displayName") || "").trim();
    const submitButton = form.querySelector("[data-auth-submit]");

    submitButton.disabled = true;
    submitButton.textContent = this.authMode === "signup" ? "Signing up..." : "Logging in...";

    try {
      if (this.authMode === "signup") {
        const credential = await createUserWithEmailAndPassword(this.auth, email, password);
        await updateProfile(credential.user, { displayName });
        this.currentUser = credential.user;
        this.updateNavbar();
        this.notifySubscribers();
      } else {
        await signInWithEmailAndPassword(this.auth, email, password);
      }

      form.reset();
      this.modal?.hide();
    } catch (error) {
      this.showError(this.getReadableError(error));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = this.authMode === "signup" ? "Sign up" : "Log in";
    }
  }

  async logout() {
    await signOut(this.auth);
  }

  updateNavbar() {
    const loginButtons = this.getLoginButtons();
    const isLoggedIn = Boolean(this.currentUser);

    loginButtons.forEach((button) => button.classList.toggle("d-none", isLoggedIn));

    if (!this.userControls) {
      return;
    }

    this.userControls.classList.toggle("d-none", !isLoggedIn);
    const nameTarget = this.userControls.querySelector("[data-auth-user-name]");
    nameTarget.textContent = this.getUserName(this.currentUser);
  }

  getUserName(user) {
    if (!user) {
      return "";
    }

    return user.displayName || user.email || "Trail member";
  }

  showError(message) {
    const errorTarget = this.modalElement.querySelector("[data-auth-error]");
    errorTarget.textContent = message;
    errorTarget.classList.remove("d-none");
  }

  clearError() {
    const errorTarget = this.modalElement.querySelector("[data-auth-error]");
    errorTarget.textContent = "";
    errorTarget.classList.add("d-none");
  }

  getReadableError(error) {
    const messages = {
      "auth/email-already-in-use": "That email is already registered.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/weak-password": "Use at least 6 characters for the password."
    };

    return messages[error.code] || "Firebase could not complete the request. Check your config and try again.";
  }
}
