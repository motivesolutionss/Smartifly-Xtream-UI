import Foundation
import UIKit
import AVFoundation
import React

@objc(IOSAltPlayerView)
class IOSAltPlayerView: UIView {
  private let player = AVPlayer()
  private let playerLayer = AVPlayerLayer()
  private var timeObserver: Any?
  private var itemStatusObservation: NSKeyValueObservation?
  private var itemBufferEmptyObservation: NSKeyValueObservation?
  private var itemLikelyToKeepUpObservation: NSKeyValueObservation?
  private var playerTimeControlObservation: NSKeyValueObservation?
  private var endObserver: NSObjectProtocol?

  private var hasSentLoad = false
  private var hasStartedPlayback = false
  private var lastSeekTrigger: NSNumber?
  private var startupWatchdog: DispatchWorkItem?
  private var startupTimeout: Int = 32000

  @objc var src: NSString = "" {
    didSet {
      guard src != oldValue, let url = URL(string: src as String) else { return }
      startPlayback(url: url)
    }
  }

  @objc var paused: Bool = false {
    didSet {
      paused ? player.pause() : player.play()
    }
  }

  @objc var muted: Bool = false {
    didSet {
      player.isMuted = muted
    }
  }

  @objc var rate: NSNumber = 1.0 {
    didSet {
      guard !paused else { return }
      player.rate = rate.floatValue
    }
  }

  // Accepted for interface parity with the VLC surface.
  @objc var subtitleFontSize: NSNumber = 10
  @objc var subtitleColor: NSString = "#FFFFFF"
  @objc var subtitleOutlineColor: NSString = "#000000"
  @objc var subtitleOutlineWidth: NSNumber = 2
  @objc var subtitleBackgroundColor: NSString = ""
  @objc var subtitleBottomMargin: NSNumber = 20
  @objc var subtitleTrackId: NSNumber = -2

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
        startupTimeout = v
      }
    }
  }

  @objc var onVLCOpen: RCTBubblingEventBlock?
  @objc var onVLCDebug: RCTBubblingEventBlock?
  @objc var onVLCLoad: RCTBubblingEventBlock?
  @objc var onVLCProgress: RCTBubblingEventBlock?
  @objc var onVLCBuffer: RCTBubblingEventBlock?
  @objc var onVLCSubtitleTracks: RCTBubblingEventBlock?
  @objc var onVLCError: RCTBubblingEventBlock?
  @objc var onVLCEnd: RCTBubblingEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    playerLayer.player = player
    playerLayer.videoGravity = .resizeAspect
    layer.addSublayer(playerLayer)
    installPlayerObservers()
    installTimeObserver()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    playerLayer.frame = bounds
  }

  deinit {
    startupWatchdog?.cancel()
    removeAllObservers()
    player.pause()
    player.replaceCurrentItem(with: nil)
  }

  private func installPlayerObservers() {
    playerTimeControlObservation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] p, _ in
      guard let self = self else { return }
      switch p.timeControlStatus {
      case .waitingToPlayAtSpecifiedRate:
        self.onVLCBuffer?(["isBuffering": true])
        self.emitDebug(state: "buffering")
      case .playing:
        self.onVLCBuffer?(["isBuffering": false])
        self.emitDebug(state: "playing")
      case .paused:
        self.emitDebug(state: "paused")
      @unknown default:
        self.emitDebug(state: "unknown")
      }
    }
  }

  private func observeCurrentItem(_ item: AVPlayerItem) {
    itemStatusObservation = item.observe(\.status, options: [.new]) { [weak self] observedItem, _ in
      guard let self = self else { return }
      switch observedItem.status {
      case .readyToPlay:
        if !self.hasSentLoad {
          self.hasSentLoad = true
          let durationSeconds = CMTimeGetSeconds(observedItem.duration)
          self.onVLCLoad?(["duration": durationSeconds.isFinite ? durationSeconds : 0])
        }
        self.emitDebug(state: "ready_to_play")
      case .failed:
        let code = (observedItem.error as NSError?)?.code ?? -1
        let message = observedItem.error?.localizedDescription ?? "AVPlayer failed to load item"
        self.onVLCError?(["error": ["errorString": message, "domain": "AVPlayer", "errorCode": "avplayer-\(code)"]])
        self.emitDebug(state: "failed")
      default:
        break
      }
    }

    itemBufferEmptyObservation = item.observe(\.isPlaybackBufferEmpty, options: [.new]) { [weak self] observedItem, _ in
      guard let self = self else { return }
      if observedItem.isPlaybackBufferEmpty {
        self.onVLCBuffer?(["isBuffering": true])
        self.emitDebug(state: "buffer_empty")
      }
    }

    itemLikelyToKeepUpObservation = item.observe(\.isPlaybackLikelyToKeepUp, options: [.new]) { [weak self] observedItem, _ in
      guard let self = self else { return }
      if observedItem.isPlaybackLikelyToKeepUp {
        self.onVLCBuffer?(["isBuffering": false])
        self.emitDebug(state: "likely_to_keep_up")
      }
    }

    endObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemDidPlayToEndTime,
      object: item,
      queue: .main
    ) { [weak self] _ in
      self?.onVLCEnd?([:])
      self?.emitDebug(state: "ended")
    }
  }

  private func installTimeObserver() {
    timeObserver = player.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 0.5, preferredTimescale: 600),
      queue: .main
    ) { [weak self] current in
      guard let self = self else { return }
      let seconds = CMTimeGetSeconds(current)
      if seconds.isFinite && seconds > 0.25 {
        self.hasStartedPlayback = true
        self.startupWatchdog?.cancel()
      }
      let duration = CMTimeGetSeconds(self.player.currentItem?.duration ?? .zero)
      self.onVLCProgress?([
        "currentTime": seconds.isFinite ? seconds : 0,
        "playableDuration": duration.isFinite ? duration : 0,
      ])
    }
  }

  private func removeCurrentItemObservers() {
    itemStatusObservation?.invalidate()
    itemStatusObservation = nil
    itemBufferEmptyObservation?.invalidate()
    itemBufferEmptyObservation = nil
    itemLikelyToKeepUpObservation?.invalidate()
    itemLikelyToKeepUpObservation = nil
    if let observer = endObserver {
      NotificationCenter.default.removeObserver(observer)
      endObserver = nil
    }
  }

  private func removeAllObservers() {
    removeCurrentItemObservers()
    playerTimeControlObservation?.invalidate()
    playerTimeControlObservation = nil
    if let observer = timeObserver {
      player.removeTimeObserver(observer)
      timeObserver = nil
    }
  }

  private func startPlayback(url: URL) {
    startupWatchdog?.cancel()
    removeCurrentItemObservers()

    hasSentLoad = false
    hasStartedPlayback = false
    onVLCOpen?(["state": "opening"])
    emitDebug(state: "opening")

    let item = AVPlayerItem(url: url)
    observeCurrentItem(item)
    player.replaceCurrentItem(with: item)
    player.isMuted = muted
    if paused {
      player.pause()
    } else {
      player.play()
      player.rate = rate.floatValue
    }

    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      if self.hasStartedPlayback { return }
      self.onVLCError?(["error": ["errorString": "Alt engine startup timeout", "domain": "AVPlayer", "errorCode": "startup-timeout"]])
      self.onVLCBuffer?(["isBuffering": false])
      self.emitDebug(state: "startup_timeout")
      self.player.pause()
    }
    startupWatchdog = work
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(startupTimeout), execute: work)
  }

  private func seek(seconds: Double) {
    let time = CMTime(seconds: seconds, preferredTimescale: 600)
    player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
    emitDebug(state: "seek")
  }

  private func emitDebug(state: String) {
    let currentTime = CMTimeGetSeconds(player.currentTime())
    let duration = CMTimeGetSeconds(player.currentItem?.duration ?? .zero)
    onVLCDebug?([
      "playerState": state,
      "debugReason": "ios_alt_engine",
      "stateRaw": player.timeControlStatus.rawValue,
      "isPlaying": player.timeControlStatus == .playing,
      "timeMs": currentTime.isFinite ? Int(currentTime * 1000) : 0,
      "position": (currentTime.isFinite && duration.isFinite && duration > 0) ? (currentTime / duration) : 0,
      "rate": player.rate,
      "lengthMs": duration.isFinite ? Int(duration * 1000) : 0,
      "bitrate": 0,
      "demuxReadBytes": 0,
      "startupRecoveryAttempts": 0,
    ])
  }
}
