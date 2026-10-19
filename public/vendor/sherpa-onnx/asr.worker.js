/* global importScripts, createOnlineRecognizer */
/**
 * sherpa-onnx WebAssembly speech-recognition worker.
 *
 * Hosts the Emscripten runtime (sherpa-onnx-wasm-main-asr.js/.wasm/.data) off
 * the main thread. The page streams 16 kHz mono PCM into this worker; the
 * worker streams partial and final transcripts back. Everything happens
 * inside the browser: no audio, text or model request leaves the origin.
 *
 * Messages in:  { type: "prepare", base }            load runtime + model
 *               { type: "start" }                    begin a fresh utterance
 *               { type: "audio", samples }           Float32Array @ 16 kHz
 *               { type: "finish" }                   flush and finalise
 *               { type: "reset" }                    discard current stream
 * Messages out: { type: "progress", loaded, total, status }
 *               { type: "ready" } | { type: "error", message }
 *               { type: "partial", text } | { type: "final", text, endpoint }
 */
var base = "";
var recognizer = null;
var stream = null;
var preparing = false;
var ready = false;
var lastPartial = "";
var SAMPLE_RATE = 16000;

/* Emscripten reads this global before the glue script runs. */
var Module = {
  locateFile: function (path) { return base + path; },
  print: function () {},
  printErr: function () {},
  setStatus: function (status) {
    var match = /\((\d+)\/(\d+)\)/.exec(status || "");
    if (match) {
      self.postMessage({ type: "progress", loaded: Number(match[1]), total: Number(match[2]), status: "download" });
    } else if (status) {
      self.postMessage({ type: "progress", loaded: 0, total: 0, status: status });
    }
  },
  onRuntimeInitialized: function () {
    try {
      recognizer = createOnlineRecognizer(Module, recognizerConfig());
      ready = true;
      preparing = false;
      self.postMessage({ type: "ready" });
    } catch (error) {
      preparing = false;
      self.postMessage({ type: "error", message: "sherpa-init: " + String(error && error.message || error) });
    }
  },
  onAbort: function (reason) {
    preparing = false;
    self.postMessage({ type: "error", message: "sherpa-abort: " + String(reason) });
  },
};

function recognizerConfig() {
  return {
    featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: "./encoder.onnx", decoder: "./decoder.onnx", joiner: "./joiner.onnx" },
      paraformer: { encoder: "", decoder: "" },
      zipformer2Ctc: { model: "" },
      nemoCtc: { model: "" },
      toneCtc: { model: "" },
      tokens: "./tokens.txt",
      numThreads: 1,
      provider: "cpu",
      debug: 0,
      modelType: "",
      modelingUnit: "cjkchar",
      bpeVocab: "",
    },
    decodingMethod: "greedy_search",
    maxActivePaths: 4,
    enableEndpoint: 1,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20,
    hotwordsFile: "",
    hotwordsScore: 1.5,
    ctcFstDecoderConfig: { graph: "", maxActive: 3000 },
    ruleFsts: "",
    ruleFars: "",
  };
}

function ensureStream() {
  if (!stream) stream = recognizer.createStream();
  return stream;
}

function drain() {
  while (recognizer.isReady(stream)) recognizer.decode(stream);
}

function currentText() {
  var result = recognizer.getResult(stream);
  return (result && result.text ? String(result.text) : "").trim();
}

function discardStream() {
  if (stream) {
    try { stream.free(); } catch (e) { /* already freed */ }
    stream = null;
  }
  lastPartial = "";
}

self.onmessage = function (event) {
  var data = event.data || {};
  try {
    switch (data.type) {
      case "prepare": {
        if (ready) { self.postMessage({ type: "ready" }); return; }
        if (preparing) return;
        preparing = true;
        base = String(data.base || "/vendor/sherpa-onnx/");
        if (base.charAt(base.length - 1) !== "/") base += "/";
        self.postMessage({ type: "progress", loaded: 0, total: 0, status: "runtime" });
        importScripts(base + "sherpa-onnx-asr.js", base + "sherpa-onnx-wasm-main-asr.js");
        return;
      }
      case "start": {
        if (!ready) { self.postMessage({ type: "error", message: "not-ready" }); return; }
        discardStream();
        ensureStream();
        return;
      }
      case "audio": {
        if (!ready || !data.samples) return;
        ensureStream();
        stream.acceptWaveform(SAMPLE_RATE, data.samples);
        drain();
        var endpoint = recognizer.isEndpoint(stream);
        var text = currentText();
        if (text && text !== lastPartial) {
          lastPartial = text;
          self.postMessage({ type: "partial", text: text });
        }
        if (endpoint && text) {
          self.postMessage({ type: "final", text: text, endpoint: true });
          recognizer.reset(stream);
          lastPartial = "";
        }
        return;
      }
      case "finish": {
        if (!ready || !stream) { self.postMessage({ type: "final", text: lastPartial, endpoint: false }); return; }
        // Pad with silence so the encoder flushes its right context.
        stream.acceptWaveform(SAMPLE_RATE, new Float32Array(Math.round(SAMPLE_RATE * 0.8)));
        stream.inputFinished();
        drain();
        var finalText = currentText() || lastPartial;
        self.postMessage({ type: "final", text: finalText, endpoint: false });
        discardStream();
        return;
      }
      case "reset": {
        discardStream();
        return;
      }
      default:
        return;
    }
  } catch (error) {
    self.postMessage({ type: "error", message: "sherpa-worker: " + String(error && error.message || error) });
  }
};
