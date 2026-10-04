/**
 * KRONOS — ExtendScript Host Script for Adobe After Effects
 * Bridge between CEP panel and After Effects DOM
 */

(function () {
  $.global.kronos = {
    version: "1.0.0",

    ping: function () {
      return "pong";
    },

    /**
     * Retrieves the name of the currently active composition in AE, if any.
     * Used by Kronos to auto-tag Pomodoro sessions with the active project comp!
     */
    getActiveCompName: function () {
      try {
        if (app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
          return app.project.activeItem.name;
        }
      } catch (e) {
        // Fallback
      }
      return "";
    },

    /**
     * Safe undo wrapper helper
     */
    runWithUndo: function (actionName, fn) {
      if (!app.project) return false;
      app.beginUndoGroup(actionName || "Kronos Action");
      try {
        var res = fn();
        return res;
      } catch (err) {
        return "ERROR: " + err.toString();
      } finally {
        app.endUndoGroup();
      }
    }
  };
})();
