// alerts.js
// Professional iOS-style Alert System
class AlertManager {
    constructor() {
        this.toastContainer = this.createToastContainer();
        this.currentLoadingAlert = null;
    }

    createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Main alert function
    showAlert(options) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'alert-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            const alertBox = document.createElement('div');
            alertBox.className = `alert-box alert-${options.type || 'info'}`;

            const icon = this.getIcon(options.type);
            const title = options.title || this.getDefaultTitle(options.type);

            // Create close function
            const closeAlert = (result = true) => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
                resolve(result);
            };

            alertBox.innerHTML = `
                <div class="alert-icon">${icon}</div>
                <div class="alert-title">${title}</div>
                <div class="alert-message">${options.message || ''}</div>
                <div class="alert-buttons">
                    <button class="alert-button primary" id="alert-close-btn" aria-label="Close alert">
                        ${options.buttonText || 'OK'}
                    </button>
                </div>
            `;

            overlay.appendChild(alertBox);
            document.body.appendChild(overlay);

            // Add event listener to button
            const closeBtn = document.getElementById('alert-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeAlert(true));
            }

            // Auto-close if specified
            if (options.autoClose) {
                setTimeout(() => {
                    closeAlert(true);
                }, options.autoClose);
            }

            // Close on backdrop click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeAlert(false);
                }
            });
        });
    }

    // Toast notification
    showToast(options) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${options.type || 'info'}`;

        const icon = this.getIcon(options.type);

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${options.title || this.getDefaultTitle(options.type)}</div>
                <div class="toast-message">${options.message || ''}</div>
            </div>
            <button class="toast-close" aria-label="Close toast">×</button>
        `;

        // close handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) toast.remove();
        });

        this.toastContainer.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, options.duration || 5000);
    }

    // Success alerts
    success(message, title = 'Success!') {
        return this.showAlert({ type: 'success', title, message, autoClose: 3000 });
    }

    // Error alerts
    error(message, title = 'Error!') {
        return this.showAlert({ type: 'error', title, message });
    }

    // Warning alerts
    warning(message, title = 'Warning!') {
        return this.showAlert({ type: 'warning', title, message });
    }

    // Info alerts
    info(message, title = 'Information') {
        return this.showAlert({ type: 'info', title, message, autoClose: 3000 });
    }

    // Loading alert - returns a controller object to close it
    loading(message = 'Processing...', title = 'Please wait') {
        // Close any existing loading alert
        if (this.currentLoadingAlert) {
            this.closeLoading();
        }

        const loadingController = {
            close: () => this.closeLoading()
        };

        // show a cancellable loading alert (button labeled Cancel)
        this.currentLoadingAlert = this.showAlert({
            type: 'loading',
            title,
            message,
            buttonText: 'Cancel',
            autoClose: false
        }).then(() => {
            this.currentLoadingAlert = null;
        });

        return loadingController;
    }

    // Close the current loading alert
    closeLoading() {
        // remove any overlay with .alert-loading class or generic overlay
        const overlays = document.querySelectorAll('.alert-overlay');
        overlays.forEach(ov => ov.remove());
        this.currentLoadingAlert = null;
    }

    // Success toast
    toastSuccess(message, title = 'Success') {
        this.showToast({ type: 'success', title, message });
    }

    // Error toast
    toastError(message, title = 'Error') {
        this.showToast({ type: 'error', title, message });
    }

    // Warning toast
    toastWarning(message, title = 'Warning') {
        this.showToast({ type: 'warning', title, message });
    }

    // Info toast
    toastInfo(message, title = 'Information') {
        this.showToast({ type: 'info', title, message });
    }

    // Get icon based on type
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '⏳'
        };
        return icons[type] || icons.info;
    }

    // Get default title based on type
    getDefaultTitle(type) {
        const titles = {
            success: 'Success!',
            error: 'Error!',
            warning: 'Warning!',
            info: 'Information',
            loading: 'Please wait'
        };
        return titles[type] || titles.info;
    }
}

// Create global instance
const alertManager = new AlertManager();
