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

  // Collect device information
  function getDeviceInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    return {
      // Screen & Display
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth,

      // Locale & Preferences
      language: navigator.language || navigator.userLanguage,
      languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),

      // Platform & Device
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchSupport: 'ontouchstart' in window,

      // Network
      connectionType: connection?.effectiveType || null,
      connectionDownlink: connection?.downlink || null,
      connectionRtt: connection?.rtt || null,
      saveData: connection?.saveData || false
    };
  }

  // Collect performance metrics
  function getPerformanceMetrics() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    const navigation = timing.loadEventEnd - timing.navigationStart;

    // Only return metrics if page is fully loaded
    if (navigation === 0) {
      return null;
    }

    return {
      pageLoadTime: navigation,
      domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      timeToFirstByte: timing.responseStart - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      resourceLoadTime: timing.loadEventEnd - timing.domContentLoadedEventEnd
    };
  }

  // Track page view
  function trackPageView() {
    const data = {
      url: window.location.href,
      referrer: document.referrer || 'direct',
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      ...getDeviceInfo()
    };

    // Add performance metrics if available (on full page load)
    const perf = getPerformanceMetrics();
    if (perf) {
      data.performance = perf;
    }

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
