/**
 * Toast Notification System per FantaOliva
 */

class NotificationManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message, type = 'info', duration = 3500) {
    const container = this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;

    const icons = {
      success: 'fa-solid fa-circle-check',
      warning: 'fa-solid fa-triangle-exclamation',
      error: 'fa-solid fa-circle-xmark',
      info: 'fa-solid fa-circle-info'
    };

    const iconClass = icons[type] || icons.info;

    toast.innerHTML = `
      <i class="${iconClass} toast-icon"></i>
      <span class="toast-text">${message}</span>
      <button class="toast-close" aria-label="Chiudi">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    closeBtn.addEventListener('click', removeToast);

    container.appendChild(toast);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  success(msg, duration) {
    this.show(msg, 'success', duration);
  }

  warning(msg, duration) {
    this.show(msg, 'warning', duration);
  }

  error(msg, duration) {
    this.show(msg, 'error', duration);
  }

  info(msg, duration) {
    this.show(msg, 'info', duration);
  }
}

export const notify = new NotificationManager();
