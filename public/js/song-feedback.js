/**
 * Song page feedback modal
 * Reporting an issue always requires the live backend (auth + write), so it is kept
 * fully separate from the offline-cached hymnal reading path: nothing here runs
 * until the user explicitly opens the modal, and it never touches the song cache.
 */
(function () {
    function getSongNumber() {
        return new URLSearchParams(window.location.search).get('song');
    }

    function setStatus(el, message, type) {
        el.textContent = message;
        el.className = 'feedback-status show' + (type ? ' ' + type : '');
    }

    function clearStatus(el) {
        el.textContent = '';
        el.className = 'feedback-status';
    }

    document.addEventListener('DOMContentLoaded', function () {
        var openBtn = document.getElementById('reportIssueBtn');
        var overlay = document.getElementById('feedbackOverlay');
        var cancelBtn = document.getElementById('feedbackCancelBtn');
        var submitBtn = document.getElementById('feedbackSubmitBtn');
        var statusEl = document.getElementById('feedbackStatus');
        var titleInput = document.getElementById('feedbackTitle');
        var descInput = document.getElementById('feedbackDescription');
        var categoryInput = document.getElementById('feedbackCategory');
        var myFeedbackLink = document.getElementById('myFeedbackLink');
        var toastEl = document.getElementById('feedbackToast');
        var toastTimer = null;

        if (!openBtn || !overlay) return;

        function showToast(message) {
            toastEl.textContent = message;
            toastEl.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function () {
                toastEl.classList.remove('show');
            }, 3500);
        }

        function refreshBlockerMessage() {
            // Re-evaluated live so a stale "offline" or "sign in" notice never
            // outlives the condition that produced it while the modal is open.
            if (!navigator.onLine) {
                setStatus(statusEl, "You're offline. Reading hymns still works, but sending feedback needs an internet connection — try again once you're back online.", 'offline');
            } else if (!window.auth || !window.auth.isLoggedIn()) {
                setStatus(statusEl, 'Sign in to submit feedback. Tap Submit to go to the login page.', 'error');
            } else {
                clearStatus(statusEl);
            }
        }

        function closeModal() {
            overlay.classList.remove('open');
            clearStatus(statusEl);
        }

        function openModal() {
            var songNumber = getSongNumber();
            if (!songNumber) return;

            titleInput.value = '';
            descInput.value = '';
            categoryInput.value = 'error';

            var loggedIn = !!(window.auth && window.auth.isLoggedIn());
            myFeedbackLink.style.display = loggedIn ? '' : 'none';

            refreshBlockerMessage();
            overlay.classList.add('open');
        }

        window.addEventListener('online', function () {
            if (overlay.classList.contains('open')) refreshBlockerMessage();
        });
        window.addEventListener('offline', function () {
            if (overlay.classList.contains('open')) refreshBlockerMessage();
        });

        openBtn.addEventListener('click', openModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        submitBtn.addEventListener('click', async function () {
            var songNumber = getSongNumber();
            if (!songNumber) return;

            if (!navigator.onLine) {
                refreshBlockerMessage();
                return;
            }

            if (!window.auth || !window.auth.isLoggedIn()) {
                var returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = '/login?returnTo=' + returnTo;
                return;
            }

            var title = titleInput.value.trim();
            var description = descInput.value.trim();

            if (!title || !description) {
                setStatus(statusEl, 'Please fill in both a summary and details.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                var result = await window.feedback.addHymnIssue(songNumber, {
                    title: title,
                    description: description,
                    category: categoryInput.value
                });

                if (result.success) {
                    titleInput.value = '';
                    descInput.value = '';
                    closeModal();
                    showToast('Thanks! Your feedback was submitted.');
                } else {
                    setStatus(statusEl, result.error || 'Failed to submit feedback.', 'error');
                }
            } catch (error) {
                setStatus(statusEl, 'Could not reach the server. Please try again later.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });
    });
})();
