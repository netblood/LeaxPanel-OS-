/**
 * ui-shim.js
 *
 * Minimal vanilla-JS replacement for the small subset of Bootstrap 5's JS
 * API this panel actually calls (bootstrap.Modal, bootstrap.Toast, and
 * data-bs-toggle="dropdown"/"modal" wiring). Added when Bootstrap's CSS/JS
 * CDN bundle was removed in favor of the panel's own design system, so the
 * handful of pages written against `bootstrap.Modal(...)` etc. keep working
 * unchanged. Not a full Bootstrap re-implementation — only what's used.
 */
(function () {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  // ---------------------------------------------------------------- Modal
  var modalInstances = new WeakMap();

  function Modal(el) {
    this.el = typeof el === 'string' ? qs(el) : el;
    modalInstances.set(this.el, this);
  }
  Modal.prototype.show = function () {
    if (!this.el) return;
    this.el.classList.add('show');
    this.el.style.display = 'block';
    this.el.removeAttribute('aria-hidden');
    this.el.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop show';
    backdrop.setAttribute('data-ui-shim-backdrop', this.el.id || '');
    document.body.appendChild(backdrop);
    this._backdrop = backdrop;
    this.el.dispatchEvent(new CustomEvent('shown.bs.modal'));
  };
  Modal.prototype.hide = function () {
    if (!this.el) return;
    this.el.classList.remove('show');
    this.el.style.display = 'none';
    this.el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (this._backdrop && this._backdrop.parentNode) this._backdrop.parentNode.removeChild(this._backdrop);
    this.el.dispatchEvent(new CustomEvent('hidden.bs.modal'));
  };
  Modal.getInstance = function (el) {
    el = typeof el === 'string' ? qs(el) : el;
    return el ? modalInstances.get(el) || null : null;
  };
  Modal.getOrCreateInstance = function (el) {
    el = typeof el === 'string' ? qs(el) : el;
    return Modal.getInstance(el) || new Modal(el);
  };

  // ---------------------------------------------------------------- Toast
  function Toast(el) { this.el = typeof el === 'string' ? qs(el) : el; }
  Toast.prototype.show = function () {
    if (!this.el) return;
    this.el.classList.add('show');
    this.el.style.display = 'block';
    var self = this;
    var delay = parseInt(this.el.getAttribute('data-bs-delay'), 10) || 4000;
    setTimeout(function () { self.hide(); }, delay);
  };
  Toast.prototype.hide = function () {
    if (!this.el) return;
    this.el.classList.remove('show');
    this.el.style.display = 'none';
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  };

  // ---------------------------------------------------- data-bs-* wiring
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-bs-toggle="modal"]');
    if (toggle) {
      var target = toggle.getAttribute('data-bs-target');
      if (target) Modal.getOrCreateInstance(target).show();
      return;
    }
    var dismiss = e.target.closest('[data-bs-dismiss="modal"]');
    if (dismiss) {
      var modalEl = dismiss.closest('.modal');
      if (modalEl) { var inst = Modal.getInstance(modalEl); if (inst) inst.hide(); }
      return;
    }
    var dismissToast = e.target.closest('[data-bs-dismiss="toast"]');
    if (dismissToast) {
      var toastEl = dismissToast.closest('.toast');
      if (toastEl) new Toast(toastEl).hide();
      return;
    }
    var backdrop = e.target.closest('[data-ui-shim-backdrop]');
    if (backdrop) {
      var id = backdrop.getAttribute('data-ui-shim-backdrop');
      var owning = id ? document.getElementById(id) : null;
      if (owning) { var ownInst = Modal.getInstance(owning); if (ownInst) ownInst.hide(); }
      return;
    }
    var dropdownToggle = e.target.closest('[data-bs-toggle="dropdown"]');
    if (dropdownToggle) {
      var menu = dropdownToggle.nextElementSibling;
      if (menu) {
        var open = menu.classList.contains('show');
        document.querySelectorAll('.dropdown-menu.show').forEach(function (m) { m.classList.remove('show'); });
        if (!open) menu.classList.add('show');
      }
      return;
    }
    if (!e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(function (m) { m.classList.remove('show'); });
    }
  });

  window.bootstrap = { Modal: Modal, Toast: Toast };
})();
