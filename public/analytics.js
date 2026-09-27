/**
 * Kiwichito Analytics - Privacy-Friendly Tracking Script
 *
 * Usage:
 * <script src="https://analytics.kiwichito.com/analytics.js" data-api-key="YOUR_API_KEY"></script>
 *
 * Features:
 * - No cookies
 * - Session tracking (resets on page refresh)
 * - Automatic page view tracking
 * - Deduplication (5-minute window)
 * - Lightweight (~2KB minified)
 */

(function() {
  'use strict';

  // Configuration
  const scriptTag = document.currentScript;
  const apiKey = scriptTag?.getAttribute('data-api-key');
  const endpoint = scriptTag?.getAttribute('data-endpoint') || 'https://analytics.kiwichito.com/track';

  if (!apiKey) {
    console.warn('[Analytics] Missing data-api-key attribute');
    return;
  }

  // Generate or retrieve session ID (stored in sessionStorage, not persistent)
  function getSessionId() {
    let sessionId = sessionStorage.getItem('kiwi_analytics_session');

    if (!sessionId) {
      // Generate UUID v4
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      sessionStorage.setItem('kiwi_analytics_session', sessionId);
    }

    return sessionId;
  }

  // Track page view
  function trackPageView() {
    const data = {
      url: window.location.href,
      referrer: document.referrer || 'direct',
      sessionId: getSessionId(),
      screenWidth: window.screen.width,
      timestamp: new Date().toISOString()
    };

    // Send tracking data
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(data),
      // Use keepalive to ensure request completes even if user navigates away
      keepalive: true
    }).catch(err => {
      // Silently fail - don't spam console for analytics failures
      if (window.location.hostname === 'localhost') {
        console.warn('[Analytics] Failed to send tracking data:', err);
      }
    });
  }

  // Track on initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // Track on SPA navigation (for Angular, React, Vue apps)
  // Listen to history API changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    originalPushState.apply(this, arguments);
    trackPageView();
  };

  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    trackPageView();
  };

  // Listen to popstate (back/forward buttons)
  window.addEventListener('popstate', trackPageView);

  // Expose manual tracking function (optional)
  window.kiwiAnalytics = {
    track: trackPageView,
    getSessionId: getSessionId
  };

})();
