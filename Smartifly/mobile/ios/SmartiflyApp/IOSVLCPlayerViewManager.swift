import Foundation
import React

@objc(IOSVLCPlayerViewManager)
class IOSVLCPlayerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    return IOSVLCPlayerView()
  }
}
