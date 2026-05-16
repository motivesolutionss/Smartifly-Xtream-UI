import Foundation
import UIKit
import MobileVLCKit
import React

@objc(IOSVLCPlayerView)
class IOSVLCPlayerView: UIView, VLCMediaPlayerDelegate {
  private let mediaPlayer = VLCMediaPlayer()
  private let drawableView = UIView()
  private var hasSentLoad = false
  private var lastSeekTrigger: NSNumber?
  private var startupWatchdog: DispatchWorkItem?
  private var startupWatchdogMs: Int = 32000
  private var hasStartedPlayback = false
  private var startupRecoveryAttempts = 0
  private let maxStartupRecoveryAttempts = 2
  private var currentSourceURL: URL?
  private var hasSentOpen = false
  private var lastDebugEmitAtMs: Int64 = 0
  private var pendingRestartWork: DispatchWorkItem?

  @objc var src: NSString = "" {
    didSet {
      guard let url = URL(string: src as String), !src.isEqual(to: oldValue as String) else { return }
      hasSentLoad = false
      hasSentOpen = false
      hasStartedPlayback = false
      startupRecoveryAttempts = 0
      startupWatchdog?.cancel()
      currentSourceURL = url
      performHardRestart(url: url, reason: "src_changed")
    }
  }

  @objc var paused: Bool = false {
    didSet { paused ? mediaPlayer.pause() : mediaPlayer.play() }
  }

  @objc var muted: Bool = false {
    didSet { mediaPlayer.audio?.isMuted = muted }
  }

  @objc var rate: NSNumber = 1.0 {
    didSet { mediaPlayer.rate = rate.floatValue }
  }

  @objc var subtitleFontSize: NSNumber = 10
  @objc var subtitleColor: NSString = "#FFFFFF"
  @objc var subtitleOutlineColor: NSString = "#000000"
  @objc var subtitleOutlineWidth: NSNumber = 2
  @objc var subtitleBackgroundColor: NSString = ""
  @objc var subtitleBottomMargin: NSNumber = 20
  @objc var subtitleTrackId: NSNumber = -2 {
    didSet {
      applySubtitleTrackSelection()
    }
  }

  @objc var seekTime: NSNumber = -1 {
    didSet {
      guard seekTime.doubleValue >= 0 else { return }
      seek(seconds: seekTime.doubleValue)
    }
  }

  @objc var seekTrigger: NSNumber = 0 {
    didSet {
      guard lastSeekTrigger == nil || lastSeekTrigger != seekTrigger else { return }
      lastSeekTrigger = seekTrigger
      if seekTime.doubleValue >= 0 {
        seek(seconds: seekTime.doubleValue)
      }
    }
  }

  @objc var startupTimeoutMs: NSNumber = 32000 {
    didSet {
      let v = startupTimeoutMs.intValue
      if v >= 5000 {
        startupWatchdogMs = v
      }
    }
  }

  @objc var onVLCLoad: RCTBubblingEventBlock?
  @objc var onVLCOpen: RCTBubblingEventBlock?
  @objc var onVLCDebug: RCTBubblingEventBlock?
  @objc var onVLCProgress: RCTBubblingEventBlock?
  @objc var onVLCError: RCTBubblingEventBlock?
  @objc var onVLCEnd: RCTBubblingEventBlock?
  @objc var onVLCBuffer: RCTBubblingEventBlock?
  @objc var onVLCSubtitleTracks: RCTBubblingEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    drawableView.frame = bounds
    drawableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(drawableView)

    mediaPlayer.drawable = drawableView
    mediaPlayer.delegate = self
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  deinit {
    startupWatchdog?.cancel()
    pendingRestartWork?.cancel()
    mediaPlayer.stop()
    mediaPlayer.delegate = nil
  }

  private func seek(seconds: Double) {
    let ms = Int32(max(0, seconds) * 1000.0)
    mediaPlayer.time = VLCTime(int: ms)
  }

  private func startPlayback(url: URL) {
    let media = VLCMedia(url: url)
    emitDebug("start_playback_prepare", reason: url.absoluteString, force: true)
    // Improve startup resiliency for redirect-heavy/tokenized HTTP streams.
    media.addOption(":http-reconnect=true")
    media.addOption(":network-caching=1800")
    media.addOption(":file-caching=1800")
    media.addOption(":live-caching=1800")
    media.addOption(":avcodec-fast")
    media.addOption(":clock-jitter=0")
    media.addOption(":clock-synchro=0")
    // Keep subtitle sizing controllable from JS.
    let relSubtitleSize = max(8, min(30, subtitleFontSize.intValue))
    media.addOption(":freetype-rel-fontsize=\(relSubtitleSize)")
    if let colorHex = vlcHexColor(from: subtitleColor as String) {
      media.addOption(":freetype-color=\(colorHex)")
    }
    if let outlineHex = vlcHexColor(from: subtitleOutlineColor as String) {
      media.addOption(":freetype-outline-color=\(outlineHex)")
    }
    let outlineThickness = max(0, min(8, subtitleOutlineWidth.intValue))
    media.addOption(":freetype-outline-thickness=\(outlineThickness)")
    if let bgHex = vlcHexColor(from: subtitleBackgroundColor as String) {
      media.addOption(":freetype-background-color=\(bgHex)")
    }
    let margin = max(0, min(120, subtitleBottomMargin.intValue))
    media.addOption(":freetype-margin=\(margin)")
    media.addOption(":http-user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) MobileVLCKit/3")
    mediaPlayer.media = media
    mediaPlayer.play()
    applySubtitleTrackSelection()
    emitDebug("start_playback_called", reason: "play_invoked", force: true)
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(500)) { [weak self] in
      guard let self = self, self.currentSourceURL == url, !self.hasStartedPlayback else { return }
      self.emitDebug("startup_heartbeat", reason: "500ms_after_play", force: true)
    }
    scheduleStartupWatchdog()
  }

  private func resetPlayerForFreshStart() {
    startupWatchdog?.cancel()
    pendingRestartWork?.cancel()
    mediaPlayer.stop()
    mediaPlayer.media = nil
    mediaPlayer.drawable = nil
    mediaPlayer.drawable = drawableView
    hasSentLoad = false
    hasSentOpen = false
    hasStartedPlayback = false
    lastDebugEmitAtMs = 0
  }

  private func performHardRestart(url: URL, reason: String) {
    resetPlayerForFreshStart()
    emitDebug("hard_restart", reason: reason, force: true)
    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      self.currentSourceURL = url
      self.startPlayback(url: url)
    }
    pendingRestartWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(250), execute: work)
  }

  private func cacheBusted(_ url: URL) -> URL {
    var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
    var items = comps?.queryItems ?? []
    items.append(URLQueryItem(name: "sf_native_retry", value: "\(Int(Date().timeIntervalSince1970 * 1000))"))
    comps?.queryItems = items
    return comps?.url ?? url
  }

  private func scheduleStartupWatchdog() {
    startupWatchdog?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      if self.hasStartedPlayback { return }
      if self.startupRecoveryAttempts < self.maxStartupRecoveryAttempts, let srcURL = self.currentSourceURL {
        self.startupRecoveryAttempts += 1
        let retryURL = self.cacheBusted(srcURL)
        self.performHardRestart(url: retryURL, reason: "startup_watchdog_retry")
        return
      }
      self.emitDebug("startup_timeout", reason: "startup_watchdog_exhausted", force: true)
      self.onVLCBuffer?(["isBuffering": false])
      self.onVLCError?([
        "error": [
          "errorString": "VLC startup timeout",
          "domain": "MobileVLCKit",
          "errorCode": "startup-timeout"
        ]
      ])
      self.mediaPlayer.stop()
    }
    startupWatchdog = work
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(startupWatchdogMs), execute: work)
  }

  private func emitDebug(_ stateName: String, reason: String? = nil, force: Bool = false) {
    let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
    if !force && nowMs - lastDebugEmitAtMs < 400 { return }
    lastDebugEmitAtMs = nowMs
    let stats = mediaPlayer.media?.statistics
    onVLCDebug?([
      "playerState": stateName,
      "debugReason": reason ?? "",
      "stateRaw": mediaPlayer.state.rawValue,
      "isPlaying": mediaPlayer.isPlaying,
      "timeMs": mediaPlayer.time.intValue,
      "position": mediaPlayer.position,
      "rate": mediaPlayer.rate,
      "lengthMs": mediaPlayer.media?.length.intValue ?? 0,
      "bitrate": stats?.inputBitrate ?? 0,
      "demuxReadBytes": stats?.demuxReadBytes ?? 0,
      "startupRecoveryAttempts": startupRecoveryAttempts
    ])
  }

  private func vlcHexColor(from raw: String) -> String? {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return nil }
    var hex = trimmed.uppercased()
    if hex.hasPrefix("#") {
      hex.removeFirst()
    } else if hex.hasPrefix("0X") {
      hex = String(hex.dropFirst(2))
    }
    guard hex.count == 6 else { return nil }
    let valid = CharacterSet(charactersIn: "0123456789ABCDEF")
    guard hex.rangeOfCharacter(from: valid.inverted) == nil else { return nil }
    return "0x\(hex)"
  }

  private func applySubtitleTrackSelection() {
    let desired = subtitleTrackId.intValue
    // -2 means "no explicit change from JS".
    if desired == -2 { return }
    mediaPlayer.setValue(NSNumber(value: desired), forKey: "currentVideoSubTitleIndex")
    emitSubtitleTracks(reason: "apply_subtitle_track_selection")
  }

  private func emitSubtitleTracks(reason: String) {
    guard let cb = onVLCSubtitleTracks else { return }
    let namesAny = mediaPlayer.value(forKey: "videoSubTitlesNames")
    let indexesAny = mediaPlayer.value(forKey: "videoSubTitlesIndexes")
    let currentAny = mediaPlayer.value(forKey: "currentVideoSubTitleIndex")

    let names = namesAny as? [Any] ?? []
    let indexes = indexesAny as? [Any] ?? []
    let count = max(names.count, indexes.count)
    var tracks: [[String: Any]] = []
    tracks.reserveCapacity(count)
    for i in 0..<count {
      let idValue: Int = {
        guard i < indexes.count else { return i }
        if let n = indexes[i] as? NSNumber { return n.intValue }
        if let s = indexes[i] as? String, let v = Int(s) { return v }
        return i
      }()
      let nameValue: String = {
        guard i < names.count else { return "Track \(idValue)" }
        return String(describing: names[i])
      }()
      tracks.append(["id": idValue, "name": nameValue])
    }

    let selectedId: Int = {
      if let n = currentAny as? NSNumber { return n.intValue }
      if let s = currentAny as? String, let v = Int(s) { return v }
      return -2
    }()

    cb([
      "reason": reason,
      "selectedTrackId": selectedId,
      "tracks": tracks
    ])
  }

  func mediaPlayerStateChanged(_ aNotification: Notification) {
    switch mediaPlayer.state {
    case .opening, .buffering:
      emitDebug("opening_or_buffering")
      emitSubtitleTracks(reason: "opening_or_buffering")
      if !hasSentOpen {
        hasSentOpen = true
        onVLCOpen?(["state": "opening"])
      }
      onVLCBuffer?(["isBuffering": true])
    case .playing:
      emitDebug("playing")
      emitSubtitleTracks(reason: "playing")
      startupWatchdog?.cancel()
      hasStartedPlayback = true
      if !hasSentLoad {
        hasSentLoad = true
        let durationSec = Double(mediaPlayer.media?.length.intValue ?? 0) / 1000.0
        onVLCLoad?(["duration": durationSec])
      }
      onVLCBuffer?(["isBuffering": false])
    case .error:
      emitDebug("error")
      emitSubtitleTracks(reason: "error")
      startupWatchdog?.cancel()
      onVLCBuffer?(["isBuffering": false])
      let stateRaw = "\(mediaPlayer.state.rawValue)"
      onVLCError?([
        "error": [
          "errorString": "VLC playback error",
          "domain": "MobileVLCKit",
          "errorCode": "vlc-state-\(stateRaw)"
        ]
      ])
    case .ended:
      emitDebug("ended")
      emitSubtitleTracks(reason: "ended")
      startupWatchdog?.cancel()
      onVLCEnd?([:])
    default:
      emitDebug("other")
      emitSubtitleTracks(reason: "other")
      break
    }
  }

  func mediaPlayerTimeChanged(_ aNotification: Notification) {
    emitDebug("time_changed")
    let currentTimeSec = Double(mediaPlayer.time.intValue) / 1000.0
    if currentTimeSec > 0.25 {
      hasStartedPlayback = true
      startupWatchdog?.cancel()
    }
    let lengthSec = Double(mediaPlayer.media?.length.intValue ?? 0) / 1000.0
    onVLCProgress?(["currentTime": currentTimeSec, "playableDuration": max(currentTimeSec, lengthSec)])
  }
}
