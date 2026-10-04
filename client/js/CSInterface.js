/**
 * CSInterface - v11.0.0
 * Adobe Common Extensibility Platform (CEP) Interface Library
 * Includes browser-mode fallback simulation for testing outside Adobe hosts.
 */

var CSInterface = function () {
    this.hasCEP = typeof window.__adobe_cep__ !== "undefined";
};

/**
 * User Interface Themes Constants
 */
CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

/**
 * System Path Types
 */
SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

/**
 * Color Types
 */
ColorType = {
    RGB: "rgb",
    GRADIENT: "gradient"
};

/**
 * RGBColor constructor
 */
function RGBColor(red, green, blue, alpha) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
}

/**
 * CSEvent constructor for cross-extension event dispatching in Adobe CEP.
 */
function CSEvent(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope || "APPLICATION";
    this.appId = appId || "";
    this.extensionId = extensionId || "";
    this.data = "";
}
window.CSEvent = CSEvent;

/**
 * CSEvent constructor
 * Standard CEP event object used for cross-extension messaging.
 */
function CSEvent(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope || "APPLICATION";
    this.appId = appId || "";
    this.extensionId = extensionId || "";
    this.data = "";
}
if (typeof window !== "undefined") {
    window.CSEvent = CSEvent;
}

/**
 * Evaluates a JavaScript script in the ExtendScript host context.
 *
 * @param script   The JavaScript string to evaluate in the host environment.
 * @param callback Optional. Function called with the result of evaluation.
 */
CSInterface.prototype.evalScript = function (script, callback) {
    if (this.hasCEP && window.__adobe_cep__.evalScript) {
        window.__adobe_cep__.evalScript(script, function (result) {
            if (callback) {
                callback(result);
            }
        });
    } else {
        // Fallback simulation when running outside Adobe Premiere Pro
        console.warn("[CSInterface Fallback] evalScript called in browser mode:", script);
        if (callback) {
            setTimeout(function () {
                // Simulate mock response for known functions
                if (script.indexOf("getProjectCacheDir") !== -1) {
                    callback(JSON.stringify({ status: "success", cacheDir: "/tmp/.splyce_cache" }));
                } else if (script.indexOf("exportCurrentFrame") !== -1) {
                    callback(JSON.stringify({ status: "success", filePath: "/tmp/splyce_frame.png" }));
                } else if (script.indexOf("importAndInsertImage") !== -1) {
                    callback(JSON.stringify({ status: "success", message: "Mock image imported" }));
                } else if (script.indexOf("getSequenceInfoForAdjustmentLayer") !== -1) {
                    callback(JSON.stringify({ status: "success", exists: false, w: 1920, h: 1080, ticks: "10160640000", cacheDir: "/tmp/.splyce_cache" }));
                } else if (script.indexOf("createAdjustmentLayerWithMotionBlur") !== -1) {
                    callback(JSON.stringify({ status: "success", message: "Mock Adjustment Layer created (180° motion blur)" }));
                } else if (script.indexOf("spreadSelectedClips") !== -1) {
                    callback(JSON.stringify({ status: "success", message: "Mock clips spread by +5s" }));
                } else if (script.indexOf("closeGapsBetweenSelected") !== -1) {
                    callback(JSON.stringify({ status: "success", message: "Mock gaps closed & overhangs trimmed" }));
                } else if (script.indexOf("unnestSelectedClip") !== -1) {
                    callback(JSON.stringify({ status: "success", message: "Mock sequence unnested" }));
                } else if (script.indexOf("perfectPitchCorrection") !== -1) {
                    callback(JSON.stringify({ status: "success", semitones: -5.85, cents: 15, message: "Mock pitch corrected" }));
                } else {
                    callback(JSON.stringify({ status: "success", message: "Mock execution successful" }));
                }
            }, 100);
        }
    }
};

/**
 * Retrieves the current host application environment.
 */
CSInterface.prototype.getHostEnvironment = function () {
    if (this.hasCEP && window.__adobe_cep__.getHostEnvironment) {
        var str = window.__adobe_cep__.getHostEnvironment();
        return JSON.parse(str);
    }
    return {
        appName: "PPRO",
        appVersion: "24.0.0",
        appLocale: "en_US",
        appUILocale: "en_US",
        appId: "PPRO",
        isAppOnline: true,
        appSkinInfo: {
            baseFontFamily: "Adobe Clean, sans-serif",
            baseFontSize: 11,
            appBarBackgroundColor: { color: { red: 30, green: 30, blue: 30, alpha: 255 } },
            panelBackgroundColor: { color: { red: 30, green: 30, blue: 30, alpha: 255 } }
        }
    };
};

/**
 * Retrieves a system path for the application or user.
 */
CSInterface.prototype.getSystemPath = function (pathType) {
    if (this.hasCEP && window.__adobe_cep__.getSystemPath) {
        var path = window.__adobe_cep__.getSystemPath(pathType);
        var os = this.getOSInformation();
        if (os.indexOf("Windows") >= 0) {
            path = path.replace("file:///", "");
            path = path.replace(/\//g, "\\\\");
        } else {
            path = path.replace("file://", "");
        }
        return decodeURI(path);
    }
    return "";
};

/**
 * Adds an event listener for CEP events.
 */
CSInterface.prototype.addEventListener = function (type, listener, obj) {
    if (this.hasCEP && window.__adobe_cep__.addEventListener) {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    } else {
        window.addEventListener(type, listener);
    }
};

/**
 * Removes an event listener for CEP events.
 */
CSInterface.prototype.removeEventListener = function (type, listener, obj) {
    if (this.hasCEP && window.__adobe_cep__.removeEventListener) {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    } else {
        window.removeEventListener(type, listener);
    }
};

/**
 * Dispatches a CEP event.
 */
CSInterface.prototype.dispatchEvent = function (event) {
    if (this.hasCEP && window.__adobe_cep__.dispatchEvent) {
        window.__adobe_cep__.dispatchEvent(event);
    } else {
        window.dispatchEvent(new CustomEvent(event.type, { detail: event.data }));
    }
};

/**
 * Requests the host application to open an extension.
 */
CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
    if (this.hasCEP && window.__adobe_cep__.requestOpenExtension) {
        window.__adobe_cep__.requestOpenExtension(extensionId, params);
    }
};

/**
 * Closes this extension.
 */
CSInterface.prototype.closeExtension = function () {
    if (this.hasCEP && window.__adobe_cep__.closeExtension) {
        window.__adobe_cep__.closeExtension();
    } else {
        window.close();
    }
};

/**
 * Retrieves OS Information.
 */
CSInterface.prototype.getOSInformation = function () {
    if (this.hasCEP && window.__adobe_cep__.getOSInformation) {
        return window.__adobe_cep__.getOSInformation();
    }
    var userAgent = navigator.userAgent;
    if (userAgent.indexOf("Win") !== -1) return "Windows";
    if (userAgent.indexOf("Mac") !== -1) return "Mac OS";
    return "Unknown OS";
};

/**
 * Opens a URL in the default system browser.
 */
CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    if (typeof cep !== "undefined" && cep.util && cep.util.openURLInDefaultBrowser) {
        cep.util.openURLInDefaultBrowser(url);
    } else if (typeof require !== "undefined") {
        var exec = require("child_process").exec;
        var os = navigator.platform;
        if (os.indexOf("Win") !== -1) {
            exec('start "" "' + url + '"');
        } else {
            exec('open "' + url + '"');
        }
    } else {
        window.open(url, "_blank");
    }
};

/**
 * Register key events interest to prevent AE / Windows OS from stealing keys (e.g. Alt menu activation).
 */
CSInterface.prototype.registerKeyEventsInterest = function (keyEventsInterest) {
    if (this.hasCEP && window.__adobe_cep__ && window.__adobe_cep__.registerKeyEventsInterest) {
        return window.__adobe_cep__.registerKeyEventsInterest(keyEventsInterest);
    }
    return false;
};

