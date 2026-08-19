/**
 * Toast Notification System per FantaOliva (Disabilitato)
 */

class NotificationManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    return null;
  }

  show(message, type = 'info', duration = 3500) {
    // Notifiche toast disabilitate completamente
  }

  success(msg, duration) {}

  warning(msg, duration) {}

  error(msg, duration) {}

  info(msg, duration) {}
}

export const notify = new NotificationManager();
