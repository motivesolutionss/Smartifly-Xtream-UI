import Foundation
import React

@objc(IOSAltPlayerViewManager)
class IOSAltPlayerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    return IOSAltPlayerView()
  }
}
